<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useMonitor } from '@/composables/useMonitor'
import { usePrefs } from '@/composables/usePrefs'
import { toCardView, type CardView, type QuickFilter } from '@/utils/view'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import StatCards from '@/components/home/StatCards.vue'
import SkylineCard from '@/components/home/SkylineCard.vue'
import FilterBar from '@/components/home/FilterBar.vue'
import ServerCard from '@/components/home/ServerCard.vue'
import ServerTable from '@/components/home/ServerTable.vue'

const { state, entries, sysConfig, now, loadServers, startLive, stopLive } = useMonitor()
const prefs = usePrefs()

const group = ref('全部')
const quick = ref('')
const search = ref('')

const cards = computed<CardView[]>(() => entries.value.map((e) => toCardView(e, sysConfig.value, now.value)))

const groups = computed(() => {
  const set = new Set(cards.value.map((c) => c.group).filter(Boolean))
  return ['全部', ...set]
})

const inGroup = computed(() => (group.value === '全部' ? cards.value : cards.value.filter((c) => c.group === group.value)))

const QUICK_DEFS: Array<{ key: string; label: string; dot: string; test: (c: CardView) => boolean }> = [
  { key: 'fav', label: '收藏', dot: 'var(--ochre)', test: (c) => prefs.isFav(c.key) },
  { key: 'offline', label: '离线', dot: 'var(--zhu)', test: (c) => !c.online },
  { key: 'hot', label: '高负载', dot: 'var(--zhu)', test: (c) => c.hot },
  { key: 'expire', label: '即将到期', dot: 'var(--ochre)', test: (c) => c.expiringSoon },
  { key: 'traffic', label: '流量告急', dot: 'var(--blue)', test: (c) => c.trafficAlert }
]

const quicks = computed<QuickFilter[]>(() =>
  QUICK_DEFS.map((q) => ({ key: q.key, label: q.label, dot: q.dot, count: inGroup.value.filter(q.test).length }))
    .filter((q) => q.count > 0 || q.key === quick.value || q.key === 'fav' || q.key === 'offline')
)

const visible = computed(() => {
  const q = QUICK_DEFS.find((d) => d.key === quick.value)
  const term = search.value.trim().toLowerCase()
  return inGroup.value.filter((c) => (!q || q.test(c)) && (!term || c.searchText.includes(term)))
})

async function refresh() {
  await loadServers()
  startLive({ kind: 'home' })
}

onMounted(refresh)
onBeforeUnmount(() => {
  stopLive()
  startLive(null)
})
</script>

<template>
  <main class="page">
    <AppHeader @refresh="refresh" />

    <p v-if="state.needLogin" class="card notice">
      这是非公开站点，请先 <a href="/admin#admin">登录后台</a> 再回到此页。
    </p>

    <section class="overview">
      <StatCards class="stats" :cards="inGroup" :entries="entries" :now="now" />
      <SkylineCard class="sky" :cards="inGroup" />
    </section>

    <FilterBar v-model:group="group" v-model:quick="quick" v-model:search="search" v-model:view="prefs.view.value" :groups="groups" :quicks="quicks" />

    <div v-if="state.loading && !entries.length" class="empty">正在点名诸峰…</div>
    <div v-else-if="!visible.length" class="empty">
      <span class="brush">城头无人</span>
      <span>没有符合条件的节点</span>
    </div>
    <div v-else-if="prefs.view.value === 'card'" class="grid">
      <ServerCard v-for="c in visible" :key="c.key" :card="c" :fav="prefs.isFav(c.key)" @toggle-fav="prefs.toggleFav(c.key)" />
    </div>
    <ServerTable v-else :cards="visible" />

    <AppFooter />
  </main>
</template>

<style scoped>
.page {
  position: relative;
  z-index: 1;
  max-width: 1280px;
  margin: 0 auto;
  padding: 18px 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.notice {
  margin: 0;
  padding: 12px 16px;
  font-size: 14px;
}
.notice a {
  color: var(--zhu);
}
.overview {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: stretch;
}
.stats {
  flex: 1 1 600px;
  min-width: 0;
}
.sky {
  flex: 1 1 420px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 14px;
}
.empty {
  padding: 64px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--sub);
}
.empty .brush {
  font-size: 36px;
  color: var(--ink);
}
@media (max-width: 560px) {
  .page {
    padding: 14px 16px 24px;
  }
}
</style>
