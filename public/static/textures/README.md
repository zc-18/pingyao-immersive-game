# 街景贴图目录

院落青砖、瓦、木纹和织物使用 `courtyard/` 本地材质；叶片、灯晕和烟雾由街景渲染模块（`src/pages_game/street/street-renderer.js`）的 CanvasTexture 生成。青石道路使用下列本地纹理；加载失败时保留程序化青石纹理。所有动态素材经渲染模块的资源路径解析（相对 `document.baseURI`）加载。

## 围合院落材质（2026-09-10）

- 用户授权 imagegen-custom-gateway，`gpt-image-2`，quality `high`，1 次 HTTP 请求，无重试。
- 源图 `output/imagegen/courtyard-materials-v01.png`；可复现提示词在相邻 `.prompt.txt` 中。请求 2048×2048，网关实际返回 1254×1254，非原生 2K。
- `scripts/prepare-courtyard-materials.py` 将四个 627×627 材质区域分别镜像拼成无边界断缝的 1024×1024 重复贴图；高度近似图为 512×512。扩展尺寸不代表新增真实细节，生成图也不是实测 PBR 数据。
- 八张运行时 JPEG 当前总计约 1.29 MiB，复用缓存、各向异性过滤和轻量 bump；随站点部署，不在运行时请求网关。
- r146 WebGL2 在上传原尺寸贴图前释放 16px 占位纹理的 GPU 分配，避免 immutable texture 尺寸变化后仍显示单色。
- 2026-09-11：压低青砖灰缝的高亮，高度近似图反转灰缝方向，避免把灰缝鼓出墙面。墙面 UV 按约 1.8×1.6 m 的完整重复单元映射，缩小原先过大的砖块。
- 石嵌铺地、槐树树皮与复叶、灯笼纸面以及院落接触阴影由街景渲染模块绘制并缓存；没有新增外部素材请求。接触阴影为柔和的静态近似，不替代实时投影。
- 街景启用 r146 的颜色管理：十六进制设计颜色按 sRGB 输入，GLTF 线性材质因子保留原值；贴图、灯光和后期输出避免重复转换。
- WebGL1 兼容：r146 的 `EXT_sRGB` 上传路径会关闭 mipmap，远处高频砖石会闪烁。静态表面色彩图在该路径先解码 RGB 至线性空间并缓存，再生成 mipmap；alpha 保留，数据贴图不转换。异步图片替换同样处理，动态天空继续使用原实时画布，WebGL2 保留 GPU sRGB 采样。原始图片文件没有变更。
- 2026-09-11 屋顶续改：瓦面 UV 沿实际坡面距离展开，横向按约 18 cm 的瓦宽匹配既有贴图；复用 `roof-height.jpg` 做 1.8 cm 强度的近似凹凸。檐口短筒瓦使用受光的实例化几何，替换贯穿坡面的粗长条；围墙窄压顶保留贴图细节。没有新增位图或网关请求。

## 青石路面

- 文件：`pingyao-stone-albedo.jpg`、`pingyao-stone-height.jpg`、`pingyao-stone-roughness.jpg`，均为 1024 x 1024。
- 来源：用户明确授权的 imagegen-custom-gateway，模型 `gpt-image-2`，单次生成一张，quality `high`。请求 2048 x 2048，网关实际返回 1254 x 1254；没有将其标为原生 2K 素材。
- 原图：开发产物 `output/imagegen/pingyao-stone.png`，不纳入版本控制。未使用参考网站的纹理。
- 处理：`scripts/prepare-street-material.py` 缩小到 1024、融合对边并导出 JPEG。高度和粗糙度由明度推导，属于游戏近似材质，并非实测 PBR 扫描数据。
- 运行时：重复采样、各向异性过滤、轻微凹凸与粗糙度变化。材质不依赖在线图片 API。

完整生成提示词：

```text
Create a production game material for the historic stone streets of Pingyao Ancient City in China. The subject is a seamless, orthographic top-down square surface of old rectangular grey limestone paving slabs, tightly laid in staggered courses. Show finely resolved mineral grains, softly worn edges, shallow uneven joints, small natural pits and subtle foot-polished stone faces. Use a physically plausible photographic PBR base-color texture style, with neutral diffuse illumination and no baked directional shadows or highlights. Fill the entire 2048 by 2048 image with paving at a consistent scale, approximately six slabs across and eight courses vertically. There is no text. Constraints: perfectly flat top-down material scan, straight parallel courses, natural historic stone, visually continuous tile edges, no perspective and no objects. Avoid people, plants, puddles, moss patches, debris, signage, borders, dramatic lighting, large cracks, excessive contrast and stylized painting.
```
