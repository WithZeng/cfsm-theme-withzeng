import { computed, ref, watchEffect } from 'vue'
import { safeStorageGet, safeStorageSet } from '@/api/http'

type Pref = 'auto' | 'light' | 'dark'
const KEY = 'jl_theme'

const pref = ref<Pref>((safeStorageGet(KEY) as Pref) || 'auto')
const siteDefault = ref<Pref>('auto')
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null
const systemDark = ref(media?.matches ?? false)
media?.addEventListener('change', (e) => { systemDark.value = e.matches })

const resolved = computed<'light' | 'dark'>(() => {
  const p = pref.value === 'auto' ? siteDefault.value : pref.value
  if (p === 'auto') return systemDark.value ? 'dark' : 'light'
  return p
})

watchEffect(() => {
  document.documentElement.dataset.theme = resolved.value
  document.documentElement.style.colorScheme = resolved.value
})

export function useInkTheme() {
  return {
    isDark: computed(() => resolved.value === 'dark'),
    /** 后台“默认外观”，访客未手动切换时生效 */
    setSiteDefault(p: unknown) {
      siteDefault.value = p === 'dark' || p === 'light' ? p : 'auto'
    },
    toggle() {
      pref.value = resolved.value === 'dark' ? 'light' : 'dark'
      safeStorageSet(KEY, pref.value)
    }
  }
}
