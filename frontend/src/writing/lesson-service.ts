import type { DivisionPaper, PaperState } from "./ProgressiveDivision";
import { Api } from "../english/logic/account";
import { createWork } from "./model";
import type { Work, Layout, ValidationFeedback } from "./contract";
export interface WritingReceipt {
  kind: "math_writing";
  id: string;
  at: string;
  learnerId: string;
  draftId: string;
  action: string;
  problem: { id: string; statement: string };
  assisted: boolean;
  admissible: false;
  payload: {
    receiptId?: string;
    competency?: string;
    input?: Work;
    afterFeedback?: boolean;
    result?: {
      outcome: string;
      observations: {
        region: string;
        operation: string;
        expected: string;
        response: string;
        correct: boolean;
        position: number | null;
      }[];
    };
  };
}
export interface LessonActivity {
  id: string;
  version: number;
  stage: string;
  work: Work | null;
  lesson: {
    problem: Work["problem"];
    layout: Layout;
    answerLayout: Layout;
    divisionPaper?: DivisionPaper;
    topic: string;
    competency: string;
    explanation: string;
    example: { statement: string; steps: string[]; answer: string };
  };
  support: {
    divisionPaper?: PaperState;
    simple?: {
      answer?: string;
      ink?: Work;
      result?: { outcome: string; message: string };
    };
    error?: {
      region: string;
      operation: string;
      position?: number;
      message: string;
    };
    teaching?: {
      status: string;
      possible: string[];
      explanation: string;
      note: string;
      visual: {
        groups: number;
        size: number;
        total: number;
        remainder?: number;
      };
    };
    lastResult?: { outcome: string };
    helpSeen?: boolean;
    lastCheckedRevision?: number;
  };
  probe?: { id: string; prompt: string } | null;
  receipts: WritingReceipt[];
}
/** Existing session/CSRF transport; ordered saves and CAS protect multi-device work. */
export class WritingLessonRepo {
  private queue: Promise<unknown> = Promise.resolve();
  private version = 0;
  readonly api: Api;
  readonly pupil: string;
  readonly id: string;
  constructor(api: Api, pupil: string, id: string) {
    this.api = api;
    this.pupil = pupil;
    this.id = id;
  }
  static async open(
    api: Api,
    pupil: string,
    topic = "division",
    parameters = {},
  ) {
    const activity = await api.request<LessonActivity>(
      "POST",
      `/pupils/${pupil}/writing/`,
      { topic, parameters },
    );
    const repo = new WritingLessonRepo(api, pupil, activity.id);
    repo.version = activity.version;
    return {
      repo,
      activity,
      work:
        activity.work ??
        createWork(
          activity.id,
          activity.lesson.problem,
          activity.lesson.layout,
        ),
    };
  }
  private order<T>(f: () => Promise<T>) {
    const p = this.queue.then(f);
    this.queue = p.catch(() => undefined);
    return p;
  }
  flush() {
    return this.queue;
  }
  save(work: Work) {
    return this.order(async () => {
      const result = await this.api.request<{ version: number; stage: string }>(
        "PUT",
        `/pupils/${this.pupil}/writing/${this.id}/`,
        { version: this.version, work },
      );
      this.version = result.version;
      return result;
    });
  }
  action(action: string, extra: Record<string, unknown> = {}) {
    return this.order(async () => {
      const a = await this.api.request<LessonActivity>(
        "POST",
        `/pupils/${this.pupil}/writing/${this.id}/action/`,
        { action, version: this.version, ...extra },
      );
      this.version = a.version;
      return a;
    });
  }
  validate(work: Work) {
    return this.order(async () => {
      const r = await this.api.request<{
        feedback: ValidationFeedback;
        activity: LessonActivity;
      }>("POST", `/pupils/${this.pupil}/writing/${this.id}/validate/`, {
        revision: work.revision,
      });
      this.version = r.activity.version;
      return r;
    });
  }
}
