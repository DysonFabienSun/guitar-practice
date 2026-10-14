export const TICKS_PER_BEAT = 120
export const RHYTHMS = [
  {id:'half',name:'二分音符',ticks:240,count:1},
  {id:'quarter',name:'四分音符',ticks:120,count:1},
  {id:'eighth',name:'八分音符',ticks:60,count:1},
  {id:'sixteenth',name:'十六分音符',ticks:30,count:1},
  {id:'thirty-second',name:'三十二分音符',ticks:15,count:1},
  {id:'triplet',name:'八分三连音',ticks:120,count:3},
  {id:'quintuplet',name:'十六分五连音',ticks:120,count:5},
  {id:'sextuplet',name:'十六分六连音',ticks:120,count:6},
] as const
export function validBpm(value: string|number) {
  if(typeof value==='string' && !value.trim()) return null
  const bpm=Number(value)
  return Number.isFinite(bpm)&&bpm>=60&&bpm<=300?bpm:null
}
export function rhythmSeconds(ticks:number,bpm:number) {return ticks/TICKS_PER_BEAT*60/bpm}
export function randomGroup(tick:number,random:()=>number=Math.random) {
  const remaining=480-tick%480
  const choices=RHYTHMS.filter(r=>r.ticks<=remaining && tick%Math.min(r.ticks,120)===0)
  return choices[Math.min(choices.length-1,Math.floor(random()*choices.length))]
}
