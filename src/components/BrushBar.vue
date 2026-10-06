<script setup lang="ts">
// 毛笔边缘的进度条：两端用不规则多边形裁切，模拟飞白
import type { Level } from '@/utils/server'

defineProps<{ pct: number | null; level?: Level; height?: number; color?: string }>()
</script>

<template>
  <span class="bar" :style="{ height: `${height || 5}px` }" role="presentation">
    <span class="track" />
    <span
      class="fill"
      :class="`lv-${level || 'ok'}`"
      :style="{ width: `${pct ?? 0}%`, background: color || 'var(--lv)' }"
    />
  </span>
</template>

<style scoped>
.bar {
  position: relative;
  display: block;
}
.track,
.fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
}
.track {
  right: 0;
  background: var(--track);
  clip-path: polygon(0 40%, 2% 0, 99% 15%, 100% 60%, 98% 100%, 1% 85%);
}
.fill {
  clip-path: polygon(0 35%, 3% 0, 96% 10%, 100% 50%, 95% 100%, 2% 88%);
  transition: width 0.4s ease;
}
</style>
