<script setup lang="ts">
import InkIcon from '../InkIcon.vue'
import type { QuickFilter } from '@/utils/view'

defineProps<{ groups: string[]; quicks: QuickFilter[] }>()
const group = defineModel<string>('group', { required: true })
const quick = defineModel<string>('quick', { required: true })
const search = defineModel<string>('search', { required: true })
const view = defineModel<'card' | 'list'>('view', { required: true })
</script>

<template>
  <div class="bar">
    <div v-if="groups.length > 1" class="segmented" role="group" aria-label="分组">
      <button v-for="g in groups" :key="g" type="button" :aria-pressed="group === g" @click="group = g">{{ g }}</button>
    </div>
    <div class="quicks">
      <button
        v-for="q in quicks"
        :key="q.key"
        type="button"
        class="quick"
        :aria-pressed="quick === q.key"
        @click="quick = quick === q.key ? '' : q.key"
      >
        <span class="qdot" :style="{ background: q.dot }" />{{ q.label }}<span class="mono count">{{ q.count }}</span>
      </button>
    </div>
    <div class="tools">
      <label class="search">
        <InkIcon name="search" :size="16" />
        <span class="sr-only">搜索节点</span>
        <input v-model="search" type="search" placeholder="搜索名称、地区、标签" />
      </label>
      <div class="segmented" role="group" aria-label="视图">
        <button type="button" aria-label="卡片视图" :aria-pressed="view === 'card'" @click="view = 'card'"><InkIcon name="grid" :size="16" /></button>
        <button type="button" aria-label="列表视图" :aria-pressed="view === 'list'" @click="view = 'list'"><InkIcon name="list" :size="16" /></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.segmented button {
  font-weight: 600;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
}
.quicks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.quick {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: transparent;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.quick[aria-pressed='true'] {
  border-color: var(--ink);
  background: var(--chip);
}
.qdot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.count {
  font-size: 11px;
  padding: 0 6px;
  border-radius: 8px;
  background: var(--chip);
  color: var(--sub);
}
.tools {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.search {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 12px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--sub);
}
.search input {
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font-size: 14px;
  width: 170px;
}
@media (max-width: 720px) {
  .tools {
    margin-left: 0;
    width: 100%;
  }
  .search {
    flex: 1;
  }
  .search input {
    width: 100%;
  }
}
</style>
