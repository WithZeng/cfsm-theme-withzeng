import { request, type RequestOptions } from './http'
import type { HistoryRow, Server, ServersResponse, SiteConfig } from './types'

export const fetchConfig = (base: string, opts: RequestOptions = {}) =>
  request<SiteConfig>(base, '/api/config', opts)

export const fetchServers = (base: string) =>
  request<ServersResponse>(base, '/api/servers')

export const fetchServer = (base: string, id: string) =>
  request<Server & { sysConfig?: { long_history_points?: number } }>(base, `/api/server?id=${encodeURIComponent(id)}`)

/** hours 可选 0.167 / 0.5 / 1 / 6 / 12 / 24 / 48 / 96 / 168；未登录超过 24 返回 401 */
export const fetchHistory = (base: string, id: string, hours: number) =>
  request<HistoryRow[]>(base, `/api/history/all?id=${encodeURIComponent(id)}&hours=${hours}`, { timeoutMs: 30_000 })
