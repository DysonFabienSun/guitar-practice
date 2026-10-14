import assert from 'node:assert/strict'
import { createModuleLoader, dataUrl } from './load-ts.mjs'
const originalRandom = Math.random
Math.random = () => 0
const slots = [], effects = []
let cursor = 0
let playbackFails = false
const hooks = {
  useState(initial) { const index=cursor++; if(!(index in slots)) slots[index]=typeof initial==='function'?initial():initial; return [slots[index],value=> {slots[index]=value}] },
  useSyncExternalStore(subscribe,getSnapshot) { void subscribe; return getSnapshot() },
  useEffect(callback,deps) { const index=cursor++,previous=slots[index]; if(!previous || deps.some((value,i)=>value!==previous.deps[i])) { slots[index]={deps}; effects.push(()=> {previous?.cleanup?.();slots[index].cleanup=callback()}) } },
}
globalThis.__challengeHooks=hooks
const fakePlayer=dataUrl(`export class PluckPlayer { async play() { if(globalThis.__playbackFails) throw Error('blocked'); return true } stop() {} dispose() {} }`)
const load=createModuleLoader({react:dataUrl('export const {useState,useEffect,useSyncExternalStore}=globalThis.__challengeHooks'), './audio':fakePlayer})
const {default:EarChallenge}=await import(load('src/components/EarChallenge.tsx'))
const {STANDARD_TUNING,TUNING_PRESETS}=await import(load('src/pitch.ts'))
const shared={preferences:{tuning:STANDARD_TUNING,soundEnabled:false},setSoundEnabled(value){this.preferences.soundEnabled=value}}
let tree
const render=()=> {cursor=0;effects.length=0;tree=EarChallenge({shared});effects.forEach(fn=>fn());cursor=0;tree=EarChallenge({shared})}
const nodes=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...nodes(node.props?.children)]
const text=node=>node==null||typeof node==='boolean'?'':typeof node!=='object'?String(node):Array.isArray(node)?node.map(text).join(''):text(node.props?.children)
const find=predicate=>{const node=nodes(tree).find(predicate);assert.ok(node);return node}
const button=name=>find(node=>node.type==='button'&&text(node)===name)
const click=async name=>{assert.ok(!button(name).props.disabled);await button(name).props.onClick();await Promise.resolve();render()}
render()
assert.equal(button('开始挑战').props.disabled,true)
assert.match(text(tree),/全局静音/)
await click('启用声音');await click('开始挑战');await Promise.resolve();render()
assert.equal(nodes(tree).filter(n=>n.props?.type==='radio').length,12)
const auxiliary=()=>nodes(tree).filter(n=>n.type==='button'&&n.props['aria-label']?.startsWith('试听第'))
assert.equal(auxiliary().length,78)
assert.ok(auxiliary().every(n=>!/[A-G]/.test(n.props['aria-label'])&&text(n)===''))
assert.ok(!/E2|MIDI|频率|正确答案|当前音高/.test(text(tree)))
assert.equal(button('提交答案').props.disabled,true)
const answer=value=>{find(n=>n.props?.type==='radio'&&n.props.value===value).props.onChange();render()}
answer(4);await click('重播目标音');await Promise.resolve();render()
assert.match(text(tree),/本题未使用辅助/)
await click('提交答案');assert.match(text(tree),/答对了/);assert.match(text(tree),/本题得分：15/)
assert.equal(nodes(tree).some(n=>n.type==='button'&&text(n)==='提交答案'),false)
assert.equal(find(n=>n.type==='fieldset').props.disabled,true)
await click('下一题');await Promise.resolve();render()
await auxiliary()[0].props.onClick();render()
assert.match(text(tree),/本题已使用辅助/);assert.ok(!/正确答案|当前音高/.test(text(tree)))
answer(5);await click('提交答案');assert.match(text(tree),/本题得分：10/)
for(let i=2;i<5;i++) {await click('下一题');await Promise.resolve();render();answer(11);await click('提交答案')}
await click('查看结算');assert.match(text(tree),/准确率40%/);assert.match(text(tree),/基础分20/);assert.match(text(tree),/独立听辨奖励5/);assert.match(text(tree),/总分25/)
assert.equal(nodes(tree).filter(n=>n.type==='li').length,5)
await click('重新开始');await Promise.resolve();render();assert.match(text(tree),/第 1 \/ 5 题/)
shared.preferences.tuning=TUNING_PRESETS[1].tuning;render();assert.match(text(tree),/调弦已改变/);assert.equal(auxiliary().length,0)
playbackFails=true;globalThis.__playbackFails=playbackFails
await click('开始挑战');await Promise.resolve();render();assert.match(text(tree),/声音未能播放/);answer(2);assert.equal(button('提交答案').props.disabled,true)
globalThis.__playbackFails=false;await click('重播目标音');await Promise.resolve();render();assert.equal(button('提交答案').props.disabled,false)
await click('退出练习');assert.match(text(tree),/练习已退出/)
for(const slot of slots)slot?.cleanup?.()
Math.random=originalRandom
delete globalThis.__challengeHooks;delete globalThis.__playbackFails
console.log('通过：静音启用、十二选项、78 个无音名辅助按钮、提交前无答案线索、提交锁定、结算及重开退出')
console.log('通过：调弦变化提示结束、音频失败禁止提交、重播恢复；既有自由探索另行回归')
