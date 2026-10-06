import { describe, expect, it } from 'vitest'
import { compactSpeed, formatBytes, formatMB, normalizeTs } from '../src/utils/format'
import { daysLeft, formatPrice, isFree, monthlyCost, remainingValue } from '../src/utils/billing'
import { carveOf, currentProbe, flagCode, isOnline, nextMilestone, trafficPct, trafficUsed, windowCells } from '../src/utils/server'
import { buildProbeTargets, framesFromHistory, suppressSpikes } from '../src/utils/history'
import type { Server } from '../src/api/types'

const base: Server = { id: 's1', name: 'HK' }

describe('format', () => {
  it('formats bytes with 1024 units and never negative exponent', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(0.4)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatMB(8192)).toBe('8 GB')
  })
  it('compacts speeds', () => {
    expect(compactSpeed(686 * 1024)).toBe('686K')
    expect(compactSpeed(1.7 * 1024 * 1024)).toBe('1.7M')
    expect(compactSpeed(0)).toBe('0')
  })
  it('normalizes second and millisecond timestamps', () => {
    expect(normalizeTs(1_700_000_000)).toBe(1_700_000_000_000)
    expect(normalizeTs(1_700_000_000_000)).toBe(1_700_000_000_000)
    expect(normalizeTs(null)).toBeNull()
  })
})

describe('billing', () => {
  it('treats 0 and -1 as free, blank as unset', () => {
    expect(isFree({ ...base, price: '0' })).toBe(true)
    expect(isFree({ ...base, price: '-1' })).toBe(true)
    expect(formatPrice({ ...base, price: '' })).toBe('')
    expect(formatPrice({ ...base, price: '0' })).toBe('免费')
  })
  it('formats price with currency and cycle', () => {
    expect(formatPrice({ ...base, price: '30', currency: '¥', billing_cycle: 'month' })).toBe('¥30/月')
    expect(formatPrice({ ...base, price: '18', currency: '¥', billing_cycle: 'year' })).toBe('¥18/年')
    expect(monthlyCost({ ...base, price: '120', billing_cycle: 'year' })).toBe(10)
  })
  it('rolls auto-renewed expiry into the future', () => {
    const now = Date.UTC(2026, 9, 6)
    const s = { ...base, price: '10', billing_cycle: 'month', expire_date: '2026-09-15', auto_renewal: '1' }
    expect(daysLeft(s, now)).toBe(9)
    expect(daysLeft({ ...s, auto_renewal: '0' }, now)).toBeLessThan(0)
  })
  it('computes remaining value pro rata', () => {
    const now = Date.UTC(2026, 9, 6)
    const v = remainingValue({ ...base, price: '30.4375', billing_cycle: 'month', expire_date: '2026-10-16' }, now)
    expect(v).toBeCloseTo(10, 5)
  })
})

describe('server', () => {
  it('uses a 5 minute online threshold', () => {
    const now = Date.now()
    expect(isOnline({ ...base, last_updated: now - 60_000 }, now)).toBe(true)
    expect(isOnline({ ...base, last_updated: now - 6 * 60_000 }, now)).toBe(false)
  })
  it('measures traffic by calc type against a GB limit', () => {
    const s = { ...base, net_rx_monthly: 300 * 1024 ** 3, net_tx_monthly: 100 * 1024 ** 3, traffic_limit: '1000' }
    expect(trafficUsed(s)).toBe(400 * 1024 ** 3)
    expect(trafficUsed({ ...s, traffic_calc_type: 'max' })).toBe(300 * 1024 ** 3)
    expect(trafficPct(s)).toBeCloseTo(40)
    expect(trafficPct({ ...s, traffic_limit: '' })).toBeNull()
  })
  it('keeps 0 as valid, null as timeout and false as unconfigured', () => {
    const cells = windowCells([
      { ts: 1, ct: 0, cu: false },
      { ts: 2, ct: null, cu: false },
      { ts: 3, ct: false, cu: false }
    ], 'ping', 5)
    expect(cells.map((c) => c.state)).toEqual(['empty', 'empty', 'ok', 'timeout', 'empty'])
    expect(currentProbe({ ...base, ping: [{ ts: 1, ct: 0 }] }, 'ping')).toBe(0)
  })
  it('carves milestones', () => {
    expect(carveOf(29)).toBe('')
    expect(carveOf(30)).toBe('稳')
    expect(carveOf(400)).toBe('久')
    expect(nextMilestone(63)).toEqual({ char: '恒', inDays: 37 })
    expect(nextMilestone(500)).toBeNull()
  })
  it('maps region to flag code like the default skin', () => {
    expect(flagCode('hk')).toBe('hk')
    expect(flagCode('')).toBe('')
    expect(flagCode('Hong Kong')).toBe('')
  })
})

describe('history', () => {
  it('skips unconfigured probe lines and counts timeouts', () => {
    const frames = framesFromHistory([
      { timestamp: 2000, ping_ct: 30, ping_cu: false, loss_ct: 0 },
      { timestamp: 1000, ping_ct: 20, ping_cu: false, loss_ct: 1 },
      { timestamp: 3000, ping_ct: null, ping_cu: false, loss_ct: 0 }
    ])
    expect(frames.map((f) => f.ts)).toEqual([1_000_000, 2_000_000, 3_000_000])
    const t = buildProbeTargets(frames, { ct: '电信', cu: '联通', cm: '移动', bd: 'BGP' })
    expect(t.map((x) => x.key)).toEqual(['ct'])
    expect(t[0].avg).toBe(25)
    expect(t[0].timeouts).toBe(1)
    expect(t[0].jitter).toBe(10)
  })
  it('removes isolated spikes only', () => {
    expect(suppressSpikes([10, 11, 200, 10, 12, 11])).toEqual([10, 11, null, 10, 12, 11])
    expect(suppressSpikes([10, 11, 200, 210, 12, 11])).toEqual([10, 11, 200, 210, 12, 11])
  })
})

