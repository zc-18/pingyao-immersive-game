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
