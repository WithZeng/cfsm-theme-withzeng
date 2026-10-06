<script setup lang="ts">
import { computed } from 'vue'
import type { CardView } from '@/utils/view'
import { formatDateTime, trimFixed } from '@/utils/format'
import BrushBar from '../BrushBar.vue'
import CellStrip from './CellStrip.vue'
import InkIcon from '../InkIcon.vue'

const props = defineProps<{ card: CardView; fav: boolean }>()
defineEmits<{ toggleFav: [] }>()

const to = computed(() => ({ name: 'server', params: { id: props.card.id }, query: props.card.baseIndex ? { b: props.card.baseIndex } : {} }))
const lossColor = computed(() => ((props.card.loss ?? 0) >= 5 ? 'var(--zhu)' : 'inherit'))
</script>

<template>
  <article class="card node" :class="{ offline: !card.online }">
    <header class="row1">
      <span class="status" :class="card.online ? 'on' : 'off'" :aria-label="card.online ? '在线' : '离线'" />
      <router-link :to="to" class="name">{{ card.name }}</router-link>
      <button type="button" class="star" :class="{ on: fav }" :aria-label="fav ? '取消收藏' : '收藏'" :aria-pressed="fav" @click="$emit('toggleFav')">
        <InkIcon name="star" :size="15" />
      </button>
      <img v-if="card.osIcon" :src="card.osIcon" :alt="card.os" class="os" loading="lazy" />
      <img v-if="card.flag" :src="`/flags/${card.flag}.svg`" :alt="card.region" class="flag" loading="lazy" />
      <span v-else-if="card.region" class="region">{{ card.region }}</span>
    </header>

    <div class="chips">
      <span v-if="card.uptimeDays !== null" class="chip">在线 {{ card.uptimeDays }} 天</span>
      <span v-if="card.price" class="chip">{{ card.price }}</span>
      <span v-if="card.carve" class="seal mark" title="在线里程碑">{{ card.carve }}</span>
    </div>

    <div class="metrics">
      <div v-for="m in card.metrics" :key="m.key" class="metric">
        <div class="mhead">
          <span class="mlabel">{{ m.label }}</span>
          <span class="mono mval" :class="{ crit: m.level === 'crit' }">{{ m.text }}</span>
        </div>
        <BrushBar :pct="m.pct" :level="m.level" />
        <span class="mono msub">{{ m.sub }}</span>
      </div>
    </div>

    <div class="net mono">
      <span class="col"><span class="up">↑ {{ card.up }}</span><span class="down">↓ {{ card.down }}</span></span>
      <span class="col"><span>Σ↑ {{ card.totUp }}</span><span>Σ↓ {{ card.totDown }}</span></span>
      <span class="col">
        <span v-if="card.daysLeft !== null" :class="`lv-${card.remainLevel}`" class="remain">{{ card.daysLeft > 0 ? `剩 ${card.daysLeft} 天` : '已到期' }}</span>
        <span v-else>长期</span>
        <span v-if="card.value">值 {{ card.value }}</span>
      </span>
    </div>

    <div v-if="card.showProbe" class="probe">
      <div>
        <div class="phead"><span>延迟</span><span class="mono">{{ card.ping === null ? '—' : `${trimFixed(card.ping, 1)} ms` }}</span></div>
        <CellStrip :cells="card.pingCells" unit="ms" />
      </div>
      <div>
        <div class="phead"><span>丢包</span><span class="mono" :style="{ color: lossColor }">{{ card.loss === null ? '—' : `${trimFixed(card.loss, 1)}%` }}</span></div>
        <CellStrip :cells="card.lossCells" unit="%" />
      </div>
    </div>

    <div v-if="card.tags.length" class="tags">
      <span v-for="t in card.tags" :key="t" class="tag">{{ t }}</span>
    </div>

    <div v-if="!card.online" class="veil">
      <span class="vname">{{ card.name }}</span>
      <span class="vseal brush">离线</span>
      <span v-if="card.lastSeen" class="mono vtime">最后上报 {{ formatDateTime(card.lastSeen) }}</span>
    </div>
  </article>
</template>

<style scoped>
.node {
  position: relative;
  padding: 14px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 11px;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.node:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}
.row1 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status.on { background: var(--jade); }
.status.off { background: var(--zhu); }
.name {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 900;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.name:hover {
  color: var(--zhu);
}
.star {
  border: 0;
  background: transparent;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  color: var(--sub);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.star.on {
  color: var(--ochre);
}
.star.on :deep(svg) {
  fill: currentColor;
}
.os {
  width: 16px;
  height: 16px;
  object-fit: contain;
}
.flag {
  width: 22px;
  height: 16px;
  object-fit: cover;
  border-radius: 2px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.mark {
  width: 20px;
  height: 20px;
  font-size: 14px;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px;
}
.metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.mhead {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}
.mlabel {
  color: var(--body);
}
.mval {
  font-weight: 600;
}
.mval.crit {
  color: var(--zhu);
}
.msub {
  font-size: 11px;
  color: var(--sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.net {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  font-size: 11px;
  padding: 8px;
  background: var(--inset);
  border-radius: 8px;
  color: var(--body);
}
.col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  white-space: nowrap;
}
.up { color: var(--ochre); }
.down { color: var(--blue); }
.remain { color: var(--lv); }
.lv-ok.remain { color: var(--body); }
.probe {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.phead {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--sub);
  margin-bottom: 4px;
}
.phead .mono {
  color: var(--ink);
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.veil {
  position: absolute;
  inset: 0;
  background: var(--veil);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.vname {
  font-weight: 900;
}
.vseal {
  padding: 2px 14px;
  border: 2px solid var(--zhu);
  color: var(--zhu);
  border-radius: 4px;
  font-size: 24px;
  transform: rotate(-6deg);
}
.vtime {
  font-size: 12px;
  color: var(--sub);
}
</style>
