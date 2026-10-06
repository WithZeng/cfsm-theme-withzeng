<script setup lang="ts">
import type { Cell } from '@/utils/server'

defineProps<{ cells: Cell[]; unit: string }>()
const tip = (c: Cell, unit: string) => (c.state === 'empty' ? '无数据' : c.state === 'timeout' ? '超时' : `${c.value?.toFixed(1)} ${unit}`)
</script>

<template>
  <div class="strip">
    <span v-for="(c, i) in cells" :key="i" class="cell" :class="`c-${c.state}`" :title="tip(c, unit)" />
  </div>
</template>

<style scoped>
.strip {
  display: flex;
  gap: 1.5px;
}
.cell {
  flex: 1;
  height: 10px;
  border-radius: 1px;
  background: var(--empty);
}
.c-ok { background: var(--jade); }
.c-warn { background: var(--ochre-soft); }
.c-crit { background: var(--zhu); }
.c-timeout { background: var(--zhu-soft); }
</style>
