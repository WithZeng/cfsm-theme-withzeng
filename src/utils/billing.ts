// 价格、计费周期、到期与剩余价值；规则与 CFSM 内置前端 utils/server.js 对齐
import type { Server } from '@/api/types'

const CYCLES: Record<string, { months: number; label: string }> = {
  month: { months: 1, label: '月' },
  quarter: { months: 3, label: '季' },
  half_year: { months: 6, label: '半年' },
  year: { months: 12, label: '年' },
  two_years: { months: 24, label: '2年' },
  three_years: { months: 36, label: '3年' },
  four_years: { months: 48, label: '4年' },
  five_years: { months: 60, label: '5年' }
}

const MULTI_CHAR_CURRENCIES = ['¥JPY', 'HK$', 'A$', 'C$', 'S$', 'NZ$', 'R$', 'Rp', 'RM', 'LKR', 'EGP', 'kr', 'zł', 'د.إ']

export function parsePrice(value: unknown): number | null {
  const m = String(value ?? '').trim().match(/-?[\d.,]+/)
  if (!m) return null
  const n = Number.parseFloat(m[0].replace(/,/g, ''))
  if (!Number.isFinite(n) || (n < 0 && n !== -1)) return null
  return n
}

/** 价格为 0 或 -1 视为免费；空白为未设置 */
export const isFree = (s: Server) => {
  const p = parsePrice(s.price)
  return p === 0 || p === -1
}

export function detectCycle(s: Server): string {
  const raw = String(s.price ?? '').toLowerCase()
  if (/五年|5\s*(y|yr|years?)/.test(raw)) return 'five_years'
  if (/四年|4\s*(y|yr|years?)/.test(raw)) return 'four_years'
  if (/三年|3\s*(y|yr|years?)/.test(raw)) return 'three_years'
  if (/两年|二年|2\s*(y|yr|years?)/.test(raw)) return 'two_years'
  if (/半年|half[-_\s]?year/.test(raw)) return 'half_year'
  if (/季|quarter|\/q\b/.test(raw)) return 'quarter'
  if (/年|annual|year|yr\b|\/y\b/.test(raw)) return 'year'
  if (/月|monthly|month|mo\b|\/m\b/.test(raw)) return 'month'
  const c = String(s.billing_cycle || '').trim()
  return CYCLES[c] ? c : 'month'
}

export function currencyOf(s: Server): string {
  const raw = String(s.currency || s.price || '').trim().replace('￥', '¥')
  for (const c of MULTI_CHAR_CURRENCIES) if (raw.startsWith(c) || String(s.price || '').includes(c)) return c
  const m = raw.match(/^[^\d\s.,-]/)
  return m ? m[0] : ''
}

export function formatPrice(s: Server): string {
  const p = parsePrice(s.price)
  if (p === null) return ''
  if (p === 0 || p === -1) return '免费'
  return `${currencyOf(s)}${Number.isInteger(p) ? p : p.toFixed(2)}/${CYCLES[detectCycle(s)].label}`
}

/** 折算到每月的费用（原币种），免费或未设置返回 null */
export function monthlyCost(s: Server): number | null {
  const p = parsePrice(s.price)
  if (p === null || p <= 0) return null
  return p / CYCLES[detectCycle(s)].months
}

const DAY = 86_400_000

const parseDate = (v: unknown): number | null => {
  const m = String(v ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return Date.UTC(+m[1], +m[2] - 1, +m[3])
}

const addMonths = (ts: number, months: number) => {
  const d = new Date(ts)
  const y = d.getUTCFullYear()
  const mo = d.getUTCMonth() + months
  const target = new Date(Date.UTC(y, mo, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  return Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d.getUTCDate(), lastDay))
}

/** 到期时间戳；开启自动续费时按周期滚动到未来 */
export function expireAt(s: Server, now = Date.now()): number | null {
  let t = parseDate(s.expire_date)
  if (t === null) return null
  const auto = s.auto_renewal === '1' || (s.auto_renewal as unknown) === true || s.auto_renewal === 'true'
  if (auto) {
    const months = CYCLES[detectCycle(s)].months
    let guard = 0
    while (t <= now && guard++ < 1200) t = addMonths(t, months)
  }
  return t
}

/** 剩余天数（向上取整），无到期日返回 null，已过期返回负数或 0 */
export function daysLeft(s: Server, now = Date.now()): number | null {
  const t = expireAt(s, now)
  if (t === null) return null
  return Math.ceil((t - now) / DAY)
}

/** 剩余价值（原币种）：按本周期日均价格 × 剩余天数 */
export function remainingValue(s: Server, now = Date.now()): number | null {
  const p = parsePrice(s.price)
  const left = daysLeft(s, now)
  if (p === null || p <= 0 || left === null || left <= 0) return null
  const cycleDays = CYCLES[detectCycle(s)].months * 30.4375
  return (p / cycleDays) * left
}

export const isAutoRenew = (s: Server) => s.auto_renewal === '1' || s.auto_renewal === 'true'
