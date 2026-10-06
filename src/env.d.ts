/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface TurnstileRenderOptions {
  sitekey: string
  callback?: (token: string) => void
  'error-callback'?: () => void
  'expired-callback'?: () => void
  theme?: 'light' | 'dark' | 'auto'
}

interface Window {
  turnstile?: {
    render: (el: HTMLElement | string, options: TurnstileRenderOptions) => string
    reset: (id?: string) => void
    remove: (id?: string) => void
  }
}
