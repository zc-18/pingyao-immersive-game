# Three.js 库文件说明

本目录存放 Three.js 及后处理库文件，用于 renderjs 动态加载。

## 必需文件列表（按加载顺序）

1. **three.min.js** (v0.157.0)
   - 下载地址: https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.min.js
   - 挂载至 `window.THREE`

2. **CopyShader.js**
   - 下载地址: https://cdn.jsdelivr.net/npm/three@0.157.0/examples/js/shaders/CopyShader.js
   - 后处理必需

3. **LuminosityHighPassShader.js**
   - 下载地址: https://cdn.jsdelivr.net/npm/three@0.157.0/examples/js/shaders/LuminosityHighPassShader.js
   - Bloom 效果必需

4. **ShaderPass.js**
   - 下载地址: https://cdn.jsdelivr.net/npm/three@0.157.0/examples/js/postprocessing/ShaderPass.js
   - 后处理通道

5. **RenderPass.js**
   - 下载地址: https://cdn.jsdelivr.net/npm/three@0.157.0/examples/js/postprocessing/RenderPass.js
   - 渲染通道

6. **EffectComposer.js**
   - 下载地址: https://cdn.jsdelivr.net/npm/three@0.157.0/examples/js/postprocessing/EffectComposer.js
   - 后处理合成器

7. **UnrealBloomPass.js**
   - 下载地址: https://cdn.jsdelivr.net/npm/three@0.157.0/examples/js/postprocessing/UnrealBloomPass.js
   - Bloom 辉光效果

## 使用方式

在 renderjs 中通过动态创建 `<script>` 标签按顺序加载：

```js
async initThree() {
  const libs = [
    '/static/libs/three.min.js',
    '/static/libs/CopyShader.js',
    '/static/libs/LuminosityHighPassShader.js',
    '/static/libs/ShaderPass.js',
    '/static/libs/RenderPass.js',
    '/static/libs/EffectComposer.js',
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
