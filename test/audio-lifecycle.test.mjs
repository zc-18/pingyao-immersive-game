import { installLocalStorage } from './helpers/browser-env.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as audio from '../src/common/utils/audio.js'

test('all declared cues have bounded, decodable PCM assets with smooth loop joins', () => {
  for (const [kind, names] of [['bgm', audio.BGM], ['sfx', audio.SFX]]) {
    for (const name of Object.values(names)) {
      const bytes = fs.readFileSync(new URL(`../public/static/audio/${kind}_${name}.wav`, import.meta.url))
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
      assert.equal(bytes.toString('ascii', 8, 12), 'WAVE')
      assert.equal(bytes.readUInt16LE(20), 1)
      assert.equal(bytes.readUInt32LE(24), 24000)
      assert.ok(bytes.length < 600000)
      let peak = 0
      for (let i = 44; i < bytes.length; i += 2) peak = Math.max(peak, Math.abs(bytes.readInt16LE(i)))
      assert.ok(peak > 100 && peak < 30000)
      if (kind === 'bgm') assert.ok(Math.abs(bytes.readInt16LE(44) - bytes.readInt16LE(bytes.length - 2)) < 1500)
    }
  }
})

test('浏览器 Audio 复用 BGM、限制并发、释放出错音效并响应后台暂停', (t) => {
	const env = installLocalStorage()
	const previousWindow = globalThis.window, previousDocument = globalThis.document
	const contexts = []
	globalThis.document = { baseURI: 'https://example.test/game/', addEventListener() {}, removeEventListener() {} }
	globalThis.window = { Audio: class {
		constructor() { this.events = {}; this.plays = 0; this.pauses = 0; this.destroyed = 0; contexts.push(this) }
		play() { this.plays++; return Promise.resolve() }
		pause() { this.pauses++ }
		removeAttribute(name) { if (name === 'src') this.src = '' }
		load() { this.destroyed++ }
		addEventListener(name, fn) { this.events[name] = fn }
	} }
	t.after(() => { audio.stopBGM(); env.uninstall(); globalThis.window = previousWindow; globalThis.document = previousDocument })
	audio.resumeBGM()
	audio.playBGM(audio.BGM.STREET_AMBIENT)
	audio.playBGM(audio.BGM.STREET_AMBIENT)
	assert.equal(contexts.length, 1)
	assert.equal(contexts[0].plays, 2)
	assert.equal(contexts[0].src, 'https://example.test/game/static/audio/bgm_street_ambient.wav')
	for (let i = 0; i < 20; i++) audio.playSFX(audio.SFX.COIN)
	assert.equal(contexts.length, 7)
	contexts[1].events.error()
	assert.equal(contexts[1].destroyed, 1)
	audio.playSFX(audio.SFX.COIN)
	assert.equal(contexts.length, 8)
	audio.pauseBGM()
	audio.playSFX(audio.SFX.COIN)
	assert.equal(contexts.length, 8)
	assert.ok(contexts[0].pauses > 0)
	assert.ok(contexts.slice(1).every(ctx => ctx.destroyed === 1))
	env.seed('pygc_game_settings', { enableMusic: false }); audio.syncAudioSettings()
	assert.equal(contexts[0].destroyed, 1)
	env.seed('pygc_game_settings', { enableMusic: true }); audio.resumeBGM()
	assert.equal(contexts.length, 9)
	audio.stopBGM(); audio.resumeBGM()
	assert.equal(contexts.length, 9)
})

test('Web autoplay rejection waits for a gesture and releases listeners on page exit', async (t) => {
  const events = new Map()
  const elements = []
  let blocked = true
  const env = installLocalStorage()
  const previousWindow = globalThis.window, previousDocument = globalThis.document
  t.after(() => { audio.stopBGM(); env.uninstall(); globalThis.window = previousWindow; globalThis.document = previousDocument })
  globalThis.document = { baseURI: 'https://example.test/game/', addEventListener: (event, fn) => events.set(event, fn), removeEventListener: (event) => events.delete(event) }
  globalThis.window = { Audio: class {
    constructor() { elements.push(this); this.plays = 0 }
    addEventListener() {}
    play() { this.plays++; return blocked ? Promise.reject(new Error('autoplay denied')) : Promise.resolve() }
    pause() {}
    removeAttribute() {}
    load() {}
  } }
  audio.playBGM(audio.BGM.STREET_AMBIENT)
  await Promise.resolve()
  assert.equal(events.size, 2)
  assert.equal(elements[0].src, 'https://example.test/game/static/audio/bgm_street_ambient.wav')
  blocked = false
  events.get('pointerdown')()
  await Promise.resolve()
  assert.equal(elements[0].plays, 2)
  assert.equal(events.size, 0)
  audio.stopBGM()
})
