const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

export const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '' || v === false) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** 1024 进制；小于 1 B 的值按 B 显示，不出现负指数 */
export function formatBytes(bytes: unknown, digits = 1): string {
  const n = toNumber(bytes)
  if (n === null || n <= 0) return '0 B'
  const i = Math.max(0, Math.min(UNITS.length - 1, Math.floor(Math.log(n) / Math.log(1024))))
  const v = n / 1024 ** i
  return `${i === 0 ? Math.round(v) : trimFixed(v, digits)} ${UNITS[i]}`
}

export const formatMB = (mb: unknown, digits = 1) => formatBytes((toNumber(mb) ?? 0) * 1024 * 1024, digits)

export const formatSpeed = (bps: unknown) => `${formatBytes(bps)}/s`

/** 卡片里用的紧凑网速：686K、1.7M、12M */
export function compactSpeed(bps: unknown): string {
  const n = toNumber(bps)
  if (n === null || n <= 0) return '0'
  if (n < 1024) return `${Math.round(n)}B`
  const k = n / 1024
  if (k < 1024) return `${k < 10 ? trimFixed(k, 1) : Math.round(k)}K`
  const m = k / 1024
  if (m < 1024) return `${m < 10 ? trimFixed(m, 1) : Math.round(m)}M`
  return `${trimFixed(m / 1024, 1)}G`
}

export function trimFixed(v: number, digits = 1): string {
  return v.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

export const formatPercent = (v: number | null, digits = 1) => (v === null ? '—' : `${v.toFixed(digits)}%`)

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return h > 0 ? `${d} 天 ${h} 时` : `${d} 天`
  if (h > 0) return `${h} 时 ${m} 分`
  return `${Math.max(1, m)} 分`
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatClock(ts: number, withDate = false): string {
  const d = new Date(ts)
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return withDate ? `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}` : hm
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const normalizeTs = (v: unknown): number | null => {
  const n = toNumber(v)
  if (n === null || n <= 0) return null
  return n < 10_000_000_000 ? n * 1000 : n
}
