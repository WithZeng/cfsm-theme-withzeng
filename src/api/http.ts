// 与 CFSM 内置前端保持同一套存储键，方便与后台登录态、Turnstile 凭证互通
export const STORAGE_KEYS = {
  jwt: 'jwt_token',
  turnstileToken: 'turnstile_token',
  turnstileVerified: 'turnstile_verified'
} as const

const REQUEST_TIMEOUT_MS = 15_000

const stripSlash = (s: string) => s.replace(/\/+$/, '')

let apiBases: string[] = []

/** 读取 <meta name="apiBase">；为空时使用同源。多个地址用英文逗号分隔。 */
export function initApiBases(): string[] {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="apiBase"]')?.content || ''
  const list = meta.split(',').map((s) => stripSlash(s.trim())).filter(Boolean)
  apiBases = list.length ? list : [stripSlash(window.location.origin)]
  return apiBases
}

export const getApiBases = () => (apiBases.length ? apiBases : initApiBases())

export const getWsBase = (base: string) => {
  const u = new URL(base)
  return `${u.protocol === 'https:' ? 'wss:' : 'ws:'}//${u.host}`
}

export function safeStorageGet(key: string): string {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

export function safeStorageSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // 隐私模式或禁用存储时忽略
  }
}

export const getJwt = () => safeStorageGet(STORAGE_KEYS.jwt)

export interface HttpResult<T> {
  ok: boolean
  status: number
  data?: T
  error?: string
  timeout?: boolean
}

export interface RequestOptions {
  /** 是否附带 X-Turnstile-Token（一次性 token），默认 true */
  turnstileToken?: boolean
  /** 是否附带 X-Turnstile-Verified（缓存凭证），默认 true */
  turnstileVerified?: boolean
  timeoutMs?: number | null
  method?: 'GET' | 'POST'
  body?: unknown
}

function buildHeaders(opts: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const jwt = getJwt()
  if (jwt) headers.Authorization = `Bearer ${jwt}`
  if (opts.turnstileToken !== false) {
    const token = safeStorageGet(STORAGE_KEYS.turnstileToken)
    if (token) headers['X-Turnstile-Token'] = token
  }
  if (opts.turnstileVerified !== false) {
    const verified = safeStorageGet(STORAGE_KEYS.turnstileVerified)
    if (verified) headers['X-Turnstile-Verified'] = verified
  }
  return headers
}

export async function request<T>(base: string, path: string, opts: RequestOptions = {}): Promise<HttpResult<T>> {
  const timeoutMs = opts.timeoutMs === undefined ? REQUEST_TIMEOUT_MS : opts.timeoutMs
  const controller = new AbortController()
  const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    const res = await fetch(`${base}${path}`, {
      method: opts.method || 'GET',
      headers: buildHeaders(opts),
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      credentials: 'include',
      signal: controller.signal
    })
    let data: unknown = null
    try {
      data = await res.json()
    } catch {
      data = null
    }
    if (res.status === 403) {
      // Turnstile 凭证失效，清掉后由上层重新验证
      safeStorageSet(STORAGE_KEYS.turnstileToken, null)
      safeStorageSet(STORAGE_KEYS.turnstileVerified, null)
    }
    if (!res.ok) {
      const err = (data as { error?: string; message?: string } | null)
      return { ok: false, status: res.status, error: err?.error || err?.message || `HTTP ${res.status}` }
    }
    const verified = (data as { turnstile_verified?: string } | null)?.turnstile_verified
    if (verified) {
      safeStorageSet(STORAGE_KEYS.turnstileVerified, verified)
      safeStorageSet(STORAGE_KEYS.turnstileToken, null)
    }
    return { ok: true, status: res.status, data: data as T }
  } catch (e) {
    const aborted = (e as Error).name === 'AbortError'
    return { ok: false, status: 0, error: aborted ? 'timeout' : (e as Error).message || 'network error', timeout: aborted }
  } finally {
    if (timer) clearTimeout(timer)
  }
}
