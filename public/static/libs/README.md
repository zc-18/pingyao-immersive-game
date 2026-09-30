# Three.js 库文件说明

本目录存放 Three.js 及后处理库文件，由街景渲染模块 `src/pages_game/street/street-renderer.js` 在运行时按顺序注入 `<script>`，挂到全局 `window.THREE`。仓库中的源文件位于 `public/static/libs/`，站点上以 `/static/libs/...` 访问；`npm run build` 原样拷贝到 `dist/static/libs/`，不经过 Vite 打包。

2026-09-07 实测：当前仓库 `three.min.js` 的 `THREE.REVISION` 为 **146**。本轮不升级引擎；所有示例插件也固定取自 `three@0.146.0/examples/js`。

## 必需文件列表（按加载顺序）

> ⚠️ **顺序约束（踩坑记录）**：`EffectComposer.js` 定义了 `THREE.Pass` 基类，而 `RenderPass.js` / `ShaderPass.js` / `UnrealBloomPass.js` 在脚本求值期就 `class X extends THREE.Pass`。因此 **EffectComposer 必须排在这三者之前**，否则 `extends undefined` 会同步抛 TypeError，导致 `THREE.RenderPass/ShaderPass` 为 undefined、`new THREE.EffectComposer()` 再崩。曾因此让 street 3D 永久卡在加载层。

1. **three.min.js**
   - 下载地址: https://cdn.jsdelivr.net/npm/three@0.146.0/build/three.min.js
   - 挂载至 `window.THREE`

2. **CopyShader.js**
   - 纯 shader 对象（无 extends 依赖），后处理必需

3. **LuminosityHighPassShader.js**
   - 纯 shader 对象，Bloom 效果必需

4. **EffectComposer.js**
   - 后处理合成器；**定义 `THREE.Pass` / `THREE.FullScreenQuad`，必须先于下面三个 Pass 加载**

5. **RenderPass.js**
   - 渲染通道（`class RenderPass extends THREE.Pass`）

6. **ShaderPass.js**
   - 后处理通道（`class ShaderPass extends THREE.Pass`）

7. **UnrealBloomPass.js**
   - Bloom 辉光效果（`class UnrealBloomPass extends THREE.Pass`，运行时还用到 CopyShader/LuminosityHighPassShader/ShaderPass）

## 可选文件（必须排在 UnrealBloomPass 之后）

8. `RoomEnvironment.js`：首屏按需加载，用 `PMREMGenerator` 生成低成本环境反射；失败时继续使用三灯光方案。
9. `Sky.js`：首屏按需加载程序化天空；失败时继续使用 Canvas 渐变天空。
10. `FXAAShader.js`：WebGL1 及未启用多重采样的移动端 WebGL2 后处理抗锯齿；自适应分辨率和横竖屏变化时同步像素步长。
11. `GLTFLoader.js`：只有配置了离线角色模型时才加载。
12. `SkeletonUtils.js`：与 GLTFLoader 一起按需加载，供玩家和行人克隆骨骼模型。
13. `RGBELoader.js`：将来接入小型 HDR 时按需加载；当前环境使用 RoomEnvironment。

街景统一通过线性离屏目标、抗锯齿及颜色输出绘制昼夜画面，避免首次夜景因输出编码不同而重新编译整场材质。灯光特效开关只插入/释放辉光通道及其目标；基础颜色和抗锯齿资源保留到渲染器卸载，失败时仍可降级为直接绘制。辉光首次绘制在入场首帧完成，日间强度为零；低帧率策略只暂缓辉光，颜色输出路径保持稳定。测试监测实际辉光是否执行时，应检查 `UnrealBloomPass.enabled`，不能仅以 composer 是否绘制判断。

运行时不访问 CDN，上述文件随站点一起部署。

## 使用方式

渲染模块通过动态创建 `<script>` 标签按顺序串行加载（示意，实际实现以 `street-renderer.js` 为准）：

```js
const libs = [
  'static/libs/three.min.js',
  'static/libs/CopyShader.js',
  'static/libs/LuminosityHighPassShader.js',
  'static/libs/EffectComposer.js',
  'static/libs/RenderPass.js',
  'static/libs/ShaderPass.js',
  'static/libs/UnrealBloomPass.js'
]
for (const src of libs) {
  await loadScript(src) // 已注入过的脚本不重复加载，页面二次进入走快速路径
}
const THREE = window.THREE
```

## 注意事项

- **不要改用 npm 的 `three` 包**：渲染模块依赖这里固定为 r146 的全局 `window.THREE` 及同版本 `examples/js` 插件，混用模块版与全局版会得到两套不兼容的类。
- **不要改成 CDN 加载**：离线、内网或跨域环境会直接失败；站点自带这些文件即可。
- 资源 URL 相对 `document.baseURI` 解析（站点部署在根路径时即 `/static/...`），不要在渲染模块里硬编码其他主机名。
- 加载顺序不能错，否则依赖关系会报错。
- 二进制模型/HDR 通过 `fetch` 读取为 `ArrayBuffer`，再交给 loader 的 `parse()`。
