<script setup lang="ts">
import { useMonitor } from '@/composables/useMonitor'

const { state, config, resumeLive } = useMonitor()
</script>

<template>
  <div v-if="state.liveTimedOut" class="backdrop" role="dialog" aria-modal="true" aria-labelledby="jl-timeout-title">
    <div class="card dialog">
      <h2 id="jl-timeout-title" class="brush">实时连接已暂停</h2>
      <p>已连续实时订阅 {{ config?.frontend_ws_timeout_minutes }} 分钟，为节省额度已自动断开。页面保留最后一次数据。</p>
      <div class="actions">
        <button type="button" class="primary" @click="resumeLive">继续实时更新</button>
        <button type="button" @click="state.liveTimedOut = false">保持静态</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 50;
}
.dialog {
  max-width: 420px;
  padding: 22px;
  box-shadow: var(--shadow);
}
h2 {
  margin: 0 0 8px;
  font-size: 28px;
}
p {
  margin: 0 0 18px;
  color: var(--body);
  line-height: 1.7;
  font-size: 14px;
}
.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
button {
  min-height: 40px;
  padding: 0 16px;
  border-radius: 20px;
  border: 1px solid var(--line);
  background: transparent;
  cursor: pointer;
}
.primary {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}
</style>
