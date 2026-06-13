# Three.js 库文件说明

本目录存放 Three.js 及后处理库文件，用于 renderjs 动态加载。

## 必需文件列表（按加载顺序）

> ⚠️ **顺序约束（踩坑记录）**：`EffectComposer.js` 定义了 `THREE.Pass` 基类，而 `RenderPass.js` / `ShaderPass.js` / `UnrealBloomPass.js` 在脚本求值期就 `class X extends THREE.Pass`。因此 **EffectComposer 必须排在这三者之前**，否则 `extends undefined` 会同步抛 TypeError，导致 `THREE.RenderPass/ShaderPass` 为 undefined、`new THREE.EffectComposer()` 再崩。曾因此让 street 3D 永久卡在加载层。

1. **three.min.js**
   - 下载地址: https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.min.js
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

## 使用方式

在 renderjs 中通过动态创建 `<script>` 标签按顺序加载：

```js
async initThree() {
  const libs = [
    '/static/libs/three.min.js',
    '/static/libs/CopyShader.js',
    '/static/libs/LuminosityHighPassShader.js',
    '/static/libs/EffectComposer.js',
    '/static/libs/RenderPass.js',
    '/static/libs/ShaderPass.js',
    '/static/libs/UnrealBloomPass.js'
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
- 路径必须以 `/` 开头（绝对路径），例如 `/static/libs/three.min.js`
- 加载顺序不能错，否则依赖关系会报错
