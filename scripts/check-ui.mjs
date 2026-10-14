// 无需 DOM 或新增依赖：执行组件事件处理器并检查 React 元素树。
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const slots = []
let cursor = 0
const useState = (initial) => {
  const index = cursor++
  if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
  return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next }]
}
globalThis.__guitarTestHooks = {
  useState,
  useRef(initial) { return useState(() => ({ current: initial }))[0] },
  useEffect() {},
}
const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const compile = (path) => ts.transpileModule(fs.readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
}).outputText
const pitchUrl = dataUrl(compile('src/pitch.ts'))
const audioUrl = dataUrl(compile('src/audio.ts'))
const hookUrl = dataUrl('export const { useState, useRef, useEffect } = globalThis.__guitarTestHooks')
let compiled = compile('src/App.tsx')
compiled = compiled.replace(/from ["']react["']/g, `from '${hookUrl}'`)
  .replace(/from ["']react\/jsx-runtime["']/g, `from '${pathToFileURL(require.resolve('react/jsx-runtime')).href}'`)
  .replace(/from ["']\.\/pitch["']/g, `from '${pitchUrl}'`)
  .replace(/from ["']\.\/audio["']/g, `from '${audioUrl}'`)
  .replace(/import ["']\.\/App.css["'];?/, '')
const { default: App } = await import(dataUrl(compiled))
let tree
function render() { cursor = 0; tree = App() }
function nodes(node) {
  if (!node || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap((item) => nodes(item))
  return [node, ...nodes(node.props?.children)]
}
const find = (predicate) => { const result = nodes(tree).find(predicate); assert.ok(result); return result }
const byClass = (name) => find((node) => node.props?.className === name)
const text = (node) => {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node !== 'object') return String(node)
  if (Array.isArray(node)) return node.map(text).join('')
  return text(node.props?.children)
}
const boardButtons = () => nodes(tree).filter((node) => node.type === 'button' && node.props.className?.startsWith('fret-cell'))
const click = async (string, fret) => { await boardButtons()[(string - 1) * 25 + fret].props.onClick(); render() }
const choose = (value) => { find((node) => node.type === 'select' && node.props.value !== undefined && node.props.onChange && node.props.children.length === 2).props.onChange({ target: { value } }); render() }
const toggleNotes = (checked) => { find((node) => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked } }); render() }
render()
assert.equal(boardButtons().length, 150)
assert.match(boardButtons()[24].props['aria-label'], /E6/)
assert.match(boardButtons()[149].props['aria-label'], /E4/)
assert.equal(nodes(byClass('fret-markers')).filter((node) => text(node) === '● ●').length, 2)
byClass('sound-button').props.onClick()
render()
toggleNotes(false)
assert.equal(text(byClass('selection-note')), '当前音高?')
assert.ok(boardButtons().every((button) => !/[A-G][♯♭]?\d/.test(button.props['aria-label'])))
assert.ok(!/[A-G]/.test(text(byClass('strings'))))
assert.equal(text(byClass('guess-hint')), '先猜音名，再点击位置核对。')
await click(6, 24)
assert.equal(text(byClass('selection-note')), '当前音高E4')
await click(1, 24)
assert.equal(text(byClass('selection-note')), '当前音高E6')
assert.ok(boardButtons().every((button) => !/[A-G]/.test(text(button))))
choose('drop-d')
assert.equal(text(byClass('selection-note')), '当前音高?')
assert.match(text(byClass('open-summary')), /D2/)
await click(6, 24)
assert.equal(text(byClass('selection-note')), '当前音高D4')
choose('half-step')
assert.equal(text(byClass('selection-note')), '当前音高?')
await click(6, 0)
assert.equal(text(byClass('selection-note')), '当前音高E♭2')
choose('facgce')
await click(2, 0)
assert.equal(text(byClass('selection-note')), '当前音高C4')
toggleNotes(true)
toggleNotes(false)
assert.equal(text(byClass('selection-note')), '当前音高?')
byClass('sound-button').props.onClick()
render()
assert.equal(text(byClass('selection-note')), '当前音高?')
byClass('sound-button').props.onClick()
render()
choose('custom')
const sixthField = () => nodes(tree).filter((node) => node.type === 'fieldset')[5]
let input = nodes(sixthField()).find((node) => node.type === 'input')
input.props.onChange({ target: { value: '' } }); render()
find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} }); render()
assert.match(text(byClass('tuning-errors')), /第 6 弦：八度/)
assert.match(text(byClass('applied-tuning')), /FACGCE/)
input = nodes(sixthField()).find((node) => node.type === 'input')
input.props.onChange({ target: { value: '2' } }); render()
nodes(sixthField()).find((node) => node.type === 'select').props.onChange({ target: { value: 'F♯' } }); render()
find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} }); render()
assert.equal(text(byClass('selection-note')), '当前音高?')
assert.match(text(byClass('applied-tuning')), /自定义调弦/)
for (const [fret, octave] of [[0, 2], [12, 3], [24, 4]]) {
  await click(6, fret)
  assert.equal(text(byClass('selection-note')), `当前音高F♯${octave}`)
}
console.log('通过：150 个按钮、双点标记、隐藏时移除音名及无障碍答案、点击揭晓与更新')
console.log('通过：调弦切换同步刷新及清除答案、其他控件不揭晓、无声猜音、自定义验证与应用')
delete globalThis.__guitarTestHooks
