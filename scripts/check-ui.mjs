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
const detail = () => byClass('selection')
const reveal = () => { detail().props.onClick(); render() }
const keyReveal = (key) => {
  let prevented = false
  detail().props.onKeyDown({ key, preventDefault() { prevented = true } })
  render()
  return prevented
}
const assertHidden = () => {
  assert.ok(!/[A-G][♯♭]?/.test(text(detail())))
  assert.ok(!/[A-G][♯♭]?\d/.test(detail().props['aria-label']))
  assert.ok(!/音名|八度|频率|MIDI/.test(text(detail())))
}
render()
assert.equal(boardButtons().length, 150)
assert.match(boardButtons()[24].props['aria-label'], /E6/)
assert.match(boardButtons()[149].props['aria-label'], /E4/)
assert.equal(nodes(byClass('fret-markers')).filter((node) => text(node) === '● ●').length, 2)
assert.equal(text(detail()), '请先点击指板选择位置')
byClass('sound-button').props.onClick(); render()
toggleNotes(false)
assert.equal(text(detail()), '请先点击指板选择位置')
assert.equal(detail().props['aria-disabled'], true)
reveal()
assert.equal(text(detail()), '请先点击指板选择位置')
assert.equal(keyReveal('Enter'), true)
assert.equal(text(detail()), '请先点击指板选择位置')
assert.ok(boardButtons().every((button) => !/[A-G][♯♭]?\d/.test(button.props['aria-label'])))
assert.ok(!/[A-G]/.test(text(byClass('strings'))))
assert.equal(text(byClass('guess-hint')), '先猜音名，再点击下方详情窗口核对。')

// 用户指定的标准调弦验收流程，包含鼠标/触屏点击、Enter 和空格。
await click(6, 3)
assertHidden()
assert.match(text(detail()), /第 6 弦/)
assert.match(text(detail()), /3 品/)
assert.equal(detail().props.role, 'button')
assert.equal(detail().props.tabIndex, 0)
assert.equal(keyReveal('Escape'), false)
assertHidden()
reveal()
assert.equal(text(byClass('selection-note')), '当前音高G2')
await click(5, 3)
assertHidden()
reveal()
assert.equal(text(byClass('selection-note')), '当前音高C3')
await click(6, 3)
assertHidden()
assert.equal(keyReveal('Enter'), true)
assert.equal(text(byClass('selection-note')), '当前音高G2')
await click(5, 3)
assertHidden()
assert.equal(keyReveal(' '), true)
assert.equal(text(byClass('selection-note')), '当前音高C3')
await click(5, 3) // 即使再次点相同位置，也重置答案。
assertHidden()
assert.ok(boardButtons().every((button) => !/[A-G]/.test(text(button))))
byClass('sound-button').props.onClick(); render()
assertHidden()
byClass('sound-button').props.onClick(); render()
assertHidden()
assert.equal(tree.props.onClick, undefined)

choose('drop-d')
assertHidden()
assert.match(text(byClass('open-summary')), /D2/)
await click(6, 24); assertHidden(); reveal()
assert.equal(text(byClass('selection-note')), '当前音高D4')
choose('half-step'); assertHidden()
await click(6, 0); assertHidden(); reveal()
assert.equal(text(byClass('selection-note')), '当前音高E♭2')
choose('facgce'); assertHidden()
await click(2, 0); assertHidden(); reveal()
assert.equal(text(byClass('selection-note')), '当前音高C4')
toggleNotes(true)
assert.equal(detail().props.role, undefined)
await click(6, 0)
assert.equal(text(byClass('selection-note')), '当前音高F2')
toggleNotes(false); assertHidden()
choose('custom'); assertHidden()
const sixthField = () => nodes(tree).filter((node) => node.type === 'fieldset')[5]
let input = nodes(sixthField()).find((node) => node.type === 'input')
input.props.onChange({ target: { value: '' } }); render()
find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} }); render()
assert.match(text(byClass('tuning-errors')), /第 6 弦：八度/)
assert.match(text(byClass('applied-tuning')), /FACGCE/)
input = nodes(sixthField()).find((node) => node.type === 'input')
input.props.onChange({ target: { value: '2' } }); render()
nodes(sixthField()).find((node) => node.type === 'select').props.onChange({ target: { value: 'F♯' } }); render()
reveal()
find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} }); render()
assertHidden()
assert.match(text(byClass('applied-tuning')), /自定义调弦/)
for (const [fret, octave] of [[0, 2], [12, 3], [24, 4]]) {
  await click(6, fret); assertHidden(); reveal()
  assert.equal(text(byClass('selection-note')), `当前音高F♯${octave}`)
}
console.log('通过：隐藏 → 6 弦 3 品不揭晓 → 点击详情 G2 → 5 弦 3 品重置 → 点击详情 C3')
console.log('通过：未选位置不揭晓、鼠标/触屏点击处理器、Enter/空格、其他按键及控件不揭晓')
console.log('通过：显示模式直接显示、隐藏模式与调弦重置、无声猜音、150 个按钮、自定义验证与应用')
delete globalThis.__guitarTestHooks
