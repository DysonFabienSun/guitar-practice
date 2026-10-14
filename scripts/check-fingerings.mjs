import assert from 'node:assert/strict'
import {createModuleLoader} from './load-ts.mjs'
const load=createModuleLoader()
const {CHORD_TYPES,buildChord}=await import(load('src/chords.ts'))
const {generateFingerings,rankedFingerings,contains,fingeringPitches}=await import(load('src/fingerings.ts'))
const {STANDARD_TUNING,TUNING_PRESETS,validateTuning,getPitch}=await import(load('src/pitch.ts'))
const custom=validateTuning(STANDARD_TUNING.map((p,i)=>({noteName:i===5?'F♯':p.noteName,octave:String(p.octave)}))).tuning
let checked=0
function validate(shapes,chord,tuning){
 assert.equal(new Set(shapes.map(s=>s.id)).size,shapes.length)
 for(const shape of shapes){
  assert.equal(shape.frets.length,6)
  const pitches=fingeringPitches(shape,tuning,chord),pressed=shape.frets.filter(f=>f!==null&&f>0)
  assert.equal(new Set(pitches.map(p=>p.string)).size,pitches.length)
  assert.ok(pressed.length===0||Math.max(...pressed)-Math.min(...pressed)<=4)
  assert.ok(pitches.some(p=>p.midi%12===chord.rootClass))
  for(const pitch of pitches){assert.ok(pitch.fret>=0&&pitch.fret<=24);assert.equal(pitch.midi,getPitch(pitch.string,pitch.fret,tuning).midi);assert.ok(chord.tones.some(t=>t.pitchClass===pitch.midi%12))}
  const missing=chord.tones.filter(t=>!pitches.some(p=>p.midi%12===t.pitchClass))
  assert.deepEqual(shape.omitted,missing.map(t=>t.noteName))
  assert.ok(missing.every(t=>chord.type.optional.some(d=>d===t.degree)))
  if(shape.barre){const b=shape.barre;assert.ok(b.from<b.to);assert.ok(shape.frets.slice(b.from-1,b.to).every(f=>f!==null&&f>=b.fret));assert.equal(shape.frets[b.from-1],b.fret);assert.equal(shape.frets[b.to-1],b.fret)}
  checked++
 }
}
for(const type of CHORD_TYPES){const chord=buildChord('C',type.id);validate(generateFingerings(chord,STANDARD_TUNING),chord,STANDARD_TUNING)}
for(const tuning of [STANDARD_TUNING,TUNING_PRESETS[1].tuning,custom])for(const point of [{string:6,fret:0},{string:6,fret:12},{string:1,fret:24}])for(const type of ['major','minor','maj7','13']){
 const chord=buildChord(getPitch(point.string,point.fret,tuning).noteName,type),shapes=generateFingerings(chord,tuning),near=rankedFingerings(shapes,point,true)
 validate(shapes,chord,tuning)
 assert.ok(near.length>0,JSON.stringify([point,type,tuning[5].noteName]))
 assert.ok(near.every(s=>contains(s,point)))
 assert.ok(contains(rankedFingerings(shapes,point)[0],point))
}
// 独立遍历跨度 0 的全部六弦组合，与引擎结果比对，防止结果截断／漏掉空弦方案。
const chord=buildChord('C','major'),brute=new Set()
for(let fret=0;fret<=24;fret++){
 const options=STANDARD_TUNING.map((_,i)=>[null,...new Set([0,fret])].filter(f=>f===null||chord.tones.some(t=>t.pitchClass===getPitch(i+1,f,STANDARD_TUNING).midi%12)))
 const values=[]
 function visit(i){if(i===6){const pcs=values.flatMap((f,n)=>f===null?[]:[getPitch(n+1,f,STANDARD_TUNING).midi%12]);if(chord.tones.every(t=>pcs.includes(t.pitchClass)))brute.add(values.map(f=>f??'x').join('-'));return}for(const v of options[i]){values.push(v);visit(i+1);values.pop()}}
 visit(0)
}
assert.deepEqual(new Set(generateFingerings(chord,STANDARD_TUNING,0).map(s=>s.id)),brute)
assert.equal(generateFingerings(buildChord('C','7b9#11b13'),STANDARD_TUNING,0).length,0)
// 等音根音不能共用错误的省略音拼写缓存。
for(const root of ['C♯','D♭']) {const value=buildChord(root,'13');validate(generateFingerings(value,STANDARD_TUNING),value,STANDARD_TUNING)}
const all=generateFingerings(chord,STANDARD_TUNING)
assert.ok(all.some(s=>s.frets.includes(0)));assert.ok(all.some(s=>s.frets.includes(null)));assert.ok(all.some(s=>s.frets.some(f=>f>=20)))
assert.ok(all.some(s=>s.barre))
console.log(`通过：${checked} 个候选约束检查、无重复、根音位置必须包含、标准/Drop D/自定义、低高品位、真实 MIDI 与允许省略`)
console.log('通过：跨度 0 独立穷举核对全部结果、空弦/不弹/高把位/横按分析、无解不会虚拟配音')
