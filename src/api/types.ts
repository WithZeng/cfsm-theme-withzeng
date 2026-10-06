// CFSM 公开接口的数据形状，字段含义见 CF-Server-Monitor/theme-develop.md

/** false：节点未配置/未上报；null：本轮探测超时；数字：有效值（0 也有效） */
export type ProbeValue = number | null | false

export interface LatencyWindowPoint {
  ts: number
  ct?: ProbeValue
  cu?: ProbeValue
  cm?: ProbeValue
  bd?: ProbeValue
}

export interface DiskIo {
  read_bps: number
  write_bps: number
  read_iops: number
  write_iops: number
  await_ms: number
  util: number
}

export interface GpuInfo {
  id: string
  name: string
  info: number | null
}

export interface Server {
  id: string
  name: string
  server_group?: string
  tags?: string
  price?: string
  billing_cycle?: string
  auto_renewal?: string
  currency?: string
  expire_date?: string
  traffic_limit?: string
  traffic_calc_type?: string
  reset_day?: number
  report_interval?: number
  wss_report_interval?: number
  is_hidden?: '0' | '1'
  sort_order?: number
  cpu?: number
  load_avg?: string
  net_in_speed?: number
  net_out_speed?: number
  net_rx?: number
  net_tx?: number
  net_rx_monthly?: number
  net_tx_monthly?: number
  processes?: number
  tcp_conn?: number
  udp_conn?: number
  ping_ct?: ProbeValue
  ping_cu?: ProbeValue
  ping_cm?: ProbeValue
  ping_bd?: ProbeValue
  loss_ct?: ProbeValue
  loss_cu?: ProbeValue
  loss_cm?: ProbeValue
  loss_bd?: ProbeValue
  ping?: LatencyWindowPoint[]
  loss?: LatencyWindowPoint[]
  /** MB */
  ram_total?: number
  ram_used?: number
  swap_total?: number
  swap_used?: number
  disk_total?: number
  disk_used?: number
  disk?: DiskIo
  cpu_cores?: number
  cpu_info?: string
  gpu_info?: GpuInfo[] | string
  arch?: string
  os?: string
  kernel_version?: string
  region?: string
  ip_v4?: string
  ip_v6?: string
  boot_time?: string | number
  agent_version?: string
  last_updated?: number
  timestamp?: number
  report_timestamp?: number
  latestReportUpdates?: ReportUpdate[]
  [key: string]: unknown
}

export interface ReportUpdate {
  serverId: string
  reportTs?: number
  samples: Array<{ ts: number; data?: Partial<Server> }>
}

export interface SysConfig {
  show_price?: boolean
  show_expire?: boolean
  show_tf?: boolean
  show_three_net_details?: boolean
  custom_ct_name?: string
  custom_cu_name?: string
  custom_cm_name?: string
  custom_bd_name?: string
  long_history_points?: number
}

export interface ServersResponse {
  servers: Server[]
  stats?: {
    total: number
    online: number
    offline: number
    globalSpeedIn: number
    globalSpeedOut: number
    globalNetTx: number
    globalNetRx: number
  }
  regionStats?: Record<string, number>
  sysConfig?: SysConfig
  latestReportUpdates?: ReportUpdate[]
}

export interface SiteConfig {
  version: string
  last_workers_version?: string | null
  last_agent_version?: string | null
  is_public: boolean
  authorization: boolean
  turnstile_enabled: boolean
  turnstile_login_enabled?: boolean
  turnstile_site_key: string
  custom_ct_name?: string
  custom_cu_name?: string
  custom_cm_name?: string
  custom_bd_name?: string
  site_title?: string
  preferred_theme?: 'auto' | 'dark' | 'light'
  default_language?: string
  theme_options?: Record<string, unknown>
  verified?: boolean
  turnstile_verified?: string | null
  frontend_ws_timeout_minutes?: number
  long_history_points?: number
  latency_window?: { points: number; hours: number }
}

export interface HistoryRow extends Partial<Server> {
  timestamp: number
}

export interface BatchUpdateMessage {
  type: 'batchUpdate'
  ts?: number
  updates: Array<{
    serverId: string
    samples: Array<{
      ts?: number
      data?: Partial<Server>
      payload?: Partial<Server>
      metrics?: Partial<Server>
    }>
  }>
}
