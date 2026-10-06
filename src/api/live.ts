import { getJwt, getWsBase } from './http'
import type { BatchUpdateMessage, Server } from './types'

export interface LiveSample {
  ts: number
  data: Partial<Server>
}

export interface LiveHandlers {
  /** 某台服务器本批次的样本，按时间升序 */
  onSamples: (serverId: string, samples: LiveSample[]) => void
  onStatus?: (connected: boolean) => void
  /** 单次连接达到 frontend_ws_timeout_minutes 后触发，连接已关闭，需用户确认后再连 */
  onLifetimeExceeded?: () => void
}

export interface LiveOptions {
  base: string
  /** 'all' 或单个服务器 id */
  scope: string
  /** scope=all 时需要提交的服务器 id 列表 */
  ids?: string[]
  timeoutMinutes?: number
}

export interface LiveSocket {
  close: () => void
}

const RECONNECT_MIN_MS = 1000
const RECONNECT_MAX_MS = 30_000
const MAX_ATTEMPTS = 10

const normalizeTs = (v: unknown, fallback: number) => {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n < 10_000_000_000 ? n * 1000 : n
}

export function createLiveSocket(opts: LiveOptions, handlers: LiveHandlers): LiveSocket {
  let ws: WebSocket | null = null
  let closedByUs = false
  let attempts = 0
  let delay = RECONNECT_MIN_MS
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let lifetimeTimer: ReturnType<typeof setTimeout> | null = null
  const lifetimeMs = Math.max(0, Math.min(1440, Number(opts.timeoutMinutes) || 0)) * 60_000

  const clearTimers = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (lifetimeTimer) clearTimeout(lifetimeTimer)
    reconnectTimer = null
    lifetimeTimer = null
  }

  const handleMessage = (raw: unknown) => {
    if (typeof raw !== 'string') return
    let msg: BatchUpdateMessage | { type?: string } | null = null
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    if (!msg || msg.type !== 'batchUpdate') return
    const batch = msg as BatchUpdateMessage
    const now = Date.now()
    for (const update of batch.updates || []) {
      if (!update?.serverId) continue
      const samples: LiveSample[] = []
      for (const s of update.samples || []) {
        const data = s?.data || s?.payload || s?.metrics
        if (!data) continue
        samples.push({ ts: normalizeTs(s.ts ?? data.last_updated ?? batch.ts, now), data })
      }
      if (samples.length) {
        samples.sort((a, b) => a.ts - b.ts)
        handlers.onSamples(update.serverId, samples)
      }
    }
  }

  const connect = () => {
    const url = new URL(`${getWsBase(opts.base)}/api/ws`)
    url.searchParams.set('subscribe', opts.scope)
    // 浏览器 WebSocket 不能带 Authorization：同域靠 cfsm_auth Cookie，跨域才走 token 参数
    const jwt = getJwt()
    if (jwt && url.host !== window.location.host) url.searchParams.set('token', jwt)

    let socket: WebSocket
    try {
      socket = new WebSocket(url.toString())
    } catch {
      handlers.onStatus?.(false)
      return
    }
    ws = socket

    socket.addEventListener('open', () => {
      if (socket !== ws) return
      attempts = 0
      delay = RECONNECT_MIN_MS
      if (opts.scope === 'all') {
        socket.send(JSON.stringify({ type: 'subscribe', scope: 'all', ids: (opts.ids || []).slice(0, 500) }))
      }
      handlers.onStatus?.(true)
      if (lifetimeMs > 0) {
        lifetimeTimer = setTimeout(() => {
          closedByUs = true
          try { socket.close(1000, 'lifetime exceeded') } catch { /* noop */ }
          handlers.onLifetimeExceeded?.()
        }, lifetimeMs)
      }
    })
    socket.addEventListener('message', (ev) => {
      if (socket === ws) handleMessage(ev.data)
    })
    socket.addEventListener('close', () => {
      if (socket !== ws) return
      ws = null
      handlers.onStatus?.(false)
      if (lifetimeTimer) clearTimeout(lifetimeTimer)
      if (closedByUs || attempts >= MAX_ATTEMPTS) return
      attempts += 1
      reconnectTimer = setTimeout(connect, delay)
      delay = Math.min(delay * 2, RECONNECT_MAX_MS)
    })
    socket.addEventListener('error', () => {
      try { socket.close() } catch { /* noop */ }
    })
  }

  connect()

  return {
    close() {
      closedByUs = true
      clearTimers()
      if (ws) {
        try { ws.close() } catch { /* noop */ }
        ws = null
      }
    }
  }
}
