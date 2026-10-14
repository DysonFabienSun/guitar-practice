import assert from 'node:assert/strict'
import {createModuleLoader} from './load-ts.mjs'
const load=createModuleLoader()
const {default:Diagram}=await import(load('src/components/FingeringDiagram.tsx'))
const {buildChord}=await import(load('src/chords.ts'))
const {generateFingerings}=await import(load('src/fingerings.ts'))
const {TUNING_PRESETS,getPitch,validateTuning,STANDARD_TUNING}=await import(load('src/pitch.ts'))
const custom=validateTuning(STANDARD_TUNING.map((p,i)=>({noteName:i===5?'F♯':p.noteName,octave:String(p.octave)}))).tuning
const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)]
let checked=0
for(const tuning of [STANDARD_TUNING,TUNING_PRESETS[1].tuning,custom])for(const root of ['C','E','F♯']){
 const chord=buildChord(root,'major'),shapes=generateFingerings(chord,tuning)
 const subset=[...shapes.slice(0,6),...shapes.filter(s=>s.frets.includes(24)).slice(0,6),...shapes.filter(s=>s.barre).slice(0,6)]
 for(const shape of subset){
  const tree=Diagram({shape,chord,tuning}),all=nodes(tree),start=Number(all.find(n=>n.props?.className==='diagram-fret').props.children)
  assert.ok(start>=1&&start<=20,'五品窗口不超过24品')
  assert.equal(all.some(n=>n.props?.className==='diagram-nut'),start===1)
  const groups=all.filter(n=>n.type==='g');assert.equal(groups.length,6)
  for(const [index,group]of groups.entries()){
   const fret=shape.frets[index],string=index+1,x=26+(6-string)*20
   const marks=nodes(group),rootTone=fret!==null&&getPitch(string,fret,tuning).midi%12===chord.rootClass
   assert.equal(group.props.className==='diagram-root',rootTone)
   if(fret===null){assert.equal(marks.find(n=>n.type==='text').props.children,'×');assert.equal(marks.find(n=>n.type==='text').props.x,x)}
   else{const circle=marks.find(n=>n.type==='circle');assert.equal(circle.props.cx,x);assert.equal(circle.props.cy,fret===0?21:40+(fret-start+0.5)*24);assert.ok(circle.props.cy<=148);assert.equal(marks.some(n=>n.props?.className==='diagram-open'),fret===0);assert.equal(marks.some(n=>n.props?.className==='diagram-ring'),rootTone)}
  }
  assert.equal(all.some(n=>n.props?.className==='diagram-barre'),Boolean(shape.barre))
  checked++
 }
}
console.log(`通过：${checked} 张 SVG 小图与六弦数据逐点核对、左右弦序、空弦/不弹/根音/横按、琴枕及高把位窗口 ≤24 品`)
