<script setup lang="ts">
import { useMonitor } from '@/composables/useMonitor'

const { config } = useMonitor()
</script>

<template>
  <footer class="footer">
    <a href="https://github.com/huilang-me/CF-Server-Monitor/" target="_blank" rel="noopener">
      Powered by CF-Server-Monitor<template v-if="config?.version"> v{{ config.version }}</template>
    </a>
    <span class="sep">·</span>
    <a href="https://github.com/withzeng/cfsm-theme-withzeng" target="_blank" rel="noopener">剑来主题</a>
  </footer>
</template>

<style scoped>
.footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  padding: 32px 0 8px;
  font-size: 13px;
  color: var(--sub);
}
a {
  color: var(--sub);
}
.sep {
  opacity: 0.6;
}
</style>
