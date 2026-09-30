# 庭院音频

本目录（仓库 `public/static/audio/`，站点 `/static/audio/`）包含 14 个随站点部署的 WAV 文件，由 `scripts/build-courtyard-audio.py` 确定性生成。素材为原创合成五声音阶拨弦与短音效，未使用外部录音样本；不是实录古琴或环境采样。

- 4 个背景循环：`bgm_street_ambient`、`bgm_ancient_city`、`bgm_shop`、`bgm_menu`。街景当前使用 `street_ambient`，其余保留供页面选用。
- 10 个短音效与 `audio.js` 的 SFX 常量对应，任务、讲解、领取、购物与换装沿用页面现有调用。
- 格式：24 kHz、16-bit PCM、单声道。背景每段 12 秒，音符尾音跨循环边界延续；全部文件合计 2,682,856 bytes。
- 默认音量：背景 0.32、音效 0.65；受 `gameSettings.enableMusic` 开关控制。

`src/common/utils/audio.js` 使用浏览器 HTMLAudioElement，资源相对 `document.baseURI` 解析；处理 `play()` Promise 的自动播放拒绝，首次用户触摸/按键后重试。浏览器标签页隐藏时暂停并释放短音效，退出街景后清理上下文与解锁监听。音效并发上限为 6。

验证：`node --test test/audio-lifecycle.test.mjs` 检查文件格式、波形幅度、循环接缝及上下文生命周期。浏览器实际解码与播放由 `test/app-gameplay-audit.py` 验证。手机浏览器的自动播放与静音策略因厂商而异，以实际设备为准。