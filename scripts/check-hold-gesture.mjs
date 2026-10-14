import assert from 'node:assert/strict'
import {createModuleLoader} from './load-ts.mjs'
const {HoldGesture}=await import(createModuleLoader()('src/holdGesture.ts'))
const originalSet=setTimeout,originalClear=clearTimeout,timers=new Map();let serial=0
let counts={prime:0,short:0,hold:0,release:0,cancel:0}
globalThis.setTimeout=(callback,ms)=>{assert.equal(ms,220);timers.set(++serial,callback);return serial}
globalThis.clearTimeout=id=>timers.delete(id)
const actions=Object.fromEntries(Object.keys(counts).map(key=>[key,()=>counts[key]++]))
const gesture=new HoldGesture()
gesture.begin(actions);gesture.end();assert.deepEqual(counts,{prime:1,short:1,hold:0,release:0,cancel:0});assert.equal(timers.size,0)
gesture.begin(actions);const cb=[...timers.values()][0];timers.clear();cb();assert.equal(counts.hold,1);gesture.end();assert.equal(counts.release,1);assert.equal(counts.short,1)
gesture.end();assert.equal(counts.release,1)
gesture.begin(actions);gesture.end(true);assert.equal(counts.cancel,1);assert.equal(timers.size,0)
gesture.begin(actions);const held=[...timers.values()][0];timers.clear();held();gesture.end(true);assert.equal(counts.cancel,2)
globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear
console.log('通过：短按一次短音、长按一次持续音、松开释放、移出/取消/失焦路径取消、不重复结束')
