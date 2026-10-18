import { Api } from "../../english/logic/account";
import { type MathActivity } from "../../../../packages/mathematics/src/fractions-program";
/** Existing account/CSRF/session transport and pupil event endpoint; one atomic activity receipt per append. */
export class MathematicsRepo {
  private queue: Promise<unknown> = Promise.resolve();
  private count = 0;
  readonly api: Api;
  readonly learnerId: string;
  constructor(api: Api, learnerId: string) {
    this.api = api;
    this.learnerId = learnerId;
  }
  async load() {
    const result = await this.api.request<{
      count: number;
      events: MathActivity[];
    }>("GET", `/pupils/${this.learnerId}/events/?subject=mathematics`);
    this.count = result.count;
    return result.events;
  }
  append(event: MathActivity): Promise<MathActivity[]> {
    const work = this.queue.then(async () => {
      const result = await this.api.request<{ count: number }>(
        "POST",
        `/pupils/${this.learnerId}/events/`,
        { subject: "mathematics", seq: this.count, event },
      );
      this.count = result.count;
      return this.load();
    });
    this.queue = work.catch(() => undefined);
    return work;
  }
}
