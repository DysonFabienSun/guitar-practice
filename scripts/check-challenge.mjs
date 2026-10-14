import assert from 'node:assert/strict'
import { createModuleLoader } from './load-ts.mjs'
const load = createModuleLoader()
const { generateTargets, targetPool, scoreAnswer, summarize, pitchClass } = await import(load('src/challenge.ts'))
const { ChallengeSession } = await import(load('src/challengeSession.ts'))
const { TUNING_PRESETS, STANDARD_TUNING, validateTuning } = await import(load('src/pitch.ts'))
for (const { tuning } of TUNING_PRESETS) {
  const pool = targetPool(tuning)
  assert.equal(new Set(pool.map((p) => p.midi)).size, pool.length)
  assert.equal(new Set(pool.map((p) => p.midi % 12)).size, 12)
  for (let i = 0; i < pool.length; i++) assert.equal(generateTargets(tuning, 5, () => (i + 0.5) / pool.length)[0].midi, pool[i].midi)
  for (const count of [5, 10, 20]) {
    const targets = generateTargets(tuning, count, () => 0)
    assert.equal(targets.length, count)
    assert.ok(targets.every((p, i) => i === 0 || p.midi !== targets[i - 1].midi))
  }
}
const custom = validateTuning(STANDARD_TUNING.map((p, i) => ({ noteName: i === 5 ? 'F♯' : p.noteName, octave: String(p.octave) }))).tuning
assert.equal(targetPool(custom)[0].label, 'F♯2')
for (const [a,b] of [['C♯','Db'],['D#','E♭'],['F♯','Gb'],['G#','A♭'],['A♯','Bb'],['B','C♭'],['C','B#'],['F','E♯'],['E','Fb']]) {
  assert.equal(pitchClass(a),pitchClass(b))
  const target = { midi: 48 + pitchClass(a), noteName: a, octave: 3, label: a + '3' }
  assert.equal(scoreAnswer(target,b,false).base,10)
  assert.equal(scoreAnswer(target,b,false).bonus,5)
  assert.equal(scoreAnswer(target,b,true).bonus,0)
  assert.equal(scoreAnswer(target,(target.midi+1)%12,false).base,0)
}
assert.throws(()=>generateTargets(STANDARD_TUNING,6))
const makePlayer = () => ({ calls: [], stops: 0, disposals: 0, mode: 'ok', pending: null,
  async play(pitch) { this.calls.push(pitch); if(this.mode === 'fail') throw Error('blocked'); if(this.mode === 'false') return false; if(this.mode === 'pending') return new Promise(resolve=> {this.pending=resolve}); return true },
  stop(){this.stops++},dispose(){this.disposals++},
})
for (const count of [5,10,20]) {
  const player=makePlayer(), session=new ChallengeSession(STANDARD_TUNING,true,()=>player,()=>0)
  session.setCount(count)
  const start=session.start()
  session.choose(4);session.submit()
  assert.equal(session.getSnapshot().results.length,0,'未成功播放不能判错')
  await start
  for(let i=0;i<count;i++) {
    const current=session.getSnapshot()
    assert.equal(current.index,i)
    assert.equal(player.calls.at(-1).midi,current.targets[i].midi,'目标播放复用题目的绝对音高')
    assert.equal(current.assisted,false)
    assert.equal(current.answer, i === 0 ? 4 : null)
    await session.replay()
    assert.equal(session.getSnapshot().assisted,false,'重播不算辅助')
    if(i===1) { await session.assist(6,3); assert.equal(player.calls.at(-1).midi,43,'辅助音复用当前调弦音高') }
    assert.equal(session.getSnapshot().assisted,i===1)
    assert.equal(session.getSnapshot().results.length,i,'试听不提交')
    const answer=i===2 ? (current.targets[i].midi+1)%12 : current.targets[i].midi%12
    session.choose(answer);session.submit()
    session.submit();session.choose((answer+1)%12);await session.assist(5,3)
    assert.equal(session.getSnapshot().results.length,i+1,'重复提交仅记一次')
    assert.equal(session.getSnapshot().answer,answer,'提交后锁定答案')
    assert.equal(session.getSnapshot().index,i,'不自动跳题')
    const stopsBeforeNext=player.stops
    await session.next()
    assert.ok(player.stops>stopsBeforeNext,'下一题停止前题声音')
  }
  const summary=summarize(session.getSnapshot().results)
  assert.equal(session.getSnapshot().phase,'complete')
  assert.equal(summary.correct,count-1)
  assert.equal(summary.base,(count-1)*10)
  assert.equal(summary.bonus,(count-2)*5)
  assert.equal(summary.total,(count-1)*10+(count-2)*5)
  await session.next();assert.equal(session.getSnapshot().phase,'complete')
  await session.start();assert.equal(session.getSnapshot().results.length,0)
  session.exit();assert.equal(session.getSnapshot().phase,'setup');assert.equal(session.getSnapshot().targets.length,0)
  assert.ok(player.stops>=count)
}
const player=makePlayer(),session=new ChallengeSession(STANDARD_TUNING,false,()=>player,()=>0)
await session.start();assert.equal(player.calls.length,0);assert.match(session.getSnapshot().message,/开启|启用/)
session.configure(STANDARD_TUNING,true);player.mode='fail';await session.start()
assert.equal(session.getSnapshot().audio,'error');session.choose(4);session.submit();assert.equal(session.getSnapshot().results.length,0)
player.mode='ok';await session.replay();assert.equal(session.getSnapshot().heard,true)
player.mode='fail';await session.assist(6,3);assert.equal(session.getSnapshot().assisted,true)
session.submit();assert.equal(session.getSnapshot().results.length,0)
player.mode='ok';await session.replay();session.submit();assert.equal(session.getSnapshot().results[0].bonus,0)
player.mode='fail';await session.replay();assert.equal(session.getSnapshot().results[0].base,10);assert.match(session.getSnapshot().message,/得分保持不变/);player.mode='ok'
await session.next();session.configure(TUNING_PRESETS[1].tuning,true)
assert.equal(session.getSnapshot().phase,'setup');assert.match(session.getSnapshot().message,/调弦已改变/)
await session.start();assert.equal(session.getSnapshot().targets[0].midi,38)
session.configure(TUNING_PRESETS[1].tuning,false);assert.equal(session.getSnapshot().heard,false)
session.choose(2);session.submit();assert.equal(session.getSnapshot().results.length,0)
session.configure(TUNING_PRESETS[1].tuning,true);await session.replay()
player.mode='pending';const pending=session.replay();session.exit();player.pending(true);await pending
assert.equal(session.getSnapshot().phase,'setup');assert.equal(session.getSnapshot().heard,false)
const delayed=session.start();session.configure(custom,true);player.pending(true);await delayed
assert.equal(session.getSnapshot().phase,'setup');assert.match(session.getSnapshot().message,/调弦/)
const leaving=session.start();session.deactivate();player.pending(true);await leaving
assert.equal(session.getSnapshot().phase,'setup');assert.equal(player.disposals,1)
player.mode='false';await session.start();assert.equal(session.getSnapshot().audio,'error')
console.log('通过：5/10/20 题、按唯一 MIDI 均匀抽样、无连续相同音高、十二音及等音判分')
console.log('通过：辅助/重播区分、10+5/10/0 分、锁定及重复提交、手动下一题、结算、重开与退出')
console.log('通过：静音阻止开始、启用与重播恢复、失败题不判错、切题停止、调弦结束、异步退出/离开取消')
