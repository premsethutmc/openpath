// Gameplay for the home scene: what happens when the child touches something, and when.
// It speaks only to the actor's interface (actor.js) and to the content file; it never draws or animates.
//
//   waiting ── play ──▶ intro ──▶ needBag ── bag tapped (or 3 hints) ──▶ fetching ──▶ presenting ──▶ free ⇄ closeUp
//
import { run } from "../engine/kit.js";

export class HomeGame {
  constructor({ actor, content, sound, log }) {
    this.actor = actor; this.content = content; this.sound = sound; this.log = log || (() => {});
    this.state = "waiting"; this.busy = false; this.queued = null;
    this.quiet = 0; this.hints = 0; this.taps = { amma: 0 }; this.lastTap = {};
  }

  async start() {
    this.actor.reset();
    this.state = "intro"; this.log("state", "intro");
    this.busy = true;
    await this.actor.enter();
    await this.actor.greet();
    this.state = "needBag"; this.log("state", "needBag");
    await this.actor.lookForBag();
    this.busy = false; this.quiet = 0; this.hints = 0;
    this.actor.idle();
    this.flush();
  }

  /** Run one of Amma's actions. While one runs, the next waits its turn (only the latest is kept). */
  act(name, fn, queueIfBusy = false) {
    if (this.busy) { if (queueIfBusy) this.queued = { name, fn }; return false; }
    this.busy = true; this.actor.stopIdle(); this.log("amma", name);
    run((async () => {
      try { await fn(); } finally {
        this.busy = false; this.quiet = 0;
        if (this.state !== "waiting") this.actor.idle();
        this.flush();
      }
    })());
    return true;
  }
  flush() { const q = this.queued; this.queued = null; if (q) this.act(q.name, q.fn); }

  /** The child touched something. `target` is amma, bag, list or room; `p` is where, in room coordinates. */
  tap(target, p) {
    const now = performance.now() / 1000, cool = this.content.timing.tapCooldown;
    if (this.lastTap[target] && now - this.lastTap[target] < cool) return;
    this.lastTap[target] = now;
    if (this.state === "waiting") return;
    const a = this.actor;
    this.quiet = 0;
    // whatever happens next, the touch is answered at once: a glance, a blink, a sparkle where the finger landed
    a.notice(p, target === "amma"); a.tapMark(p);
    if (target === "amma") this.sound.pop();
    let response = "glance";

    if (this.state === "closeUp") {
      response = "list goes back";
      this.act("returnList", async () => { await a.returnList(); this.state = "free"; }, true);
    } else if (target === "bag") {
      if (!a.hasBag && (this.state === "needBag")) { response = "fetches the bag"; this.fetch(); }
      else if (!a.hasBag) { response = "bag wiggles"; a.wiggleBag(); }
      else if (this.state === "free") { response = "looks into the bag"; this.act("peekBag", () => a.peekBag()); }
    } else if (target === "list") {
      if (this.state === "free" && a.hasList) { response = "brings the list close"; if (this.act("showListClose", () => a.showListClose())) this.state = "closeUp"; }
    } else if (target === "amma") {
      if (this.state === "needBag") { response = "points at the bag"; this.hint(); }
      else if (this.state === "free") {
        const n = this.taps.amma++;
        response = n % 2 ? "giggles" : "asks what it is";
        this.act(n % 2 ? "giggle" : "ask", () => (n % 2 ? a.giggle() : a.ask()));
      }
    }
    this.log("tap", `${target} → ${response}`, { target, state: this.state, response });
  }

  hint() {
    if (this.act("pointAtBag", () => this.actor.pointAtBag())) this.hints++;
  }
  fetch() {
    if (this.state !== "needBag") return;
    this.state = "fetching"; this.log("state", "fetching");
    this.act("fetchBag", async () => {
      await this.actor.fetchBag();
      this.state = "presenting"; this.log("state", "presenting");
      await this.actor.takeOutList();
      this.state = "free"; this.log("state", "free");
    }, true);
  }

  update(dt) {
    const t = this.content.timing;
    if (this.busy) return;
    this.quiet += dt;
    if (this.state === "needBag") {
      // no child is left stuck: she points at the bag, and after a few hints fetches it herself
      if (this.hints >= t.bagHintsBeforeFetching && this.quiet > t.bagHintEvery) { this.log("help", "fetches the bag herself"); this.fetch(); }
      else if (this.quiet > (this.hints ? t.bagHintEvery : t.bagHintAfter)) this.hint();
    } else if (this.state === "free") {
      if (this.quiet > (this.invited ? t.inviteEvery : t.inviteAfterQuiet)) { this.invited = true; this.act("invite", () => this.actor.invite()); }
    }
  }
}
