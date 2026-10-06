import type { LatencyWindowPoint, ProbeValue, Server } from '@/api/types'
import { normalizeTs, toNumber } from './format'

export const ONLINE_THRESHOLD_MS = 5 * 60_000

export type Level = 'ok' | 'warn' | 'crit'

export const clampPct = (v: number | null) => (v === null ? null : Math.max(0, Math.min(100, v)))

export function lastSeen(s: Server): number | null {
  return normalizeTs(s.report_timestamp ?? s.last_updated ?? s.timestamp)
}

export function isOnline(s: Server, now = Date.now()): boolean {
  const t = lastSeen(s)
  return t !== null && now - t < ONLINE_THRESHOLD_MS
}

const ratio = (used: unknown, total: unknown) => {
  const u = toNumber(used)
  const t = toNumber(total)
  if (u === null || t === null || t <= 0) return null
  return clampPct((u / t) * 100)
}

export const cpuPct = (s: Server) => clampPct(toNumber(s.cpu))
export const memPct = (s: Server) => ratio(s.ram_used, s.ram_total)
export const swapPct = (s: Server) => ratio(s.swap_used, s.swap_total)
export const diskPct = (s: Server) => ratio(s.disk_used, s.disk_total)

export function level(v: number | null, warn: number, crit: number): Level {
  if (v === null) return 'ok'
  return v >= crit ? 'crit' : v >= warn ? 'warn' : 'ok'
}

/** 本月计量流量（字节），按 traffic_calc_type 取下行、上行、较大值或合计 */
export function trafficUsed(s: Server): number {
  const rx = toNumber(s.net_rx_monthly) ?? 0
  const tx = toNumber(s.net_tx_monthly) ?? 0
  switch (s.traffic_calc_type) {
    case 'dl': return rx
    case 'ul': return tx
    case 'max': return Math.max(rx, tx)
    default: return rx + tx
  }
}

/** traffic_limit 单位为 GB；未设置返回 null */
export function trafficLimit(s: Server): number | null {
  const gb = toNumber(s.traffic_limit)
  return gb && gb > 0 ? gb * 1024 ** 3 : null
}

export function trafficPct(s: Server): number | null {
  const limit = trafficLimit(s)
  return limit ? clampPct((trafficUsed(s) / limit) * 100) : null
}

export function bootAt(s: Server): number | null {
  const raw = s.boot_time
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw === 'string' && !/^\d+$/.test(raw)) {
    const t = Date.parse(raw)
    return Number.isNaN(t) ? null : t
  }
  return normalizeTs(raw)
}

export function uptimeMs(s: Server, now = Date.now()): number | null {
  const b = bootAt(s)
  return b === null ? null : Math.max(0, now - b)
}

export const uptimeDays = (s: Server, now = Date.now()) => {
  const ms = uptimeMs(s, now)
  return ms === null ? null : Math.floor(ms / 86_400_000)
}

/** 在线里程碑：满 30 天“稳”、100 天“恒”、365 天“久” */
export const MILESTONES: Array<[number, string]> = [[30, '稳'], [100, '恒'], [365, '久']]

export function carveOf(days: number | null): string {
  if (days === null) return ''
  let mark = ''
  for (const [d, c] of MILESTONES) if (days >= d) mark = c
  return mark
}

export function nextMilestone(days: number | null): { char: string; inDays: number } | null {
  if (days === null) return null
  const next = MILESTONES.find(([d]) => days < d)
  return next ? { char: next[1], inDays: next[0] - days } : null
}

export const tagsOf = (s: Server) => String(s.tags || '').split(',').map((t) => t.trim()).filter(Boolean)

/** 与 CFSM 默认皮肤一致的旗帜代码 */
export function flagCode(region: unknown): string {
  const code = String(region || '').trim().toUpperCase()
  if (!/^[A-Z]{2}(-[A-Z]{2,3})?$/.test(code)) return ''
  return code === 'TW' ? 'cn' : code.toLowerCase()
}

const OS_ICONS: Array<[RegExp, string]> = [
  [/alma/i, 'os-alma.svg'],
  [/alpine/i, 'os-alpine.webp'],
  [/centos/i, 'os-centos.svg'],
  [/debian/i, 'os-debian.svg'],
  [/ubuntu|elementary/i, 'os-ubuntu.svg'],
  [/mac\s?os|darwin|os x/i, 'os-macos.svg'],
  [/windows|win(10|11|32|64)|microsoft/i, 'os-windows.svg'],
  [/arch/i, 'os-arch.svg'],
  [/kali/i, 'os-kail.svg'],
  [/istore/i, 'os-istore.png'],
  [/immortalwrt/i, 'os-immortalwrt.svg'],
  [/openwrt|qwrt|kwrt/i, 'os-openwrt.svg']
]

export function osIcon(os: unknown): string {
  const raw = String(os || '')
  const hit = OS_ICONS.find(([re]) => re.test(raw))
  return hit ? `/os-icons/${hit[1]}` : ''
}

// ---------- 延迟与丢包 ----------

export const NET_KEYS = ['ct', 'cu', 'cm', 'bd'] as const
export type NetKey = (typeof NET_KEYS)[number]

const num = (v: ProbeValue | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** 一个窗口点在已配置线路上的平均值；全部超时返回 'timeout'，都没配置返回 null */
function pointMean(p: LatencyWindowPoint): number | 'timeout' | null {
  let sum = 0
  let n = 0
  let configured = 0
  for (const k of NET_KEYS) {
    const v = p[k]
    if (v === false || v === undefined) continue
    configured += 1
    const x = num(v)
    if (x !== null) {
      sum += x
      n += 1
    }
  }
  if (configured === 0) return null
  return n ? sum / n : 'timeout'
}

export type CellState = 'empty' | 'timeout' | Level

export interface Cell {
  state: CellState
  value: number | null
}

/** 生成固定数量的色块；不足的从左侧补空，不伪造数据 */
export function windowCells(points: LatencyWindowPoint[] | undefined, kind: 'ping' | 'loss', count = 20): Cell[] {
  const list = (points || []).slice(-count)
  const cells: Cell[] = list.map((p) => {
    const m = pointMean(p)
    if (m === null) return { state: 'empty', value: null }
    if (m === 'timeout') return { state: 'timeout', value: null }
    const state = kind === 'ping' ? level(m, 160, 240) : level(m, 2, 5)
    return { state, value: m }
  })
  while (cells.length < count) cells.unshift({ state: 'empty', value: null })
  return cells
}

/** 卡片上显示的当前延迟/丢包：优先窗口最后一个有效点，退回实时字段 */
export function currentProbe(s: Server, kind: 'ping' | 'loss'): number | null {
  const win = kind === 'ping' ? s.ping : s.loss
  if (win?.length) {
    for (let i = win.length - 1; i >= 0; i -= 1) {
      const m = pointMean(win[i])
      if (typeof m === 'number') return m
    }
  }
  const vals = NET_KEYS.map((k) => num(s[`${kind}_${k}`] as ProbeValue)).filter((v): v is number => v !== null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

/** 合并实时增量；报告级字段只在最后一个样本里出现，直接覆盖即可 */
export function mergeServer(base: Server, patch: Partial<Server>, ts: number): Server {
  return { ...base, ...patch, id: base.id, last_updated: ts, report_timestamp: ts }
}
