# Task 2 实现报告：腾讯位置服务适配器

## 结果

已完成腾讯位置服务适配器及自动化测试。适配器从 `globalThis.__PYGC_CONFIG__?.tencentLbs` 读取配置，通过代理 URL 调用 `uni.request`，不会在模块中保存或发送 SecretKey。

## TDD 证据

- RED：首次运行 `node --test test/tencent-lbs.test.mjs`，因 `tencent-lbs.js` 不存在而失败，得到 `ERR_MODULE_NOT_FOUND`。
- RED：新增回归测试后运行 `node --test test/tencent-lbs.test.mjs`，缺省启用、显式关闭、顶层搜索 `data`、严格输入校验等断言按预期失败。
- GREEN：修复后运行 `node --test test/tencent-lbs.test.mjs`，12 个顶层场景、29 个测试全部通过。
- 集成 GREEN：运行 `node --test test/location.test.mjs test/tencent-lbs.test.mjs test/poi-data.test.mjs test/map-regression.test.mjs`，17 个顶层场景、34 个测试全部通过。
- 额外检查：`git diff --check` 无输出；适配器与测试敏感字段扫描未发现 `SecretKey`/`secretKey`。

## 文件

- `src/平遥古城沉浸式游戏/common/utils/tencent-lbs.js`
  - `getTencentLbsConfig`
  - `reverseGeocode`
  - `searchNearby`
  - `walkingRoute`
  - 统一处理未配置、无效坐标、HTTP 错误、腾讯 `status !== 0`、响应格式错误和空路线。
- `test/tencent-lbs.test.mjs`
  - 覆盖禁用配置、路线正常化、逆地址、附近搜索和错误响应。

## 自检与注意事项

- `enabled: false` 显式短路；缺省 `enabled` 在 key 与 proxyUrl 齐全时兼容启用，返回配置的 enabled 与实际运行状态一致。
- 腾讯附近搜索按真实成功结构读取顶层 `data`；逆地址读取 `result.address`；路线严格校验非负数值与偶数长度数值 polyline，并原样保留腾讯点串。
- 代理需要负责将路径转发到腾讯 WebService，并在服务端管理 SecretKey；客户端只携带 key。
- Node 测试会提示项目未声明 `type: module` 的性能警告，该警告来自现有项目配置，不影响测试结果。
