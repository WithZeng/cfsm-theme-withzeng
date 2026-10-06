import { ref, watch } from 'vue'
import { safeStorageGet, safeStorageSet } from '@/api/http'

// 访客个人偏好，只存在当前浏览器
function persisted<T>(key: string, fallback: T) {
  let initial = fallback
  try {
    const raw = safeStorageGet(key)
    if (raw) initial = JSON.parse(raw) as T
  } catch {
    initial = fallback
  }
  const r = ref(initial) as { value: T }
  watch(() => r.value, (v) => safeStorageSet(key, JSON.stringify(v)), { deep: true })
  return r
}

const favorites = persisted<string[]>('jl_favs', [])
const view = persisted<'card' | 'list'>('jl_view', 'card')

export function usePrefs() {
  return {
    favorites,
    view,
    isFav: (key: string) => favorites.value.includes(key),
    toggleFav(key: string) {
      favorites.value = favorites.value.includes(key) ? favorites.value.filter((k) => k !== key) : [...favorites.value, key]
    }
  }
}
