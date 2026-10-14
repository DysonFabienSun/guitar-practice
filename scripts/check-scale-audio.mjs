import assert from 'node:assert/strict'
import {createModuleLoader,dataUrl} from './load-ts.mjs'
let now=0,fail=false,resume=null,sources=[],intervals=new Map(),serial=0
const param=()=>({setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){}})
const context={get currentTime(){return now},sampleRate:8000,destination:{},createBuffer(c,n){return {length:n,copyToChannel(samples){this.samples=samples}}},createGain(){return {gain:param(),connect(){},disconnect(){}}},createBufferSource(){if(fail)throw Error('failed');const s={buffer:null,startAt:null,endAt:null,connect(){},disconnect(){},start(t){this.startAt=t},stop(t){this.endAt=t}};sources.push(s);return s}}
globalThis.__scaleContext=context
globalThis.__scaleResume=()=>resume
const chord=dataUrl(`export class ChordPlayer {async prepare(){const pending=globalThis.__scaleResume();if(pending)await pending;return globalThis.__scaleContext}dispose(){}}`)
const load=createModuleLoader({'./chordAudio':chord})
const {ScalePlayer}=await import(load('src/scaleAudio.ts'))
const {createPluckSamples,midiToFrequency}=await import(load('src/audio.ts'))
const {RHYTHMS,randomGroup,rhythmSeconds,validBpm}=await import(load('src/scaleRhythm.ts'))
const realSet=globalThis.setInterval,realClear=globalThis.clearInterval
globalThis.setInterval=fn=>{intervals.set(++serial,fn);return serial};globalThis.clearInterval=id=>intervals.delete(id)
const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve()}
function advance(seconds){const target=now+seconds;while(now<target){now=Math.min(target,now+.01);for(const source of sources)if(source.endAt!==null&&source.endAt<=now&&!source.ended){source.ended=true;source.onended?.()}for(const fn of [...intervals.values()])fn()}}
const pitches=[48,50,52,53,55,57,59,60].map(midi=>({midi,noteName:'C',octave:3,label:'C3'}))
try{
 for(const value of ['',59,301,'NaN',Infinity])assert.equal(validBpm(value),null)
 for(const bpm of [60,120,300]){
  assert.equal(validBpm(bpm),bpm)
  for(const rhythm of RHYTHMS){const duration=rhythmSeconds(rhythm.ticks,bpm);assert.ok(Math.abs(duration/rhythm.count-(60/bpm)*(rhythm.ticks/120)/rhythm.count)<1e-12)}
  const player=new ScalePlayer(),events=[],offset=sources.length;const run=player.play(pitches,bpm,midi=>events.push(midi));await flush();advance(4);assert.equal(await run,true)
  const notes=sources.slice(offset);assert.equal(notes.length,8);for(let i=1;i<8;i++)assert.ok(Math.abs(notes[i].startAt-notes[i-1].startAt-60/bpm/4)<1e-9)
  assert.deepEqual(events.filter(m=>m!==null),pitches.map(p=>p.midi));assert.equal(events.at(-1),null);assert.equal(intervals.size,0);player.dispose()
 }
 // 确定性抽样覆盖每种完整组，在 4/4 内不越小节。
 for(const bpm of [60,120,300])for(let i=0;i<RHYTHMS.length;i++){
  const player=new ScalePlayer(),before=sources.length;const run=player.play(pitches,bpm,()=>{},true,()=> (i+.01)/8);await flush();const first=sources.slice(before, before+RHYTHMS[i].count)
  assert.equal(first.length,RHYTHMS[i].count);for(let j=1;j<first.length;j++)assert.ok(Math.abs(first[j].startAt-first[j-1].startAt-rhythmSeconds(RHYTHMS[i].ticks,bpm)/RHYTHMS[i].count)<1e-9)
  player.stop();assert.equal(await run,false);assert.equal(intervals.size,0)
 }
 let tick=0,seed=4;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32},seen=new Set()
 for(let i=0;i<10000;i++){const group=randomGroup(tick,random);seen.add(group.id);assert.ok(tick%480+group.ticks<=480);tick+=group.ticks}assert.equal(seen.size,8)
 const player=new ScalePlayer();let run=player.play(pitches,300,midi=>{if(midi!==null)assert.ok(pitches.some(p=>p.midi===midi))},true,random);await flush();const origin=sources.length-1;advance(180);assert.equal(intervals.size,1);const prefixes=pitches.map(p=>Array.from(createPluckSamples(midiToFrequency(p.midi),8000).slice(0,10)));assert.ok(sources.slice(origin).every(s=>prefixes.some(prefix=>prefix.every((v,i)=>v===s.buffer.samples[i]))));assert.ok(sources.filter(s=>s.startAt<=now&&s.endAt>now).length<=1)
 const clockOrigin=sources[origin].startAt;assert.ok(sources.slice(origin).every(s=>Math.abs((s.startAt-clockOrigin)*600-Math.round((s.startAt-clockOrigin)*600))<1e-6),'长时间不累积起音网格误差');player.setBpm(60);advance(3);player.setBpm(120);advance(3);assert.equal(intervals.size,1);player.stop();assert.equal(await run,false);assert.equal(intervals.size,0)
 for(let i=0;i<100;i++){run=player.play(pitches,300,()=>{},true,random);await flush();player.stop();assert.equal(await run,false)}
 const before=sources.length;advance(1);assert.equal(sources.length,before)
 // 下个完整五连音组改速，已有组保持五音等分，不新增循环。
 now=0;sources=[];run=player.play(pitches,120,()=>{},true,()=>.8);await flush();const first=sources.slice();assert.equal(first.length,5);advance(.15);player.setBpm(60);advance(.4);const next=sources.slice(5,10);assert.equal(next.length,5);assert.ok(Math.abs(next[1].startAt-next[0].startAt-.2)<1e-9);assert.ok(Math.abs(first[1].startAt-first[0].startAt-.1)<1e-9);player.stop();await run
 // 提前安排但尚未起音的组也须采用新速度。
 now=0;sources=[];run=player.play(pitches,120,()=>{},true,()=>.8);await flush();player.setBpm(300);assert.ok(sources.slice(-5).every((s,i,a)=>i===0||Math.abs(s.startAt-a[i-1].startAt-.04)<1e-9));player.stop();await run
 fail=true;await assert.rejects(player.play(pitches,120,()=>{}));fail=false;assert.equal(intervals.size,0)
 let wake;resume=new Promise(resolve=>wake=resolve);run=player.play(pitches,120,()=>{});player.stop();wake();assert.equal(await run,false);resume=null;player.dispose();assert.equal(await player.play(pitches,120,()=>{}),false)
 await assert.rejects(player.play(pitches,301,()=>{}),RangeError)
 console.log('通过：60/120/300 BPM十六分间隔、八种节奏完整组、4/4整数网格、3分钟随机、100次启停、组边界改速、旧调度取消及错误清理')
}finally{globalThis.setInterval=realSet;globalThis.clearInterval=realClear}
