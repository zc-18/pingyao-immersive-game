# Three.js 库文件说明

本目录存放 Three.js 及后处理库文件，用于 renderjs 动态加载。

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

运行时不访问 CDN。上述文件都随 APP 打包到 `static/libs/`。

## 使用方式

在 renderjs 中通过动态创建 `<script>` 标签按顺序加载：

```js
async initThree() {
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
    await this.loadScript(src)
  }
  const THREE = window.THREE
  // 现在可以使用 THREE 了
}
```

## 注意事项

- **不要使用 npm install**，renderjs 无法 import npm 包
- **不要使用 CDN 加载**，APP 端可能无网络或跨域问题
- APP 云打包后不能直接使用 `/static/...`。应先通过 `plus.io.convertLocalFileSystemURL('_www/static/...')`
  解析包内资源；H5 可相对 `document.baseURI` 解析，并保留相对路径作为兜底
- 加载顺序不能错，否则依赖关系会报错
- 二进制模型/HDR 在 H5 通过 `fetch` 读取；APP 通过 `plus.io.resolveLocalFileSystemURL` 与 `FileReader.readAsArrayBuffer` 读取，再交给 loader 的 `parse()`。这条 APP 路径仍需 HBuilderX Android/iOS 真机验证。
