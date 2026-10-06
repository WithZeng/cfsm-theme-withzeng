<script setup lang="ts">
import { computed, ref } from 'vue'
import { suppressSpikes, type ChartSeries, type ProbeTarget } from '@/utils/history'
import { trimFixed } from '@/utils/format'
import LineChart from './LineChart.vue'

const props = defineProps<{ targets: ProbeTarget[]; ts: number[]; withDate: boolean }>()
const hidden = ref<Record<string, boolean>>({})
const hideSpikes = ref(false)

const series = computed<ChartSeries[]>(() =>
  props.targets
    .filter((t) => !hidden.value[t.key])
    .map((t) => ({ name: t.name, color: t.color, values: hideSpikes.value ? suppressSpikes(t.ping) : t.ping, dashed: t.key === 'bd' }))
)
const ms = (v: number) => `${trimFixed(v, 0)}ms`
</script>

<template>
  <section class="card probe">
    <div class="head">
      <div class="title">
        <span class="brush name">飞剑传信</span>
        <span class="hint">按探测目标查看延迟、丢包与波动</span>
      </div>
      <div class="toggles">
        <button
          v-for="t in targets"
          :key="t.key"
          type="button"
          class="pill"
          :aria-pressed="!hidden[t.key]"
          @click="hidden = { ...hidden, [t.key]: !hidden[t.key] }"
        >
          <span class="sw" :style="{ background: t.color }" />{{ t.name }}
        </button>
        <button type="button" class="pill" :aria-pressed="hideSpikes" @click="hideSpikes = !hideSpikes">隐藏尖峰</button>
      </div>
    </div>
    <div class="tiles">
      <div v-for="t in targets" :key="t.key" class="tile" :style="{ borderTopColor: t.color, opacity: hidden[t.key] ? 0.4 : 1 }">
        <span class="tname">{{ t.name }}</span>
        <div class="tstats mono">
          <span><small>平均</small>{{ t.avg === null ? '—' : `${trimFixed(t.avg, 1)} ms` }}</span>
          <span><small>丢包</small><b :class="{ bad: (t.lossAvg ?? 0) >= 2 }">{{ t.lossAvg === null ? '—' : `${trimFixed(t.lossAvg, 1)}%` }}</b></span>
          <span><small>波动</small>{{ t.jitter === null ? '—' : `${trimFixed(t.jitter, 1)} ms` }}</span>
        </div>
        <span v-if="t.timeouts" class="timeouts">超时 {{ t.timeouts }} 次</span>
      </div>
    </div>
    <LineChart :ts="ts" :series="series" :format="ms" :height="180" :with-date="withDate" />
  </section>
</template>

<style scoped>
.probe {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.title {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.name {
  font-size: 30px;
  line-height: 1;
}
.hint {
  font-size: 12px;
  color: var(--sub);
}
.toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pill {
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
.pill[aria-pressed='true'] {
  border-color: var(--ink);
  background: var(--chip);
}
.sw {
  width: 10px;
  height: 3px;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}
.tile {
  padding: 10px 12px;
  background: var(--inset);
  border-radius: 8px;
  border-top: 3px solid;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tname {
  font-size: 13px;
  font-weight: 600;
}
.tstats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  font-size: 13px;
}
.tstats span {
  display: flex;
  flex-direction: column;
}
small {
  font-family: var(--font-body);
  font-size: 10px;
  color: var(--sub);
}
b {
  font-weight: 400;
}
b.bad {
  color: var(--zhu);
}
.timeouts {
  font-size: 11px;
  color: var(--zhu);
}
</style>
