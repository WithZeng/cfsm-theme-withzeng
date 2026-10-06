import { computed, reactive, ref, shallowRef } from 'vue'
import { fetchConfig, fetchServer, fetchServers } from '@/api/endpoints'
import { getApiBases, initApiBases } from '@/api/http'
import { createLiveSocket, type LiveSample, type LiveSocket } from '@/api/live'
import { hasTurnstileVerified } from '@/api/turnstile'
import type { Server, SiteConfig, SysConfig } from '@/api/types'
import { mergeServer } from '@/utils/server'

export interface ServerEntry {
  /** 多后端时用 `${baseIndex}:${id}` 区分 */
  key: string
  baseIndex: number
  server: Server
}

export interface RealtimePoint {
  ts: number
  data: Partial<Server>
}

type LiveMode = { kind: 'home' } | { kind: 'detail'; baseIndex: number; id: string } | null

const REALTIME_KEEP_MS = 10 * 60_000

const state = reactive({
  booted: false,
  loading: false,
  error: '' as string,
  needLogin: false,
  turnstileSiteKey: '' as string,
  liveConnected: false,
  liveTimedOut: false
})

const config = shallowRef<SiteConfig | null>(null)
const sysConfig = shallowRef<SysConfig>({})
const entries = ref<ServerEntry[]>([])
const now = ref(Date.now())
/** 详情页“实时”档位使用的样本缓冲 */
const realtime = ref<RealtimePoint[]>([])

let sockets: LiveSocket[] = []
let liveMode: LiveMode = null
let ticker: ReturnType<typeof setInterval> | null = null

const multiBase = computed(() => getApiBases().length > 1)
export const entryKey = (baseIndex: number, id: string) => (getApiBases().length > 1 ? `${baseIndex}:${id}` : id)

function upsert(baseIndex: number, server: Server) {
  const key = entryKey(baseIndex, server.id)
  const i = entries.value.findIndex((e) => e.key === key)
  if (i >= 0) entries.value[i] = { key, baseIndex, server }
  else entries.value.push({ key, baseIndex, server })
}

function applySamples(baseIndex: number, serverId: string, samples: LiveSample[]) {
  const key = entryKey(baseIndex, serverId)
  const i = entries.value.findIndex((e) => e.key === key)
  if (i < 0) return
  let s = entries.value[i].server
  for (const sample of samples) s = mergeServer(s, sample.data, sample.ts)
  entries.value[i] = { ...entries.value[i], server: s }

  if (liveMode?.kind === 'detail' && liveMode.baseIndex === baseIndex && liveMode.id === serverId) {
    const cutoff = Date.now() - REALTIME_KEEP_MS
    realtime.value = [...realtime.value.filter((p) => p.ts >= cutoff), ...samples.map((x) => ({ ts: x.ts, data: x.data }))]
  }
}

/** 读取站点配置；需要 Turnstile 时记录 siteKey 并返回 false */
async function boot(): Promise<boolean> {
  initApiBases()
  state.error = ''
  const bases = getApiBases()
  let results = await Promise.all(bases.map((b) => fetchConfig(b, { turnstileToken: true })))
  // 缓存的 Turnstile 凭证失效时 http 层已清掉，重试一次即可拿到干净的配置
  if (results.some((r) => r.status === 403)) results = await Promise.all(bases.map((b) => fetchConfig(b)))
  const first = results.find((r) => r.ok)?.data || null
  if (!first) {
    state.error = results[0]?.error || '无法连接到后端'
    return false
  }
  config.value = first
  const needTs = results.some((r) => r.ok && r.data?.turnstile_enabled && !r.data?.verified)
  if (needTs && !hasTurnstileVerified()) {
    state.turnstileSiteKey = first.turnstile_site_key || ''
    return false
  }
  state.turnstileSiteKey = ''
  state.booted = true
  if (!ticker) ticker = setInterval(() => { now.value = Date.now() }, 5000)
  return true
}

async function loadServers() {
  state.loading = true
  const bases = getApiBases()
  const results = await Promise.all(bases.map((b) => fetchServers(b)))
  state.loading = false
  if (results.every((r) => !r.ok)) {
    const r = results[0]
    if (r.status === 401) state.needLogin = true
    else if (r.status === 403) state.turnstileSiteKey = config.value?.turnstile_site_key || ''
    else state.error = r.error || '加载失败'
    return
  }
  state.needLogin = false
  const next: ServerEntry[] = []
  results.forEach((r, baseIndex) => {
    if (!r.ok || !r.data) return
    if (baseIndex === 0 && r.data.sysConfig) sysConfig.value = r.data.sysConfig
    for (const s of r.data.servers || []) next.push({ key: entryKey(baseIndex, s.id), baseIndex, server: s })
  })
  entries.value = next
  now.value = Date.now()
}

async function loadServer(baseIndex: number, id: string): Promise<Server | null> {
  const base = getApiBases()[baseIndex] || getApiBases()[0]
  const r = await fetchServer(base, id)
  if (!r.ok || !r.data) {
    if (r.status === 401) state.needLogin = true
    else state.error = r.status === 404 ? '节点不存在' : r.error || '加载失败'
    return null
  }
  upsert(baseIndex, r.data)
  const seed: RealtimePoint[] = []
  for (const u of r.data.latestReportUpdates || []) {
    for (const s of u.samples || []) if (s.data) seed.push({ ts: s.ts, data: s.data })
  }
  realtime.value = seed.sort((a, b) => a.ts - b.ts)
  now.value = Date.now()
  return r.data
}

function stopLive() {
  sockets.forEach((s) => s.close())
  sockets = []
  state.liveConnected = false
}

function openSockets() {
  stopLive()
  state.liveTimedOut = false
  const timeoutMinutes = config.value?.frontend_ws_timeout_minutes || 0
  const bases = getApiBases()
  const handlers = (baseIndex: number) => ({
    onSamples: (id: string, samples: LiveSample[]) => applySamples(baseIndex, id, samples),
    onStatus: (c: boolean) => { state.liveConnected = c },
    onLifetimeExceeded: () => {
      state.liveTimedOut = true
      stopLive()
    }
  })
  if (liveMode?.kind === 'home') {
    bases.forEach((base, baseIndex) => {
      const ids = entries.value.filter((e) => e.baseIndex === baseIndex).map((e) => e.server.id)
      if (!ids.length) return
      sockets.push(createLiveSocket({ base, scope: 'all', ids, timeoutMinutes }, handlers(baseIndex)))
    })
  } else if (liveMode?.kind === 'detail') {
    const base = bases[liveMode.baseIndex] || bases[0]
    sockets.push(createLiveSocket({ base, scope: liveMode.id, timeoutMinutes }, handlers(liveMode.baseIndex)))
  }
}

function startLive(mode: LiveMode) {
  liveMode = mode
  if (document.visibilityState === 'visible') openSockets()
}

/** 页面隐藏时断开以节省额度；回到前台先补一次 REST 再恢复订阅 */
async function onVisibility() {
  if (!state.booted) return
  if (document.visibilityState === 'hidden') {
    stopLive()
    return
  }
  if (state.liveTimedOut || !liveMode) return
  if (liveMode.kind === 'home') await loadServers()
  else await loadServer(liveMode.baseIndex, liveMode.id)
  openSockets()
}

let visibilityBound = false
function bindVisibility() {
  if (visibilityBound) return
  visibilityBound = true
  document.addEventListener('visibilitychange', onVisibility)
}

/** 超时弹窗里用户选择“继续连接” */
function resumeLive() {
  state.liveTimedOut = false
  openSockets()
}

export function useMonitor() {
  return {
    state,
    config,
    sysConfig,
    entries,
    now,
    realtime,
    multiBase,
    boot,
    loadServers,
    loadServer,
    startLive,
    stopLive,
    resumeLive,
    bindVisibility
  }
}
