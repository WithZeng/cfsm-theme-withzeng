import { STORAGE_KEYS, safeStorageGet, safeStorageSet } from './http'

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptPromise: Promise<void> | null = null

export const hasTurnstileVerified = () => !!safeStorageGet(STORAGE_KEYS.turnstileVerified)

export const setTurnstileToken = (token: string) => safeStorageSet(STORAGE_KEYS.turnstileToken, token)

export function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = (e) => {
      scriptPromise = null
      reject(e)
    }
    document.head.appendChild(s)
  })
  return scriptPromise
}
