# 静态站点发布

站点：<http://101.200.184.201:9830/#/splash>。使用现有 SSH 连接 `aliyunchuan`，凭据不写入仓库。

Nginx 静态根目录为 `/www/wwwroot/pingyao-game/current`，该符号链接指向 `releases/<版本>`。版本目录独立保留，发布仅切换链接，不覆盖其他站点或修改 Nginx 配置。

1. 执行 `npm run build`，产物位于仓库根 `dist/`（index.html、assets/、static/）。无需停止 Vite 开发服务。
2. 执行 `node scripts/package-pingyao-release.mjs output/deploy/pingyao-<版本>`，生成静态文件、预压缩文件及 `SHA256SUMS`。
3. 将发布包上传到项目服务器目录，解压到新的 `releases/<版本>`，执行 `sha256sum --check --quiet SHA256SUMS`。
4. 记录 `readlink -f current` 的旧版本；创建新临时符号链接，使用 `mv -Tf` 原子替换 `current`。
5. 检查公网入口和新模型的内容校验值；执行 `python test/deployed-game-audit.py http://101.200.184.201:9830 --release <版本>`。
6. 验收失败时将 `current` 原子切回记录的旧版本。成功后清理本次传输压缩包及本地打包中间目录，保留服务器版本、构建缓存和验收证据。

线上验收脚本使用隔离存档，检查新人物骨架、行走/快行、换装面板、镜头和三种屏幕尺寸，结果位于 `test/artifacts/deploy/<版本>/`。不写入真实用户存档。

构建和测试证据不提交到仓库；源代码同步与静态站点发布是独立操作。

## 最近发布：20260930-five-streets-r1

- 2026-09-30 发布五街主线闭环、终章奖励与行旅册章节回顾，加入六张文化插画、街巷陈设和布幌、飞鸟、烟气动画完善；同时同步此前的 Vue / Vite Web 迁移与人物优化。
- 游戏源码提交：`a005fb1b15b9af45a41c3281ed9ec519f0f694d2`，已推送到 `origin/master`。发布记录及验收脚本的后续提交不改变本次游戏构建。
- 全量 `npm test` 189 项通过，`npm run build` 通过；SFTP 上传 267 个文件（含校验清单），服务器 266 项 SHA-256 校验通过。
- 当前版本：`/www/wwwroot/pingyao-game/releases/20260930-five-streets-r1`；上一版 `/www/wwwroot/pingyao-game/releases/20260930-scholar-r1` 保留可回滚。使用原子符号链接切换，未修改 Nginx 配置。
- 线上直连浏览器验收通过：启动选角、人形骨架、慢走 / 快行、衣橱与镜头、1440×900 / 844×390 / 390×844，无页面错误或 HTTP 错误。
- 首轮使用本机系统代理时，五张既有纹理出现 HTTP 502，按流程回滚。确认新旧纹理哈希一致、服务器及公网直连均返回 200 后，再次启用新版；使用 `--direct` 绕过本机代理复测通过。未修改纹理或放宽验收断言。
- 公网入口、JS / CSS、人物 GLB、文化插画及纹理共 104 个资源均 HTTP 200 且哈希与本地一致。校验结果、浏览器截图和发布记录保存在 `test/artifacts/deploy/20260930-five-streets-r1/`。GLB SHA-256：`195f51bb46ebf689566d8b93902aa783f92d8dbd5e70636c9f767e6d35cb4160`。
- 本次临时上传脚本、提交消息文件、首轮失败报告及截图已确认移入回收站；异常摘要已收入最终发布记录。本地打包目录 `output/deploy/20260930-five-streets-r1-work/` 移入回收站时返回“这个系统不支持该功能”，因此保留，未重试或永久删除。服务器版本、最终证据、构建及原有文件保留。

本机启用系统代理时，可通过以下命令直连公网执行同一组严格验收；`--direct` 只影响本次验收浏览器，不更改系统代理或线上服务：

```sh
python -B test/deployed-game-audit.py http://101.200.184.201:9830 --release 20260930-five-streets-r1 --direct
```

## 历史发布：20260930-scholar-r1

- 2026-09-30 发布书生人物造型与动画衔接优化：青灰交领长衫、柔化脸型与眉形、新肤色贴图、连续内领与肩袖衔接、织物细节和致意淡入淡出。
- 复用本轮已通过 183 项测试、生产构建及本地浏览器检查的产物；SFTP 上传 182 个文件，服务器 SHA-256 清单校验全部通过。
- 当前版本：`/www/wwwroot/pingyao-game/releases/20260930-scholar-r1`；上一个版本 `/www/wwwroot/pingyao-game/releases/20260929-web-r1` 保留可回滚。原子切换 `current`，未修改 Nginx 配置。
- 公网入口、入口 JS/CSS、新人物 GLB 均 HTTP 200 且哈希与本地相符。GLB SHA-256：`195f51bb46ebf689566d8b93902aa783f92d8dbd5e70636c9f767e6d35cb4160`。
- 线上隔离存档审计通过：启动选角、人形模型、步行/快行、衣橱与镜头、1440×900 / 844×390 / 390×844，无页面错误或 HTTP 错误。
- 验收证据在 `test/artifacts/deploy/20260930-scholar-r1/`。源码未提交；本次为静态站点发布。
- 无传输压缩包。当前环境的系统回收站接口此前已明确返回不支持，未重试清理；本地打包目录 `output/deploy/20260930-scholar-r1-work/` 保留，未永久删除。服务器新旧版本与验收证据保留。

## 历史发布：20260929-web-r1

- 2026-09-29 通过 SSH MCP 的 `aliyunchuan` 配置连接服务器，发布已验证的 Vue 3 / Vite Web 构建，包含桌面顶部导航、首页新背景与玩法修复。
- 181 项文件 SHA-256 在上传前和服务器端校验通过（另上传 SHA256SUMS 清单，共 182 文件）；公网入口、入口 JS/CSS、人体模型、新背景均 HTTP 200 且哈希匹配。
- 当前版本：`/www/wwwroot/pingyao-game/releases/20260929-web-r1`；上一个版本 `/www/wwwroot/pingyao-game/releases/20260927-r1` 保留可回滚。使用原子符号链接切换，未修改 Nginx 配置。
- 线上隔离存档浏览器审计通过：启动选角、人形模型、步行/快行、换装与镜头、1440×900 / 844×390 / 390×844，无页面错误及 HTTP 错误。
- 公网桌面首页确认 76px 顶部导航，四个栏目实际点击切换通过，生产环境不暴露开发钩子。
- 发布记录、公网校验及截图保留在 `test/artifacts/deploy/20260929-web-r1/`。未提交源码；本次为静态站点发布。
- 复用上次已校验的本地发布包，直接 SFTP 上传，无传输压缩包。该本地包此前回收失败，按清理规则保留、不重试。

## 历史发布：20260927-r1

- 2026-09-27 合并远端水墨地图定位（WGS84→GCJ02、腾讯逆地址解析，默认未配置 key）与本地桌面 Web / 汉服人体版本。
- `node --test test/*.test.mjs` 162 项通过，H5 构建成功；上传包及 2372 个发布文件 SHA-256 校验通过。
- 当前版本：`/www/wwwroot/pingyao-game/releases/20260927-r1`；上一版本：`/www/wwwroot/pingyao-game/releases/20260925-r1`，保留可回滚。
- 公网首页 HTTP 200，人物 GLB 与地图样式内容校验值与本地构建一致。本次按要求未运行浏览器验收脚本。

## Web 构建与缓存

旧入口 `#/pages_game/splash/splash` 仍是 alias。Nginx 配置无需改动：`/assets/` 带哈希缓存 30 天，`/static/` 无哈希缓存 1 小时，index.html 为 no-cache。hash 路由不发送给服务器，入口回退到 index.html。gzip_static 使用打包脚本生成的大于 1 KiB 文本预压缩文件。更新无哈希素材后，验收时注意强制刷新。

生产包不提供 window.__pygc；线上使用独立的 deployed-game-audit.py。迁移前版本的记录仅作历史参考，当前线上 Web 版本见“最近发布”。
