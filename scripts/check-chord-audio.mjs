import assert from 'node:assert/strict'
import {createModuleLoader} from './load-ts.mjs'
const load=createModuleLoader()
const {ChordPlayer}=await import(load('src/chordAudio.ts'))
const {buildChord}=await import(load('src/chords.ts'))
const {generateFingerings,rankedFingerings,fingeringPitches}=await import(load('src/fingerings.ts'))
const {STANDARD_TUNING,TUNING_PRESETS,getPitch}=await import(load('src/pitch.ts'))
const {createPluckSamples,midiToFrequency}=await import(load('src/audio.ts'))
const contexts=[]
class Context{
 state='running';sampleRate=44100;currentTime=3;destination={};sources=[]
 constructor(){contexts.push(this)}
 createBuffer(_,length){return {copyToChannel(samples){assert.equal(samples.length,length);this.samples=samples}}}
 createGain(){return {gain:{setValueAtTime(value){this.value=value},linearRampToValueAtTime(value,time){this.value=value;this.attack=time},cancelScheduledValues(time){this.cancel=time},exponentialRampToValueAtTime(value,time){assert.equal(value,0.0001);this.release=time}},connect(){},disconnect(){}}}
 source(){const source={connected:false,startCount:0,connect(gain){this.connected=true;this.gain=gain},disconnect(){this.connected=false},start(time){this.time=time;this.startCount++},stop(time){this.stopTime=time}};this.sources.push(source);return source}
 createBufferSource(){return this.source()}
 createOscillator(){const source=this.source();source.frequency={setValueAtTime(value){source.hz=value}};source.setPeriodicWave=wave=>{source.wave=wave};return source}
 createPeriodicWave(real,imaginary,options){return {real,imaginary,options}}
 async close(){this.state='closed'}
}
globalThis.window={AudioContext:Context}
const player=new ChordPlayer()
for(const tuning of [STANDARD_TUNING,TUNING_PRESETS[1].tuning]){
 const point={string:6,fret:0},chord=buildChord(getPitch(6,0,tuning).noteName,'minor'),shape=rankedFingerings(generateFingerings(chord,tuning),point,true)[0],pitches=fingeringPitches(shape,tuning,chord)
 for(const mode of ['together','sequence']){await player.play(pitches,mode);const voices=contexts[0].sources.slice(-pitches.length);for(const [i,source]of voices.entries()){assert.deepEqual(source.buffer.samples,createPluckSamples(midiToFrequency(pitches[i].midi),44100));assert.equal(source.time,3.02+(mode==='sequence'?i*0.32:0));assert.equal(source.gain.gain.value,1/pitches.length)}}
 await player.hold(pitches)
 const voices=contexts[0].sources.slice(-pitches.length),before=contexts[0].sources.length
 for(const [i,source]of voices.entries()){assert.equal(source.hz,midiToFrequency(pitches[i].midi));assert.equal(source.startCount,1);assert.equal(source.wave.options.disableNormalization,true);assert.equal(source.gain.gain.value,0.1/pitches.length)}
 contexts[0].currentTime=30;assert.equal(contexts[0].sources.length,before,'持续不重触发')
 player.release();assert.ok(voices.every(s=>s.stopTime===30.65&&s.gain.gain.release===30.65))
 contexts[0].currentTime=3
}
const pitches=[getPitch(6,0,STANDARD_TUNING),getPitch(5,0,STANDARD_TUNING),getPitch(4,0,STANDARD_TUNING),getPitch(3,0,STANDARD_TUNING),getPitch(2,0,STANDARD_TUNING),getPitch(1,0,STANDARD_TUNING)]
for(let i=0;i<100;i++){await player.play(pitches,'sequence');await player.hold(pitches);assert.ok(contexts[0].sources.filter(s=>s.connected).length<=12)}
assert.equal(contexts.length,1);player.stop();assert.ok(contexts[0].sources.filter(s=>s.connected).every(s=>s.stopTime===3.01));player.dispose();assert.equal(contexts[0].sources.filter(s=>s.connected).length,0)
class Suspended extends Context{state='suspended';resume(){return new Promise(resolve=>{this.finish=()=>{this.state='running';resolve()}})}}
window.AudioContext=Suspended
for(const mode of ['hold','sequence']){const waiting=new ChordPlayer(),promise=mode==='hold'?waiting.hold(pitches):waiting.play(pitches,'sequence');waiting.release();contexts.at(-1).finish();assert.equal(await promise,false);assert.equal(contexts.at(-1).sources.length,0);waiting.dispose()}
window.AudioContext=undefined;await assert.rejects(new ChordPlayer().hold(pitches),/不可用/)
window.AudioContext=class extends Context{state='suspended';async resume(){throw Error('blocked')}}
const failed=new ChordPlayer();await assert.rejects(failed.play(pitches,'together'),/blocked/);failed.dispose()
delete globalThis.window
console.log('通过：实际指型短音与琶音波形/调度一致、六弦总音量限幅、稳定振荡器持续不重触发、自然释放')
console.log('通过：100 次交替琶音/持续音无旧调度混乱、最多六当前+六尾音、停止/释放、恢复中松开取消及失败处理')
