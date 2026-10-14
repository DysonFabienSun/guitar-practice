type Actions = { prime: () => void; short: () => void; hold: () => void; release: () => void; cancel: () => void }
/** 220ms 区分单击短音与长按；单击只触发一次，不先发短音再反复重触发。 */
export class HoldGesture {
  private timer: ReturnType<typeof setTimeout> | null = null
  private actions: Actions | null = null
  private sustained = false
  begin(actions: Actions) {
    this.end(true)
    this.actions = actions; this.sustained = false
    actions.prime()
    this.timer = setTimeout(() => { this.timer = null; this.sustained = true; this.actions?.hold() },220)
  }
  end(cancel = false) {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    const actions = this.actions, held = this.sustained
    this.actions = null; this.sustained = false
    if (!actions) return
    if (cancel) actions.cancel()
    else if (held) actions.release()
    else actions.short()
  }
}
