import { createPluckSamples, midiToFrequency } from './audio'
import { ChordPlayer } from './chordAudio'
import { randomGroup, rhythmSeconds, validBpm } from './scaleRhythm'
import type { ScalePitch } from './scales'
type Voice={source:AudioBufferSourceNode;gain:GainNode;start:number;end:number}
type Group={start:number;end:number;tick:number;voices:Voice[]}
/** 定时器只填充提前量及刷新界面；所有起音和结束均由 AudioContext 时钟安排。 */
export class ScalePlayer {
  private engine=new ChordPlayer()
  private context:AudioContext|null=null
  private request=0
  private timer:ReturnType<typeof setInterval>|undefined
  private voices=new Set<Voice>()
  private events:{time:number;midi:number;end:number}[]=[]
  private resolve:((value:boolean)=>void)|undefined
  private callback:((midi:number|null)=>void)|undefined
  private bpm=120
  private nextTime=0
  private tick=0
  private group:Group|null=null
  private pump:(()=>void)|undefined
  private random=false
  private buffers=new Map<string,AudioBuffer>()
  private disposed=false
  stop() {
    ++this.request;clearInterval(this.timer);this.timer=undefined;this.pump=undefined
    const now=this.context?.currentTime??0
    for(const voice of this.voices){voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setValueAtTime(voice.start>now?0:1,now);voice.gain.gain.linearRampToValueAtTime(0,now+.005);try{voice.source.stop(voice.start>now?now:now+.005)}catch{ /* 已结束 */ }voice.source.disconnect();voice.gain.disconnect()}
    this.voices.clear();this.events=[];this.group=null;this.callback?.(null);this.callback=undefined
    this.resolve?.(false);this.resolve=undefined
  }
  dispose(){this.stop();this.disposed=true;this.buffers.clear();this.engine.dispose()}
  setBpm(bpm:number){
    if(validBpm(bpm)===null) throw new RangeError('BPM 须为 60—300')
    this.bpm=bpm
    // 尚未开始的整组可重新排程；已经开始的连音组保持完整。
    if(this.random && this.group && this.context && this.group.start>this.context.currentTime){
      const group=this.group
      for(const voice of group.voices){voice.source.stop(this.context.currentTime);voice.source.disconnect();voice.gain.disconnect();this.voices.delete(voice)}
      this.events=this.events.filter(event=>event.time<group.start)
      this.nextTime=group.start;this.tick=group.tick;this.group=null;this.pump?.()
    }
  }
  private schedule(pitch:ScalePitch,start:number,interval:number){
    const context=this.context!,duration=Math.max(.012,Math.min(2,interval*.92))
    const cacheKey=`${pitch.midi}:${duration}`
    let buffer=this.buffers.get(cacheKey)
    if(!buffer){buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate);buffer.copyToChannel(createPluckSamples(midiToFrequency(pitch.midi),context.sampleRate,duration),0);if(this.buffers.size>=128)this.buffers.delete(this.buffers.keys().next().value!);this.buffers.set(cacheKey,buffer)}
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.connect(gain);gain.connect(context.destination)
    const voice={source,gain,start,end:start+duration};this.voices.add(voice)
    source.onended=()=>{this.voices.delete(voice);source.disconnect();gain.disconnect()}
    source.start(start);source.stop(voice.end)
    this.events.push({time:start,midi:pitch.midi,end:start+interval})
    return voice
  }
  async play(pitches:readonly ScalePitch[],bpm:number,onNote:(midi:number|null)=>void,random=false,randomSource:()=>number=Math.random):Promise<boolean>{
    if(validBpm(bpm)===null || !pitches.length || pitches.some(p=>!Number.isInteger(p.midi)||p.midi<0||p.midi>127))throw new RangeError('需要有效音高及 60—300 BPM')
    this.stop();const request=this.request
    if(this.disposed)return false
    this.bpm=bpm;this.random=random
    const context=await this.engine.prepare()
    if(request!==this.request||this.disposed)return false
    this.context=context;this.callback=onNote;this.nextTime=context.currentTime+.04;this.tick=0
    let index=0,lastMidi:number|null=null,lastEnd=0
    return new Promise<boolean>((resolve,reject)=>{
      this.resolve=resolve
      const pump=()=>{
        if(request!==this.request)return
        try{
          const now=context.currentTime
          // 页面线程停顿时不补播一串过期音；保留拍网格，跳到下个完整 4/4 小节。
          if(this.nextTime<now-.1){this.nextTime=now+.04;this.tick=Math.ceil(this.tick/480)*480}
          while(this.nextTime<now+.08 && (random||index<pitches.length)){
            const rhythm=random?randomGroup(this.tick,randomSource):{ticks:30,count:1}
            const start=this.nextTime,total=rhythmSeconds(rhythm.ticks,this.bpm),interval=total/rhythm.count
            const voices=[]
            for(let i=0;i<rhythm.count;i++){
              const pitch=random?pitches[Math.min(pitches.length-1,Math.floor(randomSource()*pitches.length))]:pitches[index++]
              voices.push(this.schedule(pitch,start+i*interval,interval))
            }
            this.group={start,end:start+total,tick:this.tick,voices};this.tick+=rhythm.ticks;this.nextTime=start+total
          }
          while(this.events.length&&this.events[0].time<=now){const event=this.events.shift()!;lastMidi=event.midi;lastEnd=event.end;onNote(lastMidi)}
          if(lastMidi!==null && now>=lastEnd && !this.events.length){lastMidi=null;onNote(null)}
          if(!random && index===pitches.length && now>=this.nextTime){clearInterval(this.timer);this.timer=undefined;this.pump=undefined;this.callback=undefined;this.resolve=undefined;onNote(null);resolve(true)}
        }catch(error){this.resolve=undefined;this.stop();reject(error)}
      }
      this.pump=pump;this.timer=setInterval(pump,15);pump()
    })
  }
}
