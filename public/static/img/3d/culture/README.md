# 平遥五街文化插画

六张 512×512 WebP 图用于街景中的实体木框画屏与行旅册章节卡片；`journey.webp` 用于五章完成后的回顾底图。内容为游戏用艺术插画，不作建筑测绘或史料复原依据。

- 模型：`gpt-image-2`
- 工作流：用户明确调用的 `imagegen-custom-gateway`
- 生成日期：2026-09-30
- 原图尺寸：1536×1024，3×2 图集，quality `high`
- 实际请求：1 次，未重试
- 源图：项目根目录 `output/imagegen/pingyao-culture-atlas-v01.png`
- 最终提示词：项目根目录 `output/imagegen/pingyao-culture-atlas-v01.prompt.txt`
- 裁切脚本：`scripts/prepare-culture-art.py`，WebP quality 86；拒绝覆盖已有文件

| 文件 | 内容 |
| --- | --- |
| bank-house.webp | 票号算盘、账册与商道 |
| south-avenue.webp | 县衙门楼与堂鼓 |
| market-crossing.webp | 市集食礼、茶醋与织锦 |
| academy-lane.webp | 书院礼学与文房 |
| lantern-quarter.webp | 城墙与万家灯火 |
| journey.webp | 古城全景与行旅记忆 |

源图与提示词保留在项目内。运行时只加载压缩成品，沿用项目 Three.js r146 的颜色处理与资源释放流程。
