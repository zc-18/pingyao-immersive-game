# 静态站点发布

站点：<http://101.200.184.201:9830/#/pages_game/splash/splash>。使用现有 SSH 连接 `aliyunchuan`，凭据不写入仓库。

Nginx 静态根目录为 `/www/wwwroot/pingyao-game/current`，该符号链接指向 `releases/<版本>`。版本目录独立保留，发布仅切换链接，不覆盖其他站点或修改 Nginx 配置。

1. 停止本项目 H5 开发服务，执行 `npm run build:h5`。开发与构建不能共用镜像目录并发运行。
2. 执行 `node scripts/package-pingyao-release.mjs output/deploy/pingyao-<版本>`，生成静态文件、预压缩文件及 `SHA256SUMS`。
3. 将发布包上传到项目服务器目录，解压到新的 `releases/<版本>`，执行 `sha256sum --check --quiet SHA256SUMS`。
4. 记录 `readlink -f current` 的旧版本；创建新临时符号链接，使用 `mv -Tf` 原子替换 `current`。
5. 检查公网入口和新模型的内容校验值；执行 `python test/deployed-game-audit.py http://101.200.184.201:9830 --release <版本>`。
6. 验收失败时将 `current` 原子切回记录的旧版本。成功后清理本次传输压缩包及本地打包中间目录，保留服务器版本、构建缓存和验收证据。

线上验收脚本使用隔离存档，检查新人物骨架、行走/快行、换装面板、镜头和三种屏幕尺寸，结果位于 `test/artifacts/deploy/<版本>/`。不写入真实用户存档。

构建和测试证据不提交到仓库；源代码同步与静态站点发布是独立操作。

## 最近发布：20260925-r1

- 2026-09-25 发布桌面 Web 布局、汉服人体和步行/快行动作更新。
- 构建成功；上传包及 2327 个发布文件 SHA-256 校验通过。
- 当前版本：`/www/wwwroot/pingyao-game/releases/20260925-r1`；上一版本：`/www/wwwroot/pingyao-game/releases/20260921-r1`，保留可回滚。
- 公网首页与新人物 GLB 内容校验通过。浏览器首次进入、人物加载、W/Shift+W、换装面板、观衣/镜头归位、1440×900、844×390、390×844 检查通过，页面及 HTTP 错误均为 0。
- [验收数据](../test/artifacts/deploy/20260925-r1/report.json)与[线上截图](../test/artifacts/deploy/20260925-r1/street-1440x900.png)。
