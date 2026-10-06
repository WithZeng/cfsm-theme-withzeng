// 历史行 / 实时样本 → 图表序列；缺失值保留为 null，图上断开
import type { HistoryRow, ProbeValue, Server } from '@/api/types'
import { compactSpeed, formatBytes, formatSpeed, normalizeTs, toNumber, trimFixed } from './format'
import { NET_KEYS, type NetKey } from './server'

export interface ChartSeries {
  name: string
  color: string
  values: Array<number | null>
  area?: boolean
  dashed?: boolean
  /** 归到右轴（如负载） */
  right?: boolean
}

export interface ChartSpec {
  key: string
  title: string
  accent: string
  summary: string
  series: ChartSeries[]
  format: (v: number) => string
  formatRight?: (v: number) => string
  max?: number
  refLine?: { value: number; color: string }
}

export interface RangeDef {
  key: string
  label: string
  /** 0 表示实时（WebSocket 样本） */
  hours: number
}

export const RANGES: RangeDef[] = [
  { key: 'live', label: '实时', hours: 0 },
  { key: '10m', label: '10 分钟', hours: 0.167 },
  { key: '30m', label: '30 分钟', hours: 0.5 },
  { key: '1h', label: '1 小时', hours: 1 },
  { key: '6h', label: '6 小时', hours: 6 },
  { key: '12h', label: '12 小时', hours: 12 },
  { key: '1d', label: '1 天', hours: 24 },
  { key: '2d', label: '2 天', hours: 48 },
  { key: '4d', label: '4 天', hours: 96 },
  { key: '7d', label: '7 天', hours: 168 }
]

export interface Frame {
  ts: number
  data: Partial<Server>
}

export function framesFromHistory(rows: HistoryRow[]): Frame[] {
  return rows
    .map((r) => ({ ts: normalizeTs(r.timestamp) ?? 0, data: r }))
    .filter((f) => f.ts > 0)
    .sort((a, b) => a.ts - b.ts)
}

const col = (frames: Frame[], f: (d: Partial<Server>) => number | null) => frames.map((x) => f(x.data))
const nonNull = (vals: Array<number | null>) => vals.filter((v): v is number => v !== null)
const lastOf = (vals: Array<number | null>) => {
  for (let i = vals.length - 1; i >= 0; i -= 1) if (vals[i] !== null) return vals[i]
  return null
}
const hasData = (vals: Array<number | null>) => nonNull(vals).length >= 2

const loadOf = (d: Partial<Server>) => {
  const first = String(d.load_avg ?? '').trim().split(/\s+/)[0]
  return first ? toNumber(first) : null
}
const mbToGb = (v: unknown) => {
  const n = toNumber(v)
  return n === null ? null : n / 1024
}
const diskIo = (d: Partial<Server>, k: 'read_bps' | 'write_bps') => toNumber(d.disk?.[k] ?? d[`disk_${k}`])

const gb = (v: number) => `${trimFixed(v, v < 10 ? 1 : 0)} GB`
const pct = (v: number) => `${trimFixed(v, 0)}%`
const count = (v: number) => (v >= 1000 ? `${trimFixed(v / 1000, 1)}k` : String(Math.round(v)))

export function buildCharts(frames: Frame[], server: Server | null): ChartSpec[] {
  const cpu = col(frames, (d) => toNumber(d.cpu))
  const load = col(frames, loadOf)
  const ram = col(frames, (d) => mbToGb(d.ram_used))
  const swap = col(frames, (d) => mbToGb(d.swap_used))
  const disk = col(frames, (d) => mbToGb(d.disk_used))
  const rx = col(frames, (d) => toNumber(d.net_in_speed))
  const tx = col(frames, (d) => toNumber(d.net_out_speed))
  const tcp = col(frames, (d) => toNumber(d.tcp_conn))
  const udp = col(frames, (d) => toNumber(d.udp_conn))
  const proc = col(frames, (d) => toNumber(d.processes))
  const rd = col(frames, (d) => diskIo(d, 'read_bps'))
  const wr = col(frames, (d) => diskIo(d, 'write_bps'))

  const ramTotal = mbToGb(server?.ram_total) ?? lastOf(col(frames, (d) => mbToGb(d.ram_total)))
  const diskTotal = mbToGb(server?.disk_total) ?? lastOf(col(frames, (d) => mbToGb(d.disk_total)))
  const swapTotal = mbToGb(server?.swap_total)

  const specs: ChartSpec[] = []
  if (hasData(cpu)) {
    specs.push({
      key: 'cpu', title: 'CPU 与负载', accent: 'var(--zhu)',
      summary: `${lastOf(cpu) === null ? '—' : pct(lastOf(cpu) as number)}${lastOf(load) === null ? '' : ` · 负载 ${trimFixed(lastOf(load) as number, 2)}`}`,
      series: [
        { name: 'CPU', color: 'var(--zhu)', values: cpu, area: true },
        ...(hasData(load) ? [{ name: '负载', color: 'var(--blue)', values: load, right: true }] : [])
      ],
      format: pct, formatRight: (v) => trimFixed(v, 1), max: 100,
      refLine: { value: 85, color: 'var(--zhu)' }
    })
  }
  if (hasData(ram)) {
    specs.push({
      key: 'mem', title: '内存与 Swap', accent: 'var(--blue)',
      summary: `${lastOf(ram) === null ? '—' : gb(lastOf(ram) as number)} / ${ramTotal === null ? '—' : gb(ramTotal)}`,
      series: [
        { name: '内存', color: 'var(--blue)', values: ram, area: true },
        ...(hasData(swap) && (swapTotal ?? 0) > 0 ? [{ name: 'Swap', color: 'var(--ochre)', values: swap }] : [])
      ],
      format: gb, max: ramTotal ?? undefined,
      refLine: ramTotal ? { value: ramTotal, color: 'var(--blue)' } : undefined
    })
  }
  if (hasData(disk)) {
    specs.push({
      key: 'disk', title: '磁盘', accent: 'var(--jade)',
      summary: `${lastOf(disk) === null ? '—' : gb(lastOf(disk) as number)} / ${diskTotal === null ? '—' : gb(diskTotal)}`,
      series: [{ name: '已用', color: 'var(--jade)', values: disk, area: true }],
      format: gb, max: diskTotal ?? undefined,
      refLine: diskTotal ? { value: diskTotal, color: 'var(--jade)' } : undefined
    })
  }
  if (hasData(rx) || hasData(tx)) {
    specs.push({
      key: 'net', title: '网络', accent: 'var(--blue)',
      summary: `↑${formatSpeed(lastOf(tx) ?? 0)} ↓${formatSpeed(lastOf(rx) ?? 0)}`,
      series: [
        { name: '下行', color: 'var(--blue)', values: rx, area: true },
        { name: '上行', color: 'var(--ochre)', values: tx }
      ],
      format: (v) => `${compactSpeed(v)}/s`
    })
  }
  if (hasData(tcp) || hasData(udp)) {
    specs.push({
      key: 'conn', title: '网络连接', accent: 'var(--body)',
      summary: `TCP ${lastOf(tcp) ?? '—'} · UDP ${lastOf(udp) ?? '—'}`,
      series: [
        { name: 'TCP', color: 'var(--body)', values: tcp, area: true },
        { name: 'UDP', color: 'var(--jade)', values: udp }
      ],
      format: count
    })
  }
  if (hasData(proc)) {
    specs.push({
      key: 'proc', title: '进程', accent: 'var(--ochre)',
      summary: String(lastOf(proc) ?? '—'),
      series: [{ name: '进程', color: 'var(--ochre)', values: proc, area: true }],
      format: count
    })
  }
  if (hasData(rd) || hasData(wr)) {
    specs.push({
      key: 'io', title: '磁盘 IO', accent: 'var(--jade)',
      summary: `读 ${formatBytes(lastOf(rd) ?? 0)}/s · 写 ${formatBytes(lastOf(wr) ?? 0)}/s`,
      series: [
        { name: '读', color: 'var(--jade)', values: rd, area: true },
        { name: '写', color: 'var(--zhu)', values: wr }
      ],
      format: (v) => `${compactSpeed(v)}/s`
    })
  }
  return specs
}

// ---------- 延迟 ----------

export interface ProbeTarget {
  key: NetKey
  name: string
  color: string
  ping: Array<number | null>
  loss: Array<number | null>
  avg: number | null
  lossAvg: number | null
  jitter: number | null
  timeouts: number
}

const TARGET_COLORS: Record<NetKey, string> = { ct: 'var(--blue)', cu: 'var(--ochre)', cm: 'var(--jade)', bd: 'var(--sub)' }

export function buildProbeTargets(frames: Frame[], names: Record<NetKey, string>): ProbeTarget[] {
  const out: ProbeTarget[] = []
  for (const key of NET_KEYS) {
    const raw = frames.map((f) => f.data[`ping_${key}`] as ProbeValue | undefined)
    // 全部为 false/缺失视为未配置该线路
    if (!raw.some((v) => v !== false && v !== undefined)) continue
    const ping = raw.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null))
    const loss = frames.map((f) => {
      const v = f.data[`loss_${key}`]
      return typeof v === 'number' && Number.isFinite(v) ? v : null
    })
    const vals = nonNull(ping)
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    const ls = nonNull(loss)
    const lossAvg = ls.length ? ls.reduce((a, b) => a + b, 0) / ls.length : null
    let jitter: number | null = null
    if (vals.length > 1) {
      let d = 0
      for (let i = 1; i < vals.length; i += 1) d += Math.abs(vals[i] - vals[i - 1])
      jitter = d / (vals.length - 1)
    }
    out.push({ key, name: names[key], color: TARGET_COLORS[key], ping, loss, avg, lossAvg, jitter, timeouts: raw.filter((v) => v === null).length })
  }
  return out
}

/** 隐藏短时尖峰：超过中位数 3 倍且孤立的点置空 */
export function suppressSpikes(vals: Array<number | null>): Array<number | null> {
  const sorted = nonNull(vals).sort((a, b) => a - b)
  if (sorted.length < 5) return vals
  const median = sorted[Math.floor(sorted.length / 2)]
  return vals.map((v, i) => {
    if (v === null || v <= median * 3) return v
    const prev = vals[i - 1] ?? null
    const next = vals[i + 1] ?? null
    const isolated = (prev === null || prev <= median * 3) && (next === null || next <= median * 3)
    return isolated ? null : v
  })
}
