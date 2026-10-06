<script setup lang="ts">
import { computed } from 'vue'
import type { CardView } from '@/utils/view'
import type { ServerEntry } from '@/composables/useMonitor'
import { compactSpeed, formatBytes, formatMB, toNumber, trimFixed } from '@/utils/format'
import { isOnline, trafficUsed } from '@/utils/server'
import BrushBar from '../BrushBar.vue'

const props = defineProps<{ cards: CardView[]; entries: ServerEntry[]; now: number }>()

const sum = (list: ServerEntry[], f: (e: ServerEntry) => number) => list.reduce((a, e) => a + f(e), 0)

const stats = computed(() => {
  const online = props.entries.filter((e) => isOnline(e.server, props.now))
  const cpus = props.cards.map((c) => c.cpu).filter((v): v is number => v !== null)
  const avgCpu = cpus.length ? cpus.reduce((a, b) => a + b, 0) / cpus.length : null
  const ramUsed = sum(online, (e) => toNumber(e.server.ram_used) ?? 0)
  const ramTotal = sum(online, (e) => toNumber(e.server.ram_total) ?? 0)
  const diskUsed = sum(props.entries, (e) => toNumber(e.server.disk_used) ?? 0)
  const diskTotal = sum(props.entries, (e) => toNumber(e.server.disk_total) ?? 0)
  const up = sum(online, (e) => toNumber(e.server.net_out_speed) ?? 0)
  const down = sum(online, (e) => toNumber(e.server.net_in_speed) ?? 0)
  const monthly = sum(props.entries, (e) => trafficUsed(e.server))
  const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null)
  const split = (text: string) => {
    const i = text.lastIndexOf(' ')
    return i > 0 ? [text.slice(0, i), text.slice(i + 1)] : [text, '']
  }
  const [ramV, ramU] = split(formatMB(ramUsed))
  const [diskV, diskU] = split(formatMB(diskUsed))
  const [monV, monU] = split(formatBytes(monthly, 2))
  return [
    { label: '在线节点', value: String(online.length), unit: `/ ${props.entries.length}`, pct: pct(online.length, props.entries.length), dot: 'var(--jade)' },
    { label: '平均 CPU', value: avgCpu === null ? '—' : trimFixed(avgCpu, 1), unit: '%', pct: avgCpu, dot: 'var(--ochre)' },
    { label: '内存用量', value: ramV, unit: `${ramU} / ${formatMB(ramTotal)}`, pct: pct(ramUsed, ramTotal), dot: 'var(--blue)' },
    { label: '硬盘用量', value: diskV, unit: `${diskU} / ${formatMB(diskTotal)}`, pct: pct(diskUsed, diskTotal), dot: 'var(--blue)' },
    { label: '实时上行 / 下行', value: `${compactSpeed(up)} / ${compactSpeed(down)}`, unit: 'B/s', pct: null, dot: 'var(--ochre)' },
    { label: '本月流量', value: monV, unit: monU, pct: null, dot: 'var(--jade)' }
  ]
})
</script>

<template>
  <div class="stats">
    <div v-for="s in stats" :key="s.label" class="card stat">
      <div class="label">
        <span>{{ s.label }}</span>
        <span class="dot" :style="{ background: s.dot }" />
      </div>
      <div class="value">
        <span class="mono num">{{ s.value }}</span>
        <span class="unit">{{ s.unit }}</span>
      </div>
      <BrushBar v-if="s.pct !== null" :pct="s.pct" :height="6" color="var(--ink)" />
    </div>
  </div>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.stat {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--sub);
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 1px;
  transform: rotate(45deg);
}
.value {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}
.num {
  font-size: 26px;
  font-weight: 600;
  white-space: nowrap;
}
.unit {
  font-size: 12px;
  color: var(--sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
