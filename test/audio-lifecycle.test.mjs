import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as audio from '../src/平遥古城沉浸式游戏/common/utils/audio.js'

test('all declared cues have bounded, decodable PCM assets with smooth loop joins', () => {
  for (const [kind, names] of [['bgm', audio.BGM], ['sfx', audio.SFX]]) {
    for (const name of Object.values(names)) {
      const bytes = fs.readFileSync(new URL(`../src/平遥古城沉浸式游戏/static/audio/${kind}_${name}.wav`, import.meta.url))
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

test('native audio reuses BGM, limits cues, releases errors and pauses on background', () => {
  let enabled = true
  const contexts = []
  globalThis.uni = {
    getStorageSync: () => ({ enableMusic: enabled }),
    createInnerAudioContext() {
      const ctx = { events: {}, plays: 0, pauses: 0, destroyed: 0,
        play() { this.plays++ }, pause() { this.pauses++ }, destroy() { this.destroyed++ },
        onError(fn) { this.events.error = fn }, onEnded(fn) { this.events.ended = fn }, onStop(fn) { this.events.stop = fn }
      }
      contexts.push(ctx); return ctx
    }
  }
  globalThis.plus = { io: { convertLocalFileSystemURL: (path) => 'app://' + path } }
  audio.resumeBGM()
  audio.playBGM(audio.BGM.STREET_AMBIENT)
  audio.playBGM(audio.BGM.STREET_AMBIENT)
  assert.equal(contexts.length, 1)
  assert.equal(contexts[0].plays, 2)
  assert.equal(contexts[0].src, 'app://_www/static/audio/bgm_street_ambient.wav')
  for (let i = 0; i < 20; i++) audio.playSFX(audio.SFX.COIN)
  assert.equal(contexts.length, 7)
  contexts[1].events.error()
  assert.equal(contexts[1].destroyed, 1)
  audio.playSFX(audio.SFX.COIN)
  assert.equal(contexts.length, 8)
  audio.pauseBGM()
  audio.playSFX(audio.SFX.COIN)
  assert.equal(contexts.length, 8)
  assert.equal(contexts.slice(1).every((ctx) => ctx.destroyed === 1), true)
  enabled = false; audio.syncAudioSettings()
  assert.equal(contexts[0].destroyed, 1)
  enabled = true; audio.resumeBGM()
  assert.equal(contexts.length, 9)
  audio.stopBGM(); audio.resumeBGM()
  assert.equal(contexts.length, 9)
  delete globalThis.uni; delete globalThis.plus
})

test('H5 autoplay rejection waits for a gesture and releases listeners on page exit', async () => {
  const events = new Map()
  const elements = []
  let blocked = true
  globalThis.uni = { getStorageSync: () => ({ enableMusic: true }) }
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
  delete globalThis.window; delete globalThis.document; delete globalThis.uni
})
