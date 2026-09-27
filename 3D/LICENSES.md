# 资产来源与许可

## 当前 Web 汉服人物

`pingyao-hanfu-human.blend` 和应用 `static/models/pingyao-hanfu-human.glb` 使用 Quaternius 的 Universal Base Characters（Superhero Male）人体、皮肤贴图、头发，以及 Universal Animation Library 的同骨架动画，均为 CC0 1.0 Universal。原始许可证保存在 `Quaternius-Base-CC0.txt` 与 `Quaternius-Animation-CC0.txt`。

- 人体来源：https://quaternius.com/packs/universalbasecharacters.html
- 动作来源：https://quaternius.com/packs/universalanimationlibrary.html
- 汉服、袖型、下摆、腰带、冠帽和配饰由 `scripts/build_pingyao_human_hero.py` 制作。
- 织物与全景图由上一会话的 imagegen 网关生成，本次沿用；保留于 `textures/hanfu/` 和应用 `static/img/pingyao-web-panorama.webp`。生成提示词随纹理和 `concepts/pingyao-panorama.prompt.txt` 保存。
- 这是成人比例的风格化人物，采用骨骼蒙皮；不含扫描人体或布料物理仿真。

## 人物网格、骨架与动画

`pingyao-merchant-hero.glb` 基于本项目现有 `static/models/pingyao-hanfu-courtyard.glb` 精修。可见基础网格为本项目原创；骨架及 `Idle`、`Walking_A`、`Running_A`、`Cheer` 的基础动作来自 KayKit Character Pack: Adventurers，许可为 CC0 1.0 Universal。`Interact` 为本项目已有的双手致意动作。

完整上游说明与 CC0 文本见：

- `../src/平遥古城沉浸式游戏/static/models/LICENSES.md`
- `../src/平遥古城沉浸式游戏/static/models/KayKit-CC0.txt`

## 本次新增内容

材质调整、灯笼、票号招牌和香炉由本次 Blender 工程生成。角色概念图与织锦纹样通过用户指定的 `imagegen-custom-gateway` 生成；复现提示词位于 `concepts/` 和 `textures/`。
