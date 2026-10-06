# cfsm-theme-withzeng · 剑来

《剑来》水墨风格的 [CF-Server-Monitor](https://github.com/huilang-me/CF-Server-Monitor) 第三方主题。

信息架构参考现代探针（总览、筛选、卡片/列表、详情多图表），剑来只做视觉层：宣纸与夜墨两套配色、书法标题、朱砂印、毛笔边缘进度条，以及几处与数据绑定的小意象。

## 特性

**首页**

- 总览：在线节点、平均 CPU、内存与硬盘用量、实时上下行、本月流量
- 城头剑气：一台服务器一段城墙，剑气高度为实时 CPU，墨 / 赭 / 朱三档；离线段垛口崩缺；点击进入详情
- 分组切换、搜索，收藏 / 离线 / 高负载 / 即将到期 / 流量告急快捷筛选
- 卡片与列表两种视图；卡片含 CPU、内存、硬盘、流量、实时与累计网速、剩余天数与剩余价值、延迟与丢包窗口、标签
- 离线节点整卡遮罩并显示最后上报时间
- 在线里程碑：连续在线满 30 / 100 / 365 天分别盖“稳 / 恒 / 久”印

**详情页**

- 价格、月均支出、剩余时间、剩余价值、本月流量、流量配额、运行时间、连接数
- 硬件、系统、存储、网络四张信息卡
- 时间范围：实时（WebSocket 样本）、10 分钟至 7 天；未登录时隐藏 24 小时以上档位
- 图表：CPU 与负载、内存与 Swap、磁盘、网络、连接、进程、磁盘 IO，按数据可用性自动显示；横轴按真实时间排布，上报中断的时段留空，不补零
- 延迟区：按线路开关，平均 / 丢包 / 波动统计，可隐藏孤立尖峰
- 本命瓷小图标：水位为内存，光晕为 CPU，离线开裂

**其它**

- 昼 / 夜两套配色，默认跟随后台“默认外观”，访客可手动切换
- 首页订阅全部、详情页只订阅单台；页面隐藏时断开，回到前台先补 REST 再恢复
- 支持后台 `frontend_ws_timeout_minutes`：到时自动断开并询问是否继续
- 支持 Turnstile、非公开站点（同域 Cookie / 跨域 token 参数）、多个 apiBase
- 后台关闭价格、到期、流量或三网详情时同步隐藏

## 安装

在 CFSM 后台 **主题商店 → 自定义主题 URL** 填入：

```text
https://github.com/withzeng/cfsm-theme-withzeng/tree/build
```

`build` 分支由 CI 在 `main` 更新后自动生成，只包含 `index.html` 与 `assets/`。分支地址约 1 小时缓存；想要稳定不变，填带提交 SHA 的地址：

```text
https://github.com/withzeng/cfsm-theme-withzeng/tree/<build 分支的 40 位提交 SHA>
```

旗帜与系统图标使用 CFSM 自带的 `/flags/`、`/os-icons/`，不打包进主题。

## 开发

```bash
npm install
cp .env.example .env   # 填 VITE_DEV_PROXY_TARGET 为你的 Worker 地址
npm run dev
```

连真实后端时，需要在 Worker 的 `CORS_ALLOWED_ORIGINS` 加入本地地址（如 `https://localhost:5173`）。

不连后端，用演示数据：

```bash
MOCK=1 npm run dev
```

可选 `CFSM_PUBLIC_DIR=/path/to/CF-Server-Monitor/public` 让本地也能显示旗帜与系统图标。演示数据不含 WebSocket，页面会显示“静态”。

```bash
npm run typecheck
npm test
npm run build
```

## 目录

```text
src/
├── api/          # 接口、WebSocket、Turnstile，与 CFSM 公开接口对齐
├── composables/  # 全局数据（useMonitor）、昼夜主题、访客偏好
├── utils/        # 单位换算、计费、在线判定、延迟窗口、图表序列
├── components/   # 通用组件、首页与详情页组件
├── views/        # HomeView、ServerView
└── styles/       # 设计令牌（昼 / 夜）
mock/             # MOCK=1 时的演示后端
```

## 许可

MIT。CF-Server-Monitor 接口约定见其 [theme-develop.md](https://github.com/huilang-me/CF-Server-Monitor/blob/main/theme-develop.md)。《剑来》为烽火戏诸侯的作品，本主题只借用其意象与风格，不包含原作或动画的任何图片素材。
