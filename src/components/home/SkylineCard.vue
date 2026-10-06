<script setup lang="ts">
// 城头剑气：一台服务器一段城墙，剑气高度即实时 CPU；离线段垛口崩缺
import { computed } from 'vue'
import type { CardView } from '@/utils/view'

const props = defineProps<{ cards: CardView[] }>()

const WALL = 'M0 118 L4 118 L4 110 L16 110 L16 118 L24 118 L24 110 L36 110 L36 118 L40 118 L40 150 L0 150 Z'
const BROKEN = 'M0 118 L4 118 L4 110 L14 110 L18 124 L22 116 L28 128 L36 114 L36 118 L40 118 L40 150 L0 150 Z'

const segments = computed(() =>
  props.cards.map((c) => {
    const cpu = c.cpu ?? 0
    const h = c.online ? Math.max(6, cpu * 0.98) : 0
    const b = 104
    const tone = !c.online ? 'off' : cpu >= 85 ? 'crit' : cpu >= 60 ? 'warn' : 'ok'
    return {
      key: c.key,
      to: { name: 'server', params: { id: c.id }, query: c.baseIndex ? { b: c.baseIndex } : {} },
      label: `${c.name}，${c.online ? `CPU ${Math.round(cpu)}%` : '离线'}`,
      tone,
      code: c.region || c.name.slice(0, 2),
      text: c.online ? String(Math.round(cpu)) : '断',
      qi: c.online ? `M17 ${b} C13 ${b - h * 0.4} 21 ${b - h * 0.72} 20 ${b - h} C25 ${b - h * 0.66} 27 ${b - h * 0.3} 23 ${b} Z` : '',
      wall: c.online ? WALL : BROKEN
    }
  })
)
</script>

<template>
  <section class="card skyline" aria-label="城头剑气：各节点实时 CPU">
    <div class="head">
      <div class="title">
        <span class="brush name">城头剑气</span>
        <span class="hint">每段一台 · 剑气高度为实时 CPU</span>
      </div>
      <div class="legend">
        <span><i class="tone-ok" />&lt;60</span>
        <span><i class="tone-warn" />60–85</span>
        <span><i class="tone-crit" />&gt;85</span>
      </div>
    </div>
    <div class="wall" :class="{ dense: segments.length > 24 }">
      <router-link v-for="s in segments" :key="s.key" :to="s.to" class="seg" :class="`tone-${s.tone}`" :aria-label="s.label" :title="s.label">
        <span class="num mono">{{ s.text }}</span>
        <svg viewBox="0 0 40 150" preserveAspectRatio="none" aria-hidden="true">
          <path v-if="s.qi" class="qi" :d="s.qi" />
          <template v-if="s.qi">
            <line x1="20" y1="110" x2="20" y2="96" class="sword" />
            <line x1="16" y1="104" x2="24" y2="104" class="sword" />
          </template>
          <path :d="s.wall" class="stone" />
          <line x1="0" y1="128" x2="40" y2="128" class="mortar" />
          <line x1="0.5" y1="118" x2="0.5" y2="150" class="mortar" />
        </svg>
        <span class="code">{{ s.code }}</span>
      </router-link>
    </div>
  </section>
</template>

<style scoped>
.skyline {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.title {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.name {
  font-size: 24px;
  line-height: 1;
}
.hint {
  font-size: 12px;
  color: var(--sub);
}
.legend {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--sub);
}
.legend span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.legend i {
  width: 8px;
  height: 8px;
  border-radius: 1px;
  background: var(--tone);
}
.wall {
  flex: 1;
  display: flex;
  align-items: flex-end;
  min-height: 160px;
  overflow-x: auto;
}
.seg {
  flex: 1 0 22px;
  min-width: 22px;
  display: flex;
  flex-direction: column;
  text-decoration: none;
}
.wall.dense .num {
  visibility: hidden;
}
.num {
  height: 14px;
  font-size: 10px;
  text-align: center;
  color: var(--sub);
}
.tone-warn .num,
.tone-crit .num,
.tone-off .num {
  color: var(--tone);
}
svg {
  width: 100%;
  height: 140px;
  display: block;
}
.qi {
  fill: var(--tone);
  opacity: 0.88;
  transition: d 0.5s ease;
}
.sword {
  stroke: var(--sword);
  stroke-width: 1.4;
}
.stone {
  fill: var(--wall);
}
.tone-off .stone {
  opacity: 0.7;
}
.mortar {
  stroke: var(--mortar);
}
.code {
  padding-top: 4px;
  font-size: 10px;
  text-align: center;
  color: var(--sub);
  white-space: nowrap;
  overflow: hidden;
}
.tone-off .code {
  color: var(--zhu);
}
.seg:hover .stone {
  fill: var(--ochre);
}
.tone-ok { --tone: var(--qi-low); }
.tone-warn { --tone: var(--ochre); }
.tone-crit { --tone: var(--zhu); }
.tone-off { --tone: var(--zhu); }
</style>
