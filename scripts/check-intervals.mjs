import assert from 'node:assert/strict'
import {createModuleLoader} from './load-ts.mjs'
const load=createModuleLoader(),{intervalLabel,toRoman}=await import(load('src/intervals.ts'))
const {buildScale,scaleToneAt}=await import(load('src/scales.ts'))
const {buildChord}=await import(load('src/chords.ts'))
const {degreeAt,REFERENCE_SCALES}=await import(load('src/referenceScales.ts'))
for(const [degree,label]of [['1','I'],['♭2','ii'],['2','II'],['♭3','iii'],['3','III'],['4','IV'],['♯4','♯IV'],['♭5','♭V'],['5','V'],['♭6','vi'],['6','VI'],['♭7','vii'],['7','VII'],['♯2','♯II'],['♭♭7','♭♭VII'],['♭9','ii'],['♯11','♯IV'],['♭13','vi']])assert.equal(intervalLabel(degree),label)
const scale=buildScale('C','minor'),chord=buildChord('C','minor')
for(const [midi,label]of [[50,'II'],[51,'iii'],[52,'III'],[56,'vi'],[57,'VI'],[58,'vii'],[59,'VII']])for(const octave of [0,12,24]){assert.equal(scaleToneAt(scale,midi+octave).degree,label);assert.equal(degreeAt(chord,undefined,midi+octave).label,label)}
assert.equal(scaleToneAt(buildScale('C','lydian'),54).degree,'♯IV')
assert.equal(scaleToneAt(buildScale('C','locrian'),54).degree,'♭V')
assert.equal(degreeAt(buildChord('C','7b5'),undefined,54).label,'♭V')
assert.equal(degreeAt(buildChord('C','7b5'),REFERENCE_SCALES.find(s=>s.id==='lydian'),54).label,'♭V','和弦成员优先保留和弦实际拼写')
assert.equal(toRoman('♭3'),'♭III');assert.equal(buildChord('C','minor').tones[1].degree,'♭3')
console.log('通过：自定义大小写音程、跨八度、增四/减五及重升降拼写，两板块同源，常规和弦公式不变')
