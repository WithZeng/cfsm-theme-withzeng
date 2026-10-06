<script setup lang="ts">
// 轻量 SVG 折线图：缺失值断开不补零；悬停显示竖线与读数
import { computed, ref } from 'vue'
import { formatClock } from '@/utils/format'
import type { ChartSeries } from '@/utils/history'

const props = defineProps<{
  ts: number[]
  series: ChartSeries[]
  format: (v: number) => string
  formatRight?: (v: number) => string
  max?: number
  rightMax?: number
  /** 参考线（如 85% 告警线、总量） */
  refLine?: { value: number; color: string }
  height?: number
  withDate?: boolean
}>()

const W = 600
const H = props.height || 150
const PAD_T = 6
const PAD_B = 4
const hover = ref<number | null>(null)
const box = ref<HTMLElement | null>(null)

const niceMax = (v: number) => {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}

const maxOf = (right: boolean) => {
  const vals = props.series.filter((s) => !!s.right === right).flatMap((s) => s.values.filter((v): v is number => v !== null))
  if (props.refLine && !right) vals.push(props.refLine.value)
  return niceMax(Math.max(0, ...vals) * 1.08)
}

const leftMax = computed(() => props.max ?? maxOf(false))
const rightMax = computed(() => props.rightMax ?? maxOf(true))
const hasRight = computed(() => props.series.some((s) => s.right))

const n = computed(() => props.ts.length)
const t0 = computed(() => props.ts[0] ?? 0)
const span = computed(() => Math.max(1, (props.ts[n.value - 1] ?? 0) - t0.value))
// 横轴按真实时间排布，上报中断的时段自然空出来
const xAt = (i: number) => (n.value <= 1 ? W / 2 : ((props.ts[i] - t0.value) / span.value) * W)
/** 相邻两点间隔超过中位步长 3 倍视为断档 */
const gapAfter = computed(() => {
  const steps = props.ts.slice(1).map((t, i) => t - props.ts[i]).sort((a, b) => a - b)
  const median = steps[Math.floor(steps.length / 2)] || 0
  return (i: number) => median > 0 && i + 1 < n.value && props.ts[i + 1] - props.ts[i] > median * 3
})
const yAt = (v: number, right = false) => {
  const m = right ? rightMax.value : leftMax.value
  return PAD_T + (1 - Math.min(v, m) / m) * (H - PAD_T - PAD_B)
}

const paths = computed(() =>
  props.series.map((s) => {
    const segs: string[] = []
    const areas: string[] = []
    let cur: Array<[number, number]> = []
    const flush = () => {
      if (cur.length) {
        segs.push(cur.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' '))
        if (s.area && cur.length > 1) {
          const base = (H - PAD_B).toFixed(1)
          areas.push(`M${cur[0][0].toFixed(1)} ${base} ${cur.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')} L${cur[cur.length - 1][0].toFixed(1)} ${base} Z`)
        }
      }
      cur = []
    }
    s.values.forEach((v, i) => {
      if (v === null || !Number.isFinite(v)) flush()
      else {
        cur.push([xAt(i), yAt(v, s.right)])
        if (gapAfter.value(i)) flush()
      }
    })
    flush()
    return { ...s, line: segs.join(' '), area: areas.join(' ') }
  })
)

const ticks = computed(() => {
  if (n.value < 2) return []
  return [0, 0.25, 0.5, 0.75, 1].map((f) => formatClock(t0.value + f * span.value, props.withDate))
})

function onMove(ev: PointerEvent) {
  const el = box.value
  if (!el || n.value === 0) return
  const r = el.getBoundingClientRect()
  const target = t0.value + Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * span.value
  let best = 0
  for (let i = 1; i < n.value; i += 1) if (Math.abs(props.ts[i] - target) < Math.abs(props.ts[best] - target)) best = i
  hover.value = best
}

const tip = computed(() => {
  if (hover.value === null) return null
  const i = hover.value
  return {
    left: `${(xAt(i) / W) * 100}%`,
    flip: xAt(i) > W * 0.6,
    time: formatClock(props.ts[i], props.withDate),
    rows: props.series.map((s) => ({
      name: s.name,
      color: s.color,
      text: s.values[i] === null || s.values[i] === undefined ? '—' : (s.right && props.formatRight ? props.formatRight : props.format)(s.values[i] as number)
    }))
  }
})
</script>

<template>
  <div class="chart">
    <div class="axis mono">
      <span>{{ format(leftMax) }}</span>
      <span>{{ format(leftMax / 2) }}</span>
      <span>0</span>
    </div>
    <div ref="box" class="plot" @pointermove="onMove" @pointerleave="hover = null">
      <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" :style="{ height: `${H}px` }" aria-hidden="true">
        <line :x1="0" :x2="W" :y1="PAD_T" :y2="PAD_T" class="grid" />
        <line :x1="0" :x2="W" :y1="(H + PAD_T - PAD_B) / 2" :y2="(H + PAD_T - PAD_B) / 2" class="grid dash" />
        <line :x1="0" :x2="W" :y1="H - PAD_B" :y2="H - PAD_B" class="grid" />
        <line v-if="refLine" :x1="0" :x2="W" :y1="yAt(refLine.value)" :y2="yAt(refLine.value)" class="ref" :style="{ stroke: refLine.color }" />
        <template v-for="p in paths" :key="p.name">
          <path v-if="p.area" :d="p.area" :style="{ fill: p.color }" class="area" />
          <path :d="p.line" :style="{ stroke: p.color }" class="line" :class="{ dashed: p.dashed }" />
        </template>
        <line v-if="hover !== null" :x1="xAt(hover)" :x2="xAt(hover)" :y1="0" :y2="H" class="cursor" />
      </svg>
      <div v-if="tip" class="tip" :class="{ flip: tip.flip }" :style="{ left: tip.left }">
        <div class="tip-time mono">{{ tip.time }}</div>
        <div v-for="r in tip.rows" :key="r.name" class="tip-row">
          <span class="sw" :style="{ background: r.color }" />{{ r.name }}<span class="mono v">{{ r.text }}</span>
        </div>
      </div>
      <div v-if="ticks.length" class="ticks mono">
        <span v-for="(t, i) in ticks" :key="i">{{ t }}</span>
      </div>
      <div v-else class="nodata">暂无数据</div>
    </div>
    <div v-if="hasRight && formatRight" class="axis right mono">
      <span>{{ formatRight(rightMax) }}</span>
      <span>{{ formatRight(rightMax / 2) }}</span>
      <span>0</span>
    </div>
  </div>
</template>

<style scoped>
.chart {
  display: flex;
  gap: 6px;
}
.axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 52px;
  flex-shrink: 0;
  font-size: 10px;
  color: var(--sub);
  text-align: right;
  padding-bottom: 18px;
}
.axis.right {
  text-align: left;
  width: 34px;
}
.plot {
  position: relative;
  flex: 1;
  min-width: 0;
  touch-action: pan-y;
}
svg {
  width: 100%;
  display: block;
  overflow: visible;
}
.grid {
  stroke: var(--grid);
  vector-effect: non-scaling-stroke;
}
.dash,
.ref {
  stroke-dasharray: 3 5;
}
.ref {
  vector-effect: non-scaling-stroke;
  opacity: 0.7;
}
.area {
  opacity: 0.12;
}
.line {
  fill: none;
  stroke-width: 1.8;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}
.line.dashed {
  stroke-dasharray: 4 4;
}
.cursor {
  stroke: var(--sub);
  stroke-dasharray: 2 3;
  vector-effect: non-scaling-stroke;
}
.ticks {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--sub);
  padding-top: 4px;
  height: 18px;
}
.nodata {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--sub);
}
.tip {
  position: absolute;
  top: 4px;
  transform: translateX(10px);
  padding: 8px 10px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: var(--shadow);
  font-size: 12px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 2;
}
.tip.flip {
  transform: translateX(calc(-100% - 10px));
}
.tip-time {
  color: var(--sub);
  margin-bottom: 4px;
}
.tip-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.sw {
  width: 8px;
  height: 3px;
  border-radius: 1px;
}
.v {
  margin-left: auto;
  padding-left: 12px;
}
</style>
