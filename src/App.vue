<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useMonitor } from '@/composables/useMonitor'
import { useInkTheme } from '@/composables/useInkTheme'
import TurnstileGate from '@/components/TurnstileGate.vue'
import LiveTimeoutModal from '@/components/LiveTimeoutModal.vue'
import InkMountains from '@/components/InkMountains.vue'

const { state, config, boot, bindVisibility } = useMonitor()
const theme = useInkTheme()
const starting = ref(true)

async function start() {
  starting.value = true
  const ok = await boot()
  starting.value = false
  if (ok) bindVisibility()
}

watch(config, (c) => {
  theme.setSiteDefault(c?.preferred_theme)
  if (c?.site_title && !document.title.trim()) document.title = c.site_title
})

onMounted(start)
</script>

<template>
  <InkMountains />
  <div class="shell">
    <div v-if="starting" class="splash">
      <span class="brush splash-mark">剑来</span>
      <span class="splash-text">正在连接城头…</span>
    </div>
    <TurnstileGate v-else-if="state.turnstileSiteKey" :site-key="state.turnstileSiteKey" @verified="start" />
    <div v-else-if="!state.booted" class="splash">
      <span class="brush splash-mark">剑来</span>
      <span class="splash-text">{{ state.error || '加载失败' }}</span>
      <button class="retry" type="button" @click="start">重试</button>
    </div>
    <router-view v-else />
  </div>
  <LiveTimeoutModal />
</template>

<style scoped>
.shell {
  position: relative;
  min-height: 100vh;
}
.splash {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--sub);
}
.splash-mark {
  font-size: 64px;
  color: var(--ink);
}
.splash-text {
  font-size: 14px;
}
.retry {
  min-height: 40px;
  padding: 0 18px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--card);
  cursor: pointer;
}
</style>
