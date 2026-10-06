<script setup lang="ts">
// 本命瓷小图标：水位为内存占用，光晕颜色为 CPU 负载，离线则开裂
import { computed, useId } from 'vue'

const props = defineProps<{ cpu: number | null; mem: number | null; online: boolean }>()
const uid = useId()
const SHAPE = 'M58 10 L82 10 L82 22 C110 30 120 60 116 96 C112 130 96 160 90 182 L50 182 C44 160 28 130 24 96 C20 60 30 30 58 22 Z'

const halo = computed(() => {
  const c = props.cpu ?? 0
  return c >= 85 ? 'var(--zhu)' : c >= 60 ? 'var(--ochre)' : 'var(--blue)'
})
const waterY = computed(() => 182 - ((props.mem ?? 0) / 100) * 168)
const label = computed(() =>
  props.online ? `本命瓷：CPU ${Math.round(props.cpu ?? 0)}%，内存 ${Math.round(props.mem ?? 0)}%` : '本命瓷开裂：离线'
)
</script>

<template>
  <svg class="vase" viewBox="0 0 140 190" role="img" :aria-label="label">
    <defs>
      <clipPath :id="`${uid}-clip`"><path :d="SHAPE" /></clipPath>
      <filter :id="`${uid}-blur`" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="8" /></filter>
    </defs>
    <ellipse v-if="online" cx="70" cy="100" rx="60" ry="84" :style="{ fill: halo }" :opacity="0.25 + ((cpu ?? 0) / 100) * 0.5" :filter="`url(#${uid}-blur)`" />
    <path :d="SHAPE" class="body" :class="{ off: !online }" />
    <rect v-if="online" x="0" :y="waterY" width="140" height="200" class="water" :clip-path="`url(#${uid}-clip)`" />
    <path d="M22 66 C29 57 40 60 38 69 M52 60 C59 51 70 54 68 63 M82 66 C89 57 100 60 98 69" class="pattern" :clip-path="`url(#${uid}-clip)`" />
    <path v-if="!online" d="M74 22 L66 56 L80 84 L64 112 L82 142 L72 180 M80 84 L98 96" class="crack" />
  </svg>
</template>

<style scoped>
.vase {
  width: 30px;
  height: 40px;
  flex-shrink: 0;
}
.body {
  fill: var(--porcelain);
  stroke: var(--sub);
  stroke-width: 4;
}
.body.off {
  fill: var(--track);
}
.water {
  fill: var(--blue);
  opacity: 0.45;
  transition: y 0.6s ease;
}
.pattern {
  fill: none;
  stroke: #2b3f8c;
  stroke-width: 6;
}
.crack {
  fill: none;
  stroke: var(--ink);
  stroke-width: 5;
}
</style>
