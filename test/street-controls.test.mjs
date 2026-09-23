import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const streetSource = fs.readFileSync(
	new URL('../src/平遥古城沉浸式游戏/pages_game/street/street.vue', import.meta.url),
	'utf8'
)

test('街景为桌面端注册键盘移动输入', () => {
	assert.match(streetSource, /addEventListener\(['"]keydown['"]\s*,/)
	assert.match(streetSource, /addEventListener\(['"]keyup['"]\s*,/)
})

test('街景为桌面端注册鼠标拖拽输入', () => {
	assert.match(streetSource, /addEventListener\(['"]mousedown['"]\s*,/)
	assert.match(streetSource, /addEventListener\(['"]mousemove['"]\s*,/)
	assert.match(streetSource, /addEventListener\(['"]mouseup['"]\s*,/)
})

test('街景支持双区触控视角、滚轮缩放和相机相对移动', () => {
	assert.match(streetSource, /moveTouchId/)
	assert.match(streetSource, /lookTouchId/)
	assert.match(streetSource, /addEventListener\(['"]wheel['"]\s*,/)
	assert.match(streetSource, /cameraYaw/)
	assert.match(streetSource, /roadBounds/)
	assert.match(streetSource, /cameraBounds/)
})

test('街景按真实移动距离计步并按帧率调整像素比', () => {
	assert.match(streetSource, /stepDistanceCarry\s*\+=\s*movedDistance/)
	assert.match(streetSource, /renderer\.setPixelRatio\(renderPixelRatio\)/)
	assert.match(streetSource, /fps < 36 && renderer\.shadowMap\.enabled/)
})
