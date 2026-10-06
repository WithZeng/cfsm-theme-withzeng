<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMonitor, entryKey } from '@/composables/useMonitor'
import { fetchHistory } from '@/api/endpoints'
import { getApiBases } from '@/api/http'
import type { HistoryRow } from '@/api/types'
import { RANGES, buildCharts, buildProbeTargets, framesFromHistory, type Frame } from '@/utils/history'
import { daysLeft, formatPrice, isAutoRenew, monthlyCost, remainingValue, currencyOf, isFree } from '@/utils/billing'
import { formatBytes, formatDateTime, formatDuration, formatMB, formatSpeed, toNumber, trimFixed } from '@/utils/format'
import {
  bootAt, carveOf, cpuPct, flagCode, isOnline, lastSeen, memPct, nextMilestone, tagsOf, trafficLimit, trafficPct,
  trafficUsed, uptimeDays, uptimeMs, type NetKey
} from '@/utils/server'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import InkIcon from '@/components/InkIcon.vue'
import MiniVase from '@/components/detail/MiniVase.vue'
import LineChart from '@/components/detail/LineChart.vue'
import ProbePanel from '@/components/detail/ProbePanel.vue'

const route = useRoute()
const router = useRouter()
const { state, config, sysConfig, entries, now, realtime, loadServer, startLive, stopLive } = useMonitor()

const id = computed(() => String(route.params.id || ''))
const baseIndex = computed(() => Number(route.query.b) || 0)
const key = computed(() => entryKey(baseIndex.value, id.value))
const server = computed(() => entries.value.find((e) => e.key === key.value)?.server || null)

const range = ref('1h')
const rows = ref<HistoryRow[]>([])
const probeRows = ref<HistoryRow[]>([])
const historyError = ref('')
const historyLoading = ref(false)

const ranges = computed(() => RANGES.filter((r) => r.hours <= 24 || config.value?.authorization))
const rangeDef = computed(() => RANGES.find((r) => r.key === range.value) || RANGES[3])

async function loadHistory() {
  const base = getApiBases()[baseIndex.value] || getApiBases()[0]
  historyError.value = ''
  historyLoading.value = true
  // 实时档位的图表用 WebSocket 样本；延迟区仍取最近 1 小时历史
  const hours = rangeDef.value.hours || 1
  const r = await fetchHistory(base, id.value, hours)
  historyLoading.value = false
  if (!r.ok) {
    historyError.value = r.status === 401 ? '超过 24 小时的历史需要登录后台' : r.status === 409 ? '数据库需要升级，请联系管理员' : '历史数据加载失败'
    rows.value = []
    probeRows.value = []
    return
  }
  probeRows.value = r.data || []
  rows.value = rangeDef.value.hours ? r.data || [] : []
}

async function load() {
  if (!id.value) return
  const s = await loadServer(baseIndex.value, id.value)
  if (!s) return
  startLive({ kind: 'detail', baseIndex: baseIndex.value, id: id.value })
  await loadHistory()
}

watch(() => [id.value, baseIndex.value], load, { immediate: true })
watch(range, loadHistory)
onBeforeUnmount(() => {
  stopLive()
  startLive(null)
})

const frames = computed<Frame[]>(() => (rangeDef.value.hours ? framesFromHistory(rows.value) : realtime.value))
const charts = computed(() => buildCharts(frames.value, server.value))
const chartTs = computed(() => frames.value.map((f) => f.ts))
const withDate = computed(() => rangeDef.value.hours > 24)

const probeFrames = computed(() => framesFromHistory(probeRows.value))
const probeTs = computed(() => probeFrames.value.map((f) => f.ts))
const probeNames = computed<Record<NetKey, string>>(() => ({
  ct: config.value?.custom_ct_name || sysConfig.value.custom_ct_name || '电信',
  cu: config.value?.custom_cu_name || sysConfig.value.custom_cu_name || '联通',
  cm: config.value?.custom_cm_name || sysConfig.value.custom_cm_name || '移动',
  bd: config.value?.custom_bd_name || sysConfig.value.custom_bd_name || 'BGP'
}))
const targets = computed(() => buildProbeTargets(probeFrames.value, probeNames.value))

// ---------- 头部与概览 ----------
const online = computed(() => (server.value ? isOnline(server.value, now.value) : false))
const cpu = computed(() => (server.value && online.value ? cpuPct(server.value) : null))
const mem = computed(() => (server.value && online.value ? memPct(server.value) : null))
const days = computed(() => (server.value && online.value ? uptimeDays(server.value, now.value) : null))
const carve = computed(() => carveOf(days.value))
const flag = computed(() => flagCode(server.value?.region))
const tags = computed(() => (server.value ? tagsOf(server.value) : []))
const hot = computed(() => (cpu.value ?? 0) >= 80 || (mem.value ?? 0) >= 90)
const seen = computed(() => (server.value ? lastSeen(server.value) : null))

// 从首页进入时可在节点间切换；直接打开详情页不额外拉全量列表
const siblings = computed(() => entries.value)
const sibIndex = computed(() => siblings.value.findIndex((e) => e.key === key.value))
function goTo(k: string) {
  const e = entries.value.find((x) => x.key === k)
  if (e) router.push({ name: 'server', params: { id: e.server.id }, query: e.baseIndex ? { b: e.baseIndex } : {} })
}
function go(step: number) {
  const list = siblings.value
  if (list.length < 2) return
  goTo(list[(sibIndex.value + step + list.length) % list.length].key)
}

interface OverviewItem { label: string; value: string; unit?: string; note?: string; tone?: string }

const overview = computed<OverviewItem[]>(() => {
  const s = server.value
  if (!s) return []
  const showPrice = sysConfig.value.show_price !== false
  const left = sysConfig.value.show_expire === false ? null : daysLeft(s, now.value)
  const monthly = monthlyCost(s)
  const value = remainingValue(s, now.value)
  const cur = currencyOf(s)
  const limit = trafficLimit(s)
  const tfPct = trafficPct(s)
  const up = uptimeMs(s, now.value)
  const next = nextMilestone(days.value)
  const list: OverviewItem[] = []
  if (showPrice) {
    list.push({ label: '节点价格', value: formatPrice(s) || '未设置', note: isAutoRenew(s) ? '自动续费' : '手动续费' })
    list.push({ label: '月均支出', value: isFree(s) ? '免费' : monthly === null ? '—' : `${cur}${trimFixed(monthly, 2)}` })
  }
  if (left !== null) {
    list.push({
      label: '剩余时间', value: left > 0 ? String(left) : '已到期', unit: left > 0 ? '天' : '',
      note: s.expire_date ? `${String(s.expire_date).slice(0, 10)} 到期` : '',
      tone: left <= 7 ? 'var(--zhu)' : left <= 15 ? 'var(--ochre)' : ''
    })
  }
  if (showPrice && value !== null) list.push({ label: '剩余价值', value: `${cur}${trimFixed(value, 2)}`, note: '按剩余天数折算' })
  list.push({ label: '本月流量', value: formatBytes(trafficUsed(s)), note: `↑${formatBytes(s.net_tx_monthly)} · ↓${formatBytes(s.net_rx_monthly)}` })
  if (limit && sysConfig.value.show_tf !== false) {
    list.push({
      label: '流量配额', value: tfPct === null ? '—' : trimFixed(tfPct, 1), unit: '%',
      note: `${formatBytes(trafficUsed(s))} / ${formatBytes(limit)}${s.reset_day ? ` · 每月 ${s.reset_day} 日重置` : ''}`,
      tone: (tfPct ?? 0) >= 85 ? 'var(--zhu)' : ''
    })
  }
  list.push({
    label: '运行时间', value: up === null || !online.value ? '—' : formatDuration(up),
    note: next ? `再在线 ${next.inDays} 天刻“${next.char}”` : carve.value ? '稳 · 恒 · 久 已刻满' : ''
  })
  list.push({
    label: '连接数', value: online.value ? String((toNumber(s.tcp_conn) ?? 0) + (toNumber(s.udp_conn) ?? 0)) : '—',
    note: `TCP ${s.tcp_conn ?? '—'} · UDP ${s.udp_conn ?? '—'}`
  })
  return list
})

const gpuText = computed(() => {
  const g = server.value?.gpu_info
  let list: Array<{ name: string }> = []
  if (Array.isArray(g)) list = g
  else if (typeof g === 'string' && g.trim().startsWith('[')) {
    try { list = JSON.parse(g) } catch { list = [] }
  }
  return list.length ? list.map((x) => x.name).join('、') : '无'
})

const infos = computed(() => {
  const s = server.value
  if (!s) return []
  const boot = bootAt(s)
  const io = s.disk
  return [
    { title: '硬件', items: [
      { k: 'CPU', v: `${s.cpu_info || '—'}${s.cpu_cores ? ` · ${s.cpu_cores} 核` : ''}` },
      { k: '架构', v: s.arch || '—' },
      { k: 'Agent', v: s.agent_version || '—' },
      { k: 'GPU', v: gpuText.value }
    ] },
    { title: '系统', items: [
      { k: '操作系统', v: s.os || '—' },
      { k: '内核', v: s.kernel_version || '—' },
      { k: '开机于', v: boot ? formatDateTime(boot) : '—' },
      { k: '负载', v: online.value ? String(s.load_avg || '—') : '—' }
    ] },
    { title: '存储', items: [
      { k: '内存', v: `${online.value ? formatMB(s.ram_used) : '—'} / ${formatMB(s.ram_total)}` },
      { k: 'Swap', v: (toNumber(s.swap_total) ?? 0) > 0 ? `${formatMB(s.swap_used)} / ${formatMB(s.swap_total)}` : '无' },
      { k: '硬盘', v: `${formatMB(s.disk_used)} / ${formatMB(s.disk_total)}` },
      { k: '磁盘 IO', v: io ? `读 ${formatSpeed(io.read_bps)} · 写 ${formatSpeed(io.write_bps)}` : '—' }
    ] },
    { title: '网络', items: [
      { k: '实时速率', v: online.value ? `↑${formatSpeed(s.net_out_speed)} ↓${formatSpeed(s.net_in_speed)}` : '—' },
      { k: '累计', v: `↑${formatBytes(s.net_tx)} ↓${formatBytes(s.net_rx)}` },
      { k: 'IP', v: [s.ip_v4 === '1' ? 'IPv4' : '', s.ip_v6 === '1' ? 'IPv6' : ''].filter(Boolean).join(' · ') || '—' },
      { k: '进程', v: online.value ? String(s.processes ?? '—') : '—' }
    ] }
  ]
})
</script>

<template>
  <main class="page">
    <AppHeader @refresh="load" />

    <p v-if="state.needLogin" class="card notice">这是非公开站点，请先 <a href="/admin#admin">登录后台</a>。</p>
    <p v-else-if="!server && state.error" class="card notice">{{ state.error }}</p>

    <template v-if="server">
      <div class="title-row">
        <div class="who">
          <router-link to="/" class="icon-btn back" aria-label="返回首页"><InkIcon name="back" /></router-link>
          <MiniVase :cpu="cpu" :mem="mem" :online="online" />
          <img v-if="flag" :src="`/flags/${flag}.svg`" :alt="server.region" class="flag" />
          <h1 class="name">{{ server.name }}</h1>
          <span class="state" :class="online ? 'on' : 'off'">{{ online ? '在线' : '离线' }}</span>
          <span v-if="hot" class="state hot">高负载</span>
          <span v-if="carve" class="seal mark" title="在线里程碑">{{ carve }}</span>
          <span v-for="t in tags" :key="t" class="tag">{{ t }}</span>
          <span v-if="!online && seen" class="seen mono">最后上报 {{ formatDateTime(seen) }}</span>
        </div>
        <div v-if="siblings.length > 1" class="switcher">
          <button type="button" class="icon-btn" aria-label="上一个节点" @click="go(-1)"><InkIcon name="back" :size="16" /></button>
          <label class="sr-only" for="jl-node-switch">切换节点</label>
          <select id="jl-node-switch" :value="key" @change="goTo(($event.target as HTMLSelectElement).value)">
            <option v-for="e in siblings" :key="e.key" :value="e.key">{{ e.server.name }}</option>
          </select>
          <button type="button" class="icon-btn" aria-label="下一个节点" @click="go(1)"><InkIcon name="next" :size="16" /></button>
        </div>
      </div>

      <div class="overview">
        <div v-for="o in overview" :key="o.label" class="card ov">
          <span class="ov-label">{{ o.label }}</span>
          <div class="ov-value">
            <span class="mono" :style="{ color: o.tone || 'inherit' }">{{ o.value }}</span>
            <span v-if="o.unit" class="ov-unit">{{ o.unit }}</span>
          </div>
          <span v-if="o.note" class="ov-note">{{ o.note }}</span>
        </div>
      </div>

      <div class="infos">
        <section v-for="c in infos" :key="c.title" class="card info">
          <h2 class="info-title"><span class="bar" />{{ c.title }}</h2>
          <div class="info-grid">
            <div v-for="it in c.items" :key="it.k" class="info-item">
              <span class="k">{{ it.k }}</span>
              <span class="v" :title="it.v">{{ it.v }}</span>
            </div>
          </div>
        </section>
      </div>

      <div class="charts-head">
        <div class="ch-title">
          <span class="brush">负载走势</span>
          <span class="hint">缺失时段留空，不补零</span>
        </div>
        <div class="segmented" role="group" aria-label="时间范围">
          <button v-for="r in ranges" :key="r.key" type="button" :aria-pressed="range === r.key" @click="range = r.key">
            <span v-if="r.hours === 0" class="live-dot" />{{ r.label }}
          </button>
        </div>
      </div>
      <p v-if="historyError" class="card notice">{{ historyError }}</p>
      <div v-else-if="historyLoading && !charts.length" class="loading">正在翻阅窑火记录…</div>
      <div v-else-if="!charts.length" class="loading">{{ range === 'live' ? '等待实时样本…' : '该时段暂无数据' }}</div>
      <div class="charts">
        <section v-for="c in charts" :key="c.key" class="card chart-card">
          <div class="cc-head">
            <h3><span class="bar" :style="{ background: c.accent }" />{{ c.title }}</h3>
            <span class="mono summary">{{ c.summary }}</span>
          </div>
          <LineChart :ts="chartTs" :series="c.series" :format="c.format" :format-right="c.formatRight" :max="c.max" :ref-line="c.refLine" :with-date="withDate" />
          <div class="legend">
            <span v-for="s in c.series" :key="s.name"><i :style="{ background: s.color }" />{{ s.name }}</span>
          </div>
        </section>
      </div>

      <ProbePanel v-if="targets.length && sysConfig.show_three_net_details !== false" :targets="targets" :ts="probeTs" :with-date="withDate" />
    </template>

    <AppFooter />
  </main>
</template>

<style scoped>
.page {
  position: relative;
  z-index: 1;
  max-width: 1280px;
  margin: 0 auto;
  padding: 18px 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.notice {
  margin: 0;
  padding: 12px 16px;
  font-size: 14px;
}
.notice a {
  color: var(--zhu);
}
.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.who {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.back {
  background: var(--card);
  border: 1px solid var(--line);
  color: var(--ink);
}
.flag {
  width: 26px;
  height: 18px;
  object-fit: cover;
  border-radius: 2px;
}
.name {
  margin: 0;
  font-size: 26px;
  font-weight: 900;
}
.state {
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
}
.state.on { background: var(--jade-chip); color: var(--jade); }
.state.off,
.state.hot { background: var(--zhu-chip); color: var(--zhu); }
.mark {
  width: 22px;
  height: 22px;
  font-size: 15px;
}
.seen {
  font-size: 12px;
  color: var(--sub);
}
.switcher {
  display: flex;
  align-items: center;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 10px;
}
.switcher select {
  height: 40px;
  border: 0;
  background: transparent;
  font-size: 13px;
  max-width: 200px;
}
.overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}
.ov {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ov-label {
  font-size: 13px;
  color: var(--sub);
}
.ov-value {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.ov-value .mono {
  font-size: 24px;
  font-weight: 600;
}
.ov-unit,
.ov-note {
  font-size: 12px;
  color: var(--sub);
}
.infos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 12px;
}
.info {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.info-title,
.cc-head h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 900;
}
.bar {
  width: 4px;
  height: 16px;
  border-radius: 1px;
  background: var(--zhu);
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.info-item {
  padding: 8px 10px;
  background: var(--inset);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.k {
  font-size: 12px;
  color: var(--sub);
}
.v {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.charts-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 8px;
}
.ch-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.ch-title .brush {
  font-size: 30px;
  line-height: 1;
}
.hint {
  font-size: 12px;
  color: var(--sub);
}
.segmented {
  flex-wrap: wrap;
}
.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--jade);
  margin-right: 5px;
  display: inline-block;
}
.loading {
  padding: 24px 0;
  text-align: center;
  color: var(--sub);
  font-size: 14px;
}
.charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 12px;
}
.chart-card {
  padding: 14px 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.cc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.summary {
  font-size: 13px;
  color: var(--body);
}
.legend {
  display: flex;
  gap: 14px;
  font-size: 11px;
  color: var(--sub);
}
.legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.legend i {
  width: 10px;
  height: 2px;
}
@media (max-width: 560px) {
  .page {
    padding: 14px 16px 24px;
  }
  .charts {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
