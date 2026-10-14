import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createModuleLoader} from './load-ts.mjs'
const load=createModuleLoader()
const {CHORD_TYPES,buildChord}=await import(load('src/chords.ts'))
const {generateFingerings,rankedFingerings,contains,fingeringPitches,validateHandPlan,tuningProfile}=await import(load('src/fingerings.ts'))
const {FINGERING_TEMPLATES}=await import(load('src/fingeringTemplates.ts'))
const {TUNING_PRESETS,STANDARD_TUNING,validateTuning,getPitch}=await import(load('src/pitch.ts'))
const custom=validateTuning(STANDARD_TUNING.map((p,i)=>({noteName:i===5?'F♯':p.noteName,octave:String(p.octave)}))).tuning
let checked=0
function validate(shape,chord,tuning){
 assert.deepEqual(validateHandPlan(shape.frets,shape.fingers,shape.barres),[])
 assert.ok(FINGERING_TEMPLATES.some(t=>t.id===shape.templateId))
 const pitches=fingeringPitches(shape,tuning,chord),pressed=shape.frets.filter(f=>f!==null&&f>0)
 assert.equal(new Set(pitches.map(p=>p.string)).size,pitches.length)
 assert.ok(!pressed.length||Math.max(...pressed)-Math.min(...pressed)<=4)
 assert.ok(contains(shape,shape.primaryRoot));assert.ok(pitches.some(p=>p.midi%12===chord.rootClass))
 for(const p of pitches){assert.equal(p.midi,getPitch(p.string,p.fret,tuning).midi);assert.ok(chord.tones.some(t=>t.pitchClass===p.midi%12))}
 const missing=chord.tones.filter(t=>!pitches.some(p=>p.midi%12===t.pitchClass))
 assert.deepEqual(shape.omitted,missing.map(t=>t.noteName));assert.ok(missing.every(t=>shape.allowOmit.includes(t.degree)))
 checked++
}
// 逐个模板核对声明调弦、四指计划、实际根音及允许省略；不能静默丢弃错误模板。
for(const template of FINGERING_TEMPLATES)for(const profile of template.profiles){
 const tuning=TUNING_PRESETS.find(p=>p.id===profile).tuning
 const shift=template.movable?Math.max(0,1-Math.min(...template.frets.filter(f=>f!==null))):0
 const frets=template.frets.map(f=>f===null?null:f+shift).reverse(),fingers=template.fingers.slice().reverse(),barres=template.barres.map(b=>({...b,fret:b.fret+shift}))
 assert.deepEqual(validateHandPlan(frets,fingers,barres),[],template.id+' '+profile)
 const root=getPitch(template.root.string,template.root.fret+shift,tuning).noteName,chord=buildChord(root,template.type)
 const pcs=frets.flatMap((f,i)=>f===null?[]:[getPitch(i+1,f,tuning).midi%12])
 assert.ok(pcs.every(pc=>chord.tones.some(t=>t.pitchClass===pc)),template.id+' 多余音')
 assert.ok(chord.tones.every(t=>pcs.includes(t.pitchClass)||template.omitDegrees.includes(t.degree)),template.id+' 缺音')
 const id=frets.map(f=>f??'x').join('-')
 assert.ok(generateFingerings(chord,tuning).some(s=>s.id===id),template.id+' 未能定位')
}
for(const tuning of TUNING_PRESETS.slice(0,3).map(p=>p.tuning))for(const root of ['C','D','E','F','G','A','B','C♯','D♭'])for(const type of CHORD_TYPES){
 const chord=buildChord(root,type.id),shapes=generateFingerings(chord,tuning)
 assert.equal(new Set(shapes.map(s=>s.id)).size,shapes.length)
 for(const shape of shapes)validate(shape,chord,tuning)
 assert.ok(shapes.length<100,'不再自由枚举成千上万候选')
}
for(const [root,type,frets]of [['C','major','x32010'],['A','minor','x02210'],['G','major','320003'],['E','major','022100'],['D','major','xx0232'],['F','major','133211'],['B','minor','x24432']]){
 const shapes=generateFingerings(buildChord(root,type),STANDARD_TUNING)
 assert.ok(shapes.some(s=>s.frets.slice().reverse().map(f=>f??'x').join('')===frets),root+type+' '+frets)
}
for(const tuning of [STANDARD_TUNING,TUNING_PRESETS[1].tuning])for(const point of [{string:6,fret:0},{string:6,fret:12},{string:1,fret:24}]){
 const chord=buildChord(getPitch(point.string,point.fret,tuning).noteName,'major'),near=rankedFingerings(generateFingerings(chord,tuning),point,true)
 assert.ok(near.length);assert.ok(near.every(s=>contains(s,point)))
}
const c=buildChord('C','major'),sharp=buildChord('F♯','major')
assert.equal(generateFingerings(c,TUNING_PRESETS[3].tuning).length,0)
assert.equal(generateFingerings(sharp,custom).length,0);assert.equal(tuningProfile(custom),null)
assert.equal(generateFingerings(buildChord('C','7b9#11b13'),STANDARD_TUNING).length,0)
assert.ok(generateFingerings(buildChord('B','major'),TUNING_PRESETS[2].tuning).some(s=>s.frets.slice().reverse().map(f=>f??'x').join('')==='x32010'),'半音按实际音高匹配名称')
// 音高正确且跨度4，仍需要至少5个不同品位的手指：不得作为指型入库。
const bad=[4,3,2,5,1,4].reverse(),aug=buildChord('C','aug')
assert.ok(bad.every((f,i)=>aug.tones.some(t=>t.pitchClass===getPitch(i+1,f,STANDARD_TUNING).midi%12)))
assert.equal(Math.max(...bad)-Math.min(...bad),4)
assert.ok(validateHandPlan(bad,[4,1,4,2,3,4],[]).some(e=>e.includes('不同品位')))
assert.ok(!generateFingerings(aug,STANDARD_TUNING).some(s=>s.id===bad.join('-')))
assert.ok(validateHandPlan([1,1,2,3,3,1],[1,1,2,3,4,1],[{finger:1,fret:1,from:1,to:6}]).length===0)
assert.ok(validateHandPlan([0,1,2,3,3,1],[0,1,2,3,4,1],[{finger:1,fret:1,from:1,to:6}]).some(e=>e.includes('空弦')))
assert.ok(validateHandPlan([1,2,null,null,null,null],[1,1,null,null,null,null],[]).length>0)
assert.ok(validateHandPlan([1,1,null,null,null,null],[1,1,null,null,null,null],[]).some(e=>e.includes('横按')))
assert.ok(validateHandPlan([1,2,null,null,null,null],[5,2,null,null,null,null],[]).length>0)
assert.ok(!fs.readFileSync('src/fingerings.ts','utf8').includes('const cache'))
console.log(`通过：${FINGERING_TEMPLATES.length} 个人工模板逐一核对，${checked} 次定位方案检查；四指/横按/音高/省略及七个指定常用按法`)
console.log('通过：标准/降半音/Drop D、低高把位、无旧缓存、FACGCE/自定义与复杂无模板提示、正确音高但不可四指按奏反例排除')
