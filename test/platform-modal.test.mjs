import test from 'node:test'
import assert from 'node:assert/strict'
import { showModal, settleModal, modalState } from '../src/platform/modal.js'

test('modal returns edited content once and closes before callbacks', async () => {
  const calls = []
  const promise = showModal({ editable: true, content: '旧札记', success: result => calls.push([modalState.visible, result.content]) })
  modalState.value = '新札记'
  settleModal(true)
  settleModal(false)
  assert.deepEqual(await promise, { confirm: true, cancel: false, content: '新札记' })
  assert.deepEqual(calls, [[false, '新札记']])
})

test('modal promise settles even when completion callback throws', async () => {
  const promise = showModal({ complete() { throw new Error('callback failed') } })
  assert.throws(() => settleModal(false), /callback failed/)
  assert.deepEqual(await promise, { confirm: false, cancel: true })
  assert.equal(modalState.visible, false)
})
