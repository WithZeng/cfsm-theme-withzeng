// 把原始 Server 转成首页卡片/列表直接可用的展示数据
import type { Server, SysConfig } from '@/api/types'
import type { ServerEntry } from '@/composables/useMonitor'
import { daysLeft, formatPrice, isFree, remainingValue, currencyOf } from './billing'
import { compactSpeed, formatBytes, formatMB, trimFixed, toNumber } from './format'
import {
  carveOf, cpuPct, currentProbe, diskPct, flagCode, isOnline, lastSeen, level, memPct, osIcon,
  tagsOf, trafficLimit, trafficPct, trafficUsed, uptimeDays, windowCells, type Cell, type Level
} from './server'

export interface QuickFilter {
  key: string
  label: string
  count: number
  dot: string
}

export interface MetricView {
  key: 'cpu' | 'mem' | 'disk' | 'tf'
  label: string
  pct: number | null
  text: string
  sub: string
  level: Level
}

export interface CardView {
  key: string
  id: string
  baseIndex: number
  name: string
  group: string
  region: string
  flag: string
  os: string
  osIcon: string
  online: boolean
  lastSeen: number | null
  uptimeDays: number | null
  carve: string
  price: string
  showPrice: boolean
  daysLeft: number | null
  remainLevel: Level
  value: string
  metrics: MetricView[]
  cpu: number | null
  mem: number | null
  up: string
  down: string
  totUp: string
  totDown: string
  ping: number | null
  loss: number | null
  pingCells: Cell[]
  lossCells: Cell[]
  showProbe: boolean
  tags: string[]
  hot: boolean
  trafficAlert: boolean
  expiringSoon: boolean
  searchText: string
}

const pctText = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)}%`)

export function toCardView(e: ServerEntry, sys: SysConfig, now: number): CardView {
  const s: Server = e.server
  const online = isOnline(s, now)
  const cpu = online ? cpuPct(s) : null
  const mem = online ? memPct(s) : null
  const disk = diskPct(s)
  const tf = trafficPct(s)
  const limit = trafficLimit(s)
  const days = online ? uptimeDays(s, now) : null
  const left = sys.show_expire === false ? null : daysLeft(s, now)
  const value = remainingValue(s, now)
  const showTf = sys.show_tf !== false

  const metrics: MetricView[] = [
    { key: 'cpu', label: 'CPU', pct: cpu, text: pctText(cpu), sub: online ? String(s.load_avg || '').trim().split(/\s+/).join(' ') || `${s.cpu_cores ?? '—'} 核` : '—', level: level(cpu, 60, 85) },
    { key: 'mem', label: '内存', pct: mem, text: pctText(mem), sub: `${online ? formatMB(s.ram_used) : '—'} / ${formatMB(s.ram_total)}`, level: level(mem, 70, 90) },
    { key: 'disk', label: '硬盘', pct: disk, text: pctText(disk), sub: `${formatMB(s.disk_used)} / ${formatMB(s.disk_total)}`, level: level(disk, 75, 90) }
  ]
  if (showTf) {
    metrics.push({
      key: 'tf',
      label: '流量',
      pct: tf,
      text: tf === null ? '—' : pctText(tf),
      sub: limit ? `${formatBytes(trafficUsed(s))} / ${formatBytes(limit)}` : `本月 ${formatBytes(trafficUsed(s))}`,
      level: level(tf, 70, 85)
    })
  }

  const tags = tagsOf(s)
  return {
    key: e.key,
    id: s.id,
    baseIndex: e.baseIndex,
    name: s.name || s.id,
    group: String(s.server_group || '').trim(),
    region: String(s.region || '').toUpperCase(),
    flag: flagCode(s.region),
    os: String(s.os || ''),
    osIcon: osIcon(s.os),
    online,
    lastSeen: lastSeen(s),
    uptimeDays: days,
    carve: carveOf(days),
    price: sys.show_price === false ? '' : formatPrice(s),
    showPrice: sys.show_price !== false,
    daysLeft: left,
    remainLevel: left === null ? 'ok' : left <= 7 ? 'crit' : left <= 15 ? 'warn' : 'ok',
    value: sys.show_price === false ? '' : isFree(s) ? '免费' : value === null ? '' : `${currencyOf(s)}${trimFixed(value, value < 10 ? 2 : 1)}`,
    metrics,
    cpu,
    mem,
    up: online ? compactSpeed(s.net_out_speed) : '—',
    down: online ? compactSpeed(s.net_in_speed) : '—',
    totUp: formatBytes(s.net_tx),
    totDown: formatBytes(s.net_rx),
    ping: online ? currentProbe(s, 'ping') : null,
    loss: online ? currentProbe(s, 'loss') : null,
    pingCells: windowCells(s.ping, 'ping'),
    lossCells: windowCells(s.loss, 'loss'),
    showProbe: sys.show_three_net_details !== false && ((s.ping?.length ?? 0) > 0 || toNumber(s.ping_ct) !== null),
    tags,
    hot: online && ((cpu ?? 0) >= 80 || (mem ?? 0) >= 90),
    trafficAlert: showTf && (tf ?? 0) >= 80,
    expiringSoon: left !== null && left <= 15,
    searchText: [s.name, s.region, s.server_group, s.os, ...tags].join(' ').toLowerCase()
  }
}
