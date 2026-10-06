// 开发用演示后端：MOCK=1 npm run dev 时启用，返回与 CFSM 公开接口同形状的数据
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const NOW = () => Date.now()
const MB = 1
const GB = 1024 * MB
const BYTES_GB = 1024 ** 3

interface Seed {
  id: string
  name: string
  region: string
  group: string
  os: string
  arch: string
  cpuInfo: string
  cores: number
  online: boolean
  days: number
  price: string
  currency: string
  cycle: string
  expireIn: number
  auto: boolean
  cpu: number
  ram: [number, number]
  disk: [number, number]
  tf: [number, number]
  tags: string
  ping: number
  loss: number
}

const SEEDS: Seed[] = [
  { id: 'hk-01', name: '香港 HK-01', region: 'HK', group: '亚洲', os: 'Debian 12', arch: 'x86_64', cpuInfo: 'AMD EPYC 7B13', cores: 2, online: true, days: 63, price: '30', currency: '¥', cycle: 'month', expireIn: 86, auto: true, cpu: 32, ram: [3.5, 8], disk: [32, 160], tf: [240, 1000], tags: '生产,高可用', ping: 33, loss: 0.5 },
  { id: 'hk-edge', name: '香港 HK-Edge', region: 'HK', group: '亚洲', os: 'Ubuntu 24.04', arch: 'x86_64', cpuInfo: 'Intel Xeon Gold 6148', cores: 2, online: true, days: 7, price: '18', currency: '¥', cycle: 'year', expireIn: 10, auto: false, cpu: 82, ram: [2.2, 8], disk: [47, 160], tf: [290, 2000], tags: '边缘,IPv6', ping: 37, loss: 6.3 },
  { id: 'tyo-lite', name: '东京 TYO-Lite', region: 'JP', group: '亚洲', os: 'Debian 12', arch: 'x86_64', cpuInfo: 'AMD EPYC 7763', cores: 2, online: true, days: 214, price: '5', currency: '$', cycle: 'month', expireIn: 147, auto: true, cpu: 67, ram: [5.8, 8], disk: [93, 160], tf: [410, 1000], tags: '生产', ping: 58, loss: 0.2 },
  { id: 'sg-edge', name: '新加坡 SG-Edge', region: 'SG', group: '亚洲', os: 'Alpine Linux 3.20', arch: 'aarch64', cpuInfo: 'Ampere Altra', cores: 4, online: true, days: 9, price: '7', currency: '$', cycle: 'month', expireIn: 40, auto: false, cpu: 91, ram: [7, 8], disk: [44, 100], tf: [612, 1000], tags: '边缘,arm64', ping: 79, loss: 0.8 },
  { id: 'sel-game', name: '首尔 SEL-Game', region: 'KR', group: '亚洲', os: 'Ubuntu 24.04', arch: 'x86_64', cpuInfo: 'Intel Xeon E-2288G', cores: 4, online: true, days: 38, price: '45', currency: '¥', cycle: 'month', expireIn: 94, auto: true, cpu: 54, ram: [9.8, 16], disk: [80, 200], tf: [330, 1000], tags: '游戏', ping: 52, loss: 0 },
  { id: 'lax-main', name: '洛杉矶 LAX-Main', region: 'US', group: '北美', os: 'Ubuntu 24.04', arch: 'x86_64', cpuInfo: 'AMD EPYC 9654', cores: 4, online: true, days: 820, price: '10', currency: '$', cycle: 'month', expireIn: 267, auto: true, cpu: 12, ram: [2.7, 8], disk: [35, 160], tf: [540, 2000], tags: '生产,Anycast', ping: 158, loss: 0.3 },
  { id: 'sjc-lab', name: '圣何塞 SJC-Lab', region: 'US', group: '北美', os: 'Debian 12', arch: 'x86_64', cpuInfo: 'Intel Xeon E5-2680 v4', cores: 2, online: true, days: 120, price: '6', currency: '$', cycle: 'month', expireIn: 57, auto: false, cpu: 31, ram: [1.6, 4], disk: [53, 80], tf: [880, 1000], tags: '测试', ping: 162, loss: 1.2 },
  { id: 'nyc-proxy', name: '纽约 NYC-Proxy', region: 'US', group: '北美', os: 'Rocky Linux 9', arch: 'x86_64', cpuInfo: 'AMD EPYC 7543', cores: 1, online: true, days: 3, price: '4', currency: '$', cycle: 'month', expireIn: 5, auto: false, cpu: 22, ram: [0.6, 2], disk: [7, 40], tf: [60, 500], tags: '代理', ping: 211, loss: 2.4 },
  { id: 'fra-backup', name: '法兰克福 FRA-Backup', region: 'DE', group: '欧洲', os: 'Debian 12', arch: 'x86_64', cpuInfo: 'Intel Xeon Silver 4214', cores: 2, online: false, days: 0, price: '4', currency: '€', cycle: 'month', expireIn: 14, auto: false, cpu: 0, ram: [0, 4], disk: [50, 80], tf: [90, 1000], tags: '备份', ping: 0, loss: 0 },
  { id: 'ams-relay', name: '阿姆斯特丹 AMS-Relay', region: 'NL', group: '欧洲', os: 'Rocky Linux 9', arch: 'x86_64', cpuInfo: 'AMD Ryzen 9 5950X', cores: 2, online: true, days: 140, price: '0', currency: '', cycle: 'month', expireIn: 0, auto: false, cpu: 38, ram: [2, 4], disk: [28, 40], tf: [470, 1000], tags: '中转', ping: 205, loss: 0.4 },
  { id: 'lon-web', name: '伦敦 LON-Web', region: 'GB', group: '欧洲', os: 'Ubuntu 22.04', arch: 'x86_64', cpuInfo: 'Intel Xeon Platinum 8259CL', cores: 1, online: true, days: 45, price: '3', currency: '£', cycle: 'month', expireIn: 70, auto: true, cpu: 18, ram: [1, 2], disk: [14, 40], tf: [100, 500], tags: '网站', ping: 196, loss: 0.1 },
  { id: 'par-node', name: '巴黎 PAR-Node', region: 'FR', group: '欧洲', os: 'Debian 12', arch: 'x86_64', cpuInfo: 'AMD EPYC 7282', cores: 4, online: true, days: 300, price: '5', currency: '€', cycle: 'month', expireIn: 120, auto: true, cpu: 44, ram: [4.6, 8], disk: [77, 160], tf: [380, 1000], tags: '生产', ping: 210, loss: 0.6 }
]

const rnd = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

const dateIn = (days: number) => new Date(NOW() + days * 86_400_000).toISOString().slice(0, 10)

function wobble(seed: Seed, t: number) {
  const k = seed.id.length + seed.cpu
  return Math.sin(t / 60_000 + k) * 0.08 + (rnd(Math.floor(t / 5000) + k) - 0.5) * 0.06
}

function server(seed: Seed, t = NOW()) {
  const w = wobble(seed, t)
  const on = seed.online
  const cpu = on ? Math.max(1, Math.min(99, seed.cpu * (1 + w))) : 0
  const ram = on ? seed.ram[0] * (1 + w / 3) : 0
  const ping = (k: number) => (on ? +(seed.ping * (1 + (rnd(k + t / 360_000) - 0.5) * 0.2)).toFixed(1) : false)
  const window = Array.from({ length: 20 }, (_, i) => {
    const ts = t - (19 - i) * 360_000
    const spike = rnd(i + seed.cpu) > 0.92 ? 2.2 : 1
    return {
      ts,
      ct: on ? +(seed.ping * spike * (1 + (rnd(i * 7 + seed.ping) - 0.5) * 0.15)).toFixed(1) : false,
      cu: on ? (rnd(i * 3 + seed.loss) > 0.97 ? null : +(seed.ping * 1.1).toFixed(1)) : false,
      cm: on ? +(seed.ping * 0.9).toFixed(1) : false,
      bd: false
    }
  })
  const lossWindow = window.map((p, i) => ({
    ts: p.ts,
    ct: on ? +(seed.loss * rnd(i * 11 + seed.cpu) * 2).toFixed(1) : false,
    cu: on ? +(seed.loss * rnd(i * 13 + seed.cpu) * 2).toFixed(1) : false,
    cm: on ? 0 : false,
    bd: false
  }))
  const tfUsed = seed.tf[0] * BYTES_GB
  return {
    id: seed.id,
    name: seed.name,
    server_group: seed.group,
    tags: seed.tags,
    price: seed.price,
    billing_cycle: seed.cycle,
    auto_renewal: seed.auto ? '1' : '0',
    currency: seed.currency,
    expire_date: seed.expireIn ? dateIn(seed.expireIn) : '',
    traffic_limit: String(seed.tf[1]),
    traffic_calc_type: 'total',
    reset_day: 1,
    report_interval: 60,
    wss_report_interval: 2,
    is_hidden: '0',
    cpu: +cpu.toFixed(1),
    load_avg: on ? `${(cpu / 30).toFixed(2)} ${(cpu / 32).toFixed(2)} ${(cpu / 35).toFixed(2)}` : '',
    net_in_speed: on ? Math.round((seed.cpu / 10) * 1024 * 1024 * (1 + w)) : 0,
    net_out_speed: on ? Math.round((seed.cpu / 20) * 1024 * 1024 * (1 + w)) : 0,
    net_rx: tfUsed * 0.7 * 3,
    net_tx: tfUsed * 0.3 * 3,
    net_rx_monthly: tfUsed * 0.7,
    net_tx_monthly: tfUsed * 0.3,
    processes: on ? 120 + seed.cpu * 2 : 0,
    tcp_conn: on ? 40 + seed.cpu * 18 : 0,
    udp_conn: on ? 4 + Math.round(seed.cpu / 6) : 0,
    ping_ct: ping(1), ping_cu: ping(2), ping_cm: ping(3), ping_bd: false,
    loss_ct: on ? seed.loss : false, loss_cu: on ? seed.loss : false, loss_cm: on ? 0 : false, loss_bd: false,
    ping: window,
    loss: lossWindow,
    ram_total: seed.ram[1] * GB,
    ram_used: Math.round(ram * GB),
    swap_total: GB,
    swap_used: on ? 64 : 0,
    disk_total: seed.disk[1] * GB,
    disk_used: seed.disk[0] * GB,
    disk: on ? { read_bps: 4096 * seed.cpu, write_bps: 2048 * seed.cpu, read_iops: 12, write_iops: 8, await_ms: 1.5, util: seed.cpu / 10 } : undefined,
    cpu_cores: seed.cores,
    cpu_info: seed.cpuInfo,
    gpu_info: '[]',
    arch: seed.arch,
    os: seed.os,
    kernel_version: '6.8.0-36-generic',
    region: seed.region,
    ip_v4: '1',
    ip_v6: seed.tags.includes('IPv6') ? '1' : '0',
    boot_time: String(t - seed.days * 86_400_000 - 3_600_000),
    agent_version: '1.3.3',
    last_updated: on ? t - 2000 : t - 2 * 3_600_000,
    timestamp: on ? t - 2000 : t - 2 * 3_600_000
  }
}

function history(seed: Seed, hours: number) {
  const points = 120
  const t = NOW()
  const step = (hours * 3_600_000) / points
  const rows = []
  for (let i = 0; i < points; i += 1) {
    const ts = t - (points - i) * step
    if (!seed.online && ts > t - 2 * 3_600_000) continue
    // 模拟一段上报中断，验证断点
    if (i > 70 && i < 75) continue
    const s = server({ ...seed, online: true }, ts)
    const trend = i / points
    rows.push({
      timestamp: ts,
      cpu: +(seed.cpu * (0.7 + trend * 0.4) * (1 + wobble(seed, ts) * 3)).toFixed(1),
      ram_total: s.ram_total,
      ram_used: Math.round(s.ram_used * (0.85 + trend * 0.2)),
      swap_total: s.swap_total,
      swap_used: 64,
      disk_total: s.disk_total,
      disk_used: s.disk_used - (1 - trend) * 2 * GB,
      net_in_speed: s.net_in_speed,
      net_out_speed: s.net_out_speed,
      tcp_conn: s.tcp_conn,
      udp_conn: s.udp_conn,
      processes: s.processes,
      load_avg: s.load_avg,
      ping_ct: rnd(i) > 0.97 ? seed.ping * 3 : +(seed.ping * (1 + (rnd(i * 5) - 0.5) * 0.2)).toFixed(1),
      ping_cu: rnd(i * 2) > 0.98 ? null : +(seed.ping * 1.1 * (1 + (rnd(i * 6) - 0.5) * 0.3)).toFixed(1),
      ping_cm: +(seed.ping * 0.9).toFixed(1),
      ping_bd: false,
      loss_ct: +(seed.loss * rnd(i * 9) * 2).toFixed(1),
      loss_cu: +(seed.loss * rnd(i * 4) * 2).toFixed(1),
      loss_cm: 0,
      loss_bd: false,
      disk: s.disk,
      kernel_version: s.kernel_version
    })
  }
  return rows
}

function sendJson(res: import('node:http').ServerResponse, data: unknown, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export function mockApi(cfsmPublicDir?: string): Plugin {
  return {
    name: 'cfsm-mock-api',
    configureServer(dev) {
      dev.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost')
        const p = url.pathname
        if (cfsmPublicDir && (p.startsWith('/flags/') || p.startsWith('/os-icons/'))) {
          const file = path.join(cfsmPublicDir, path.normalize(p).replace(/^(\.\.[/\\])+/, ''))
          if (file.startsWith(cfsmPublicDir) && fs.existsSync(file)) {
            res.setHeader('Content-Type', file.endsWith('.svg') ? 'image/svg+xml' : 'image/' + path.extname(file).slice(1))
            fs.createReadStream(file).pipe(res)
            return
          }
        }
        if (p === '/api/config') {
          return sendJson(res, {
            version: '2.8.6 Mock', is_public: true, authorization: true, turnstile_enabled: false, turnstile_login_enabled: false,
            turnstile_site_key: '', custom_ct_name: '电信', custom_cu_name: '联通', custom_cm_name: '移动', custom_bd_name: 'BGP',
            site_title: '落魄山 · 观天台', preferred_theme: 'auto', default_language: 'zh', theme_options: {}, verified: false,
            turnstile_verified: null, frontend_ws_timeout_minutes: 0, long_history_points: 120, latency_window: { points: 20, hours: 2 }
          })
        }
        if (p === '/api/servers') {
          const servers = SEEDS.map((s) => server(s))
          return sendJson(res, {
            servers,
            stats: { total: servers.length, online: SEEDS.filter((s) => s.online).length, offline: SEEDS.filter((s) => !s.online).length, globalSpeedIn: 0, globalSpeedOut: 0, globalNetTx: 0, globalNetRx: 0 },
            regionStats: {},
            sysConfig: { show_price: true, show_expire: true, show_tf: true, show_three_net_details: true, custom_ct_name: '电信', custom_cu_name: '联通', custom_cm_name: '移动', custom_bd_name: 'BGP' }
          })
        }
        if (p === '/api/server') {
          const seed = SEEDS.find((s) => s.id === url.searchParams.get('id'))
          if (!seed) return sendJson(res, { error: 'Server not found' }, 404)
          const s = server(seed)
          const { ping: _p, loss: _l, ...rest } = s
          void _p
          void _l
          const samples = Array.from({ length: 30 }, (_, i) => {
            const ts = NOW() - (30 - i) * 2000
            const x = server(seed, ts)
            return { ts, data: { cpu: x.cpu, ram_total: x.ram_total, ram_used: x.ram_used, swap_total: x.swap_total, swap_used: x.swap_used, net_in_speed: x.net_in_speed, net_out_speed: x.net_out_speed } }
          })
          return sendJson(res, { ...rest, latestReportUpdates: seed.online ? [{ serverId: seed.id, reportTs: NOW(), samples }] : [], sysConfig: { long_history_points: 120 } })
        }
        if (p === '/api/history/all') {
          const seed = SEEDS.find((s) => s.id === url.searchParams.get('id'))
          if (!seed) return sendJson(res, { error: 'Server not found' }, 404)
          return sendJson(res, history(seed, Number(url.searchParams.get('hours')) || 24))
        }
        next()
      })
    }
  }
}
