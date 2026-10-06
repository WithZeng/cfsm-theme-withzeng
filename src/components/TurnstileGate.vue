<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { loadTurnstile, setTurnstileToken } from '@/api/turnstile'
import { useInkTheme } from '@/composables/useInkTheme'

const props = defineProps<{ siteKey: string }>()
const emit = defineEmits<{ verified: [] }>()
const box = ref<HTMLElement | null>(null)
const error = ref('')
const { isDark } = useInkTheme()
let widgetId: string | undefined

onMounted(async () => {
  try {
    await loadTurnstile()
    if (!box.value || !window.turnstile) return
    widgetId = window.turnstile.render(box.value, {
      sitekey: props.siteKey,
      theme: isDark.value ? 'dark' : 'light',
      callback: (token) => {
        setTurnstileToken(token)
        emit('verified')
      },
      'error-callback': () => { error.value = '人机验证失败，请刷新重试' }
    })
  } catch {
    error.value = '无法加载 Cloudflare Turnstile'
  }
})

onBeforeUnmount(() => {
  if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
})
</script>

<template>
  <div class="gate">
    <span class="brush mark">剑来</span>
    <p>入城之前，请先完成人机验证</p>
    <div ref="box" class="widget" />
    <p v-if="error" class="err">{{ error }}</p>
  </div>
</template>

<style scoped>
.gate {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--sub);
  padding: 24px;
  text-align: center;
}
.mark {
  font-size: 64px;
  color: var(--ink);
}
.widget {
  min-height: 70px;
}
.err {
  color: var(--zhu);
}
</style>
