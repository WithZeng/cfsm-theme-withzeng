<script setup lang="ts">
import { computed } from 'vue'
import { useMonitor } from '@/composables/useMonitor'
import { useInkTheme } from '@/composables/useInkTheme'
import InkIcon from './InkIcon.vue'

defineEmits<{ refresh: [] }>()
const { config, state } = useMonitor()
const { isDark, toggle } = useInkTheme()
const title = computed(() => config.value?.site_title || document.title || 'Server Monitor')
const mark = computed(() => Array.from(title.value.trim())[0] || '剑')
</script>

<template>
  <header class="header">
    <router-link to="/" class="brand">
      <span class="logo brush">{{ mark }}</span>
      <span class="title brush">{{ title }}</span>
    </router-link>
    <div class="actions">
      <span class="live" :class="{ on: state.liveConnected }" :title="state.liveConnected ? '实时连接中' : '实时未连接'">
        <span class="dot" />{{ state.liveConnected ? '实时' : '静态' }}
      </span>
      <button type="button" class="icon-btn" :aria-label="isDark ? '切换为昼' : '切换为夜'" @click="toggle">
        <InkIcon :name="isDark ? 'sun' : 'moon'" :size="20" />
      </button>
      <button type="button" class="icon-btn" aria-label="刷新" @click="$emit('refresh')">
        <InkIcon name="refresh" :size="20" />
      </button>
      <a class="icon-btn" href="/admin#admin" aria-label="管理后台">
        <InkIcon name="admin" :size="20" />
      </a>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  min-width: 0;
}
.logo {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  background: var(--zhu);
  color: #fff8ee;
  font-size: 24px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.title {
  font-size: 30px;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
.live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 6px;
  font-size: 12px;
  color: var(--sub);
}
.live .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--sub);
}
.live.on .dot {
  background: var(--jade);
  box-shadow: 0 0 0 3px var(--jade-chip);
}
@media (max-width: 560px) {
  .title {
    font-size: 24px;
  }
  .live {
    display: none;
  }
}
</style>
