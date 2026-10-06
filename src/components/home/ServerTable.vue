<script setup lang="ts">
import type { CardView } from '@/utils/view'
import { trimFixed } from '@/utils/format'
import BrushBar from '../BrushBar.vue'

defineProps<{ cards: CardView[] }>()
const to = (c: CardView) => ({ name: 'server', params: { id: c.id }, query: c.baseIndex ? { b: c.baseIndex } : {} })
</script>

<template>
  <div class="card wrap">
    <table>
      <thead>
        <tr>
          <th>节点</th>
          <th v-for="h in ['CPU', '内存', '硬盘', '流量']" :key="h" class="bar-col">{{ h }}</th>
          <th>网速 ↑ / ↓</th>
          <th>延迟 · 丢包</th>
          <th>到期</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in cards" :key="c.key" :class="{ off: !c.online }">
          <td>
            <div class="node">
              <span class="status" :class="c.online ? 'on' : 'off'" />
              <img v-if="c.flag" :src="`/flags/${c.flag}.svg`" :alt="c.region" class="flag" loading="lazy" />
              <router-link :to="to(c)" class="name">{{ c.name }}</router-link>
              <span class="sub">{{ c.online ? `在线 ${c.uptimeDays ?? '—'} 天` : '离线' }}</span>
              <span v-if="c.carve" class="seal mark">{{ c.carve }}</span>
            </div>
          </td>
          <td v-for="m in c.metrics" :key="m.key">
            <div class="m">
              <BrushBar :pct="m.pct" :level="m.level" class="mbar" />
              <span class="mono val" :class="{ crit: m.level === 'crit' }">{{ m.text }}</span>
            </div>
          </td>
          <td v-if="c.metrics.length < 4" />
          <td class="mono"><span class="up">{{ c.up }}</span> / <span class="down">{{ c.down }}</span></td>
          <td class="mono">{{ c.ping === null ? '—' : `${trimFixed(c.ping, 1)}ms` }} · {{ c.loss === null ? '—' : `${trimFixed(c.loss, 1)}%` }}</td>
          <td :class="`lv-${c.remainLevel}`" class="remain">{{ c.daysLeft === null ? '长期' : c.daysLeft > 0 ? `${c.daysLeft} 天` : '已到期' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.wrap {
  overflow-x: auto;
}
table {
  width: 100%;
  min-width: 1040px;
  border-collapse: collapse;
  font-size: 13px;
}
th {
  text-align: left;
  font-weight: 500;
  font-size: 12px;
  color: var(--sub);
  padding: 12px 10px;
  border-bottom: 1px solid var(--line);
}
th:first-child,
td:first-child {
  padding-left: 16px;
}
td {
  padding: 10px;
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
}
tr:last-child td {
  border-bottom: 0;
}
tr.off {
  opacity: 0.55;
}
.bar-col {
  width: 130px;
}
.node {
  display: flex;
  align-items: center;
  gap: 8px;
}
.status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status.on { background: var(--jade); }
.status.off { background: var(--zhu); }
.flag {
  width: 20px;
  height: 14px;
  object-fit: cover;
  border-radius: 2px;
}
.name {
  font-weight: 900;
  text-decoration: none;
}
.name:hover {
  color: var(--zhu);
}
.sub {
  font-size: 11px;
  color: var(--sub);
}
.mark {
  width: 18px;
  height: 18px;
  font-size: 12px;
}
.m {
  display: flex;
  align-items: center;
  gap: 6px;
}
.mbar {
  flex: 1;
}
.val {
  width: 48px;
  text-align: right;
}
.val.crit {
  color: var(--zhu);
}
.up { color: var(--ochre); }
.down { color: var(--blue); }
.remain { color: var(--lv); }
.lv-ok.remain { color: var(--body); }
</style>
