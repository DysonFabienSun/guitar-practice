// 执行组件事件并检查可见 React 元素树；浏览器布局另行验收。
import assert from 'node:assert/strict'
import { createModuleLoader, dataUrl } from './load-ts.mjs'

const initialTheme = process.argv[2] === 'dark' ? 'dark' : 'light'
const savedTheme = new Map([['saguadlib-theme', initialTheme]])
const listeners = new Map()
let hash = '#/fretboard'
const media = { matches: initialTheme === 'dark', addEventListener() {}, removeEventListener() {} }
globalThis.window = {
  localStorage: { getItem: (key) => savedTheme.get(key), setItem: (key, value) => savedTheme.set(key, value) },
  matchMedia: () => media,
  addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback) },
  removeEventListener(type, callback) { listeners.get(type)?.delete(callback) },
  location: { get hash() { return hash }, set hash(value) { hash = value.startsWith('#') ? value : `#${value}`; listeners.get('hashchange')?.forEach((fn) => fn()) } },
}
globalThis.document = { documentElement: { dataset: {} } }
const instances = new Map()
let currentSlots, cursor = 0, effects = []
const useState = (initial) => {
  const slots = currentSlots
  const index = cursor++
  if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
  return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next }]
}
globalThis.__guitarTestHooks = {
  useState,
  useRef(initial) { return useState(() => ({ current: initial }))[0] },
  useEffect(callback, dependencies) {
    const slots = currentSlots
    const index = cursor++
    const previous = slots[index]
    if (!previous || dependencies.some((item, i) => !Object.is(item, previous.dependencies[i]))) {
      slots[index] = { dependencies }
      effects.push(() => { previous?.cleanup?.(); slots[index].cleanup = callback() })
    }
  },
}
const hookUrl = dataUrl('export const { useState, useRef, useEffect } = globalThis.__guitarTestHooks')
const moduleUrl = createModuleLoader({ react: hookUrl })
const { default: App } = await import(moduleUrl('src/App.tsx'))
let tree
function expand(node, path = 'root') {
  if (!node || typeof node !== 'object') return node
  if (Array.isArray(node)) return node.map((child, index) => expand(child, `${path}/${index}`))
  if (typeof node.type === 'function') {
    const id = `${path}:${node.type.name}:${node.key ?? ''}`
    if (!instances.has(id)) instances.set(id, [])
    currentSlots = instances.get(id); cursor = 0
    return expand(node.type(node.props), id)
  }
  return { ...node, props: { ...node.props, children: expand(node.props?.children, `${path}/children`) } }
}
function render() {
  effects = []
  tree = expand({ type: App, props: {} })
  effects.forEach((effect) => effect())
}
function nodes(node) {
  if (!node || typeof node !== 'object' || node.props?.hidden) return []
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
function navigate(id) {
  find((node) => node.type === 'select' && node.props['aria-label'] === '板块导航').props.onChange({ target: { value: id } })
  render()
}
function chooseTheme(value) {
  navigate('settings')
  find((node) => node.type === 'select' && node.props['aria-label'] === '主题').props.onChange({ target: { value } })
  render()
  navigate('fretboard')
}
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
  assert.match(text(detail()), /点击查看答案/)
  assert.ok(!/[A-G][♯♭]?/.test(text(detail())))
  assert.ok(!/[A-G][♯♭]?\d/.test(detail().props['aria-label']))
  assert.ok(!/音名|八度|频率|MIDI/.test(text(detail())))
}
render()
assert.match(text(byClass('brand')), /Saguadlib/)
const themeSelect = () => find((node) => node.type === 'select' && node.props['aria-label'] === '主题')
navigate('settings')
assert.equal(themeSelect().props.value, initialTheme)
chooseTheme(initialTheme)
assert.equal(document.documentElement.dataset.theme, initialTheme)
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
chooseTheme(initialTheme === 'dark' ? 'light' : 'dark')
assertHidden()
chooseTheme(initialTheme)
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
// 七个地址、占位页与共享设置，以及返回指板后的局部练习状态。
for (const id of ['chords', 'scales', 'jam', 'transcription', 'about']) {
  navigate(id)
  assert.match(text(byClass('placeholder-page')), /筹备中/)
  assert.equal(boardButtons().length, 0)
  assert.equal(nodes(tree).filter((node) => node.type === 'button').length, 0)
  assert.match(text(byClass('shared-summary')), /自定义调弦/)
}
navigate('fretboard')
assert.equal(text(byClass('selection-note')), '当前音高F♯4')
navigate('settings')
choose('drop-d')
const soundCheckbox = () => find((node) => node.type === 'label' && text(node).startsWith('点击发声')).props.children[1]
soundCheckbox().props.onChange({ target: { checked: false } }); render()
navigate('fretboard'); assertHidden()
assert.match(text(byClass('open-summary')), /D2/)
assert.match(text(byClass('sound-button')), /声音关/)
await click(6, 0); assertHidden(); reveal()
assert.equal(text(byClass('selection-note')), '当前音高D2')
// 刷新：全局偏好恢复，但练习中的选中位置不被持久化。
for (const slots of instances.values()) for (const slot of slots) if (slot?.cleanup) slot.cleanup()
instances.clear(); render()
assert.equal(text(detail()), '请先点击指板选择位置')
assert.match(text(byClass('open-summary')), /D2/)
assert.match(text(byClass('sound-button')), /声音关/)
assert.ok(boardButtons().every((button) => !/[A-G]/.test(button.props['aria-label'])))
navigate('settings')
find((node) => node.type === 'button' && text(node) === '恢复默认设置').props.onClick(); render()
assert.equal(themeSelect().props.value, 'system')
navigate('fretboard')
assert.match(text(byClass('open-summary')), /E2/)
assert.match(text(byClass('sound-button')), /声音开/)
assert.match(boardButtons()[149].props['aria-label'], /E4/)
window.location.hash = '#/unknown'; render()
assert.equal(boardButtons().length, 150)
assert.equal(nodes(tree).filter((node) => node.type === 'a' && node.props['aria-current'] === 'page').length, 1)
console.log('通过：七板块导航、占位无假按钮、跨页共享调弦/主题/声音、返回保留位置、刷新偏好与恢复默认')
console.log(`主题 ${initialTheme}：品牌及主题切换通过，功能检查如下`)
console.log('通过：隐藏 → 6 弦 3 品不揭晓 → 点击详情 G2 → 5 弦 3 品重置 → 点击详情 C3')
console.log('通过：未选位置不揭晓、鼠标/触屏点击处理器、Enter/空格、其他按键及控件不揭晓')
console.log('通过：显示模式直接显示、隐藏模式与调弦重置、无声猜音、150 个按钮、自定义验证与应用')
delete globalThis.__guitarTestHooks

delete globalThis.window
delete globalThis.document
