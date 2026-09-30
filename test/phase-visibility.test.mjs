import test from 'node:test'
import assert from 'node:assert/strict'
import { PHASES } from '../src/common/utils/phase.js'

test('夜间街景保留足够的环境光与雾效可见度', () => {
	const night = PHASES.night

	assert.ok(night.lighting.ambient.intensity >= 0.45)
	assert.ok(night.lighting.hemi.intensity >= 0.4)
	assert.ok(night.fog.density <= 0.022)
})

test('各时辰曝光和辉光保持在克制范围内', () => {
	Object.values(PHASES).forEach((phase) => {
		assert.ok(phase.exposure >= 0.85 && phase.exposure <= 1.08)
		assert.ok(phase.bloomStrength >= 0.15 && phase.bloomStrength <= 0.55)
	})
})
