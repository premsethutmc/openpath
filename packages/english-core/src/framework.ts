/**
 * The English capability framework: validation and a lookup index.
 *
 * The framework is data (content/english/framework/*.json). This module checks
 * that a framework file is well formed and builds the index everything else
 * uses: leaves, parents, children, couplings and prerequisites.
 */
import type { Capability, CapabilityId, Framework } from "./types.ts";

export const ROOT = "EN";

export interface FrameworkIndex {
  framework: Framework;
  key: string; // "en@0.1.0"
  leaves: Map<CapabilityId, Capability>;
  /** Leaves in framework order. */
  leafIds: CapabilityId[];
  /** Every node (leaf, sub-strand, strand, root) → its parent. */
  parent: Map<string, string>;
  /** Every non-leaf node → its children, with weights. */
  children: Map<string, { id: string; weight: number }[]>;
  names: Map<string, string>;
  couplings: Map<CapabilityId, { other: CapabilityId; strength: number }[]>;
  requires: Map<CapabilityId, CapabilityId[]>;
}

export class FrameworkError extends Error {
  problems: string[];
  constructor(problems: string[]) {
    super(`Invalid framework:\n- ${problems.join("\n- ")}`);
    this.problems = problems;
  }
}

/** Is this capability specified well enough to be assessed in this framework version? */
export function isSpecified(c: Capability): boolean {
  return !!(c.bands && c.description && c.misconceptions);
}

export function validateFramework(fw: Framework): string[] {
  const problems: string[] = [];
  const need = (cond: unknown, msg: string) => {
    if (!cond) problems.push(msg);
  };
  need(fw && typeof fw === "object", "framework is not an object");
  if (!fw || typeof fw !== "object") return problems;
  for (const k of ["id", "version", "title", "status"] as const) need(typeof fw[k] === "string" && fw[k], `missing metadata: ${k}`);
  need(fw.review && fw.review.author && fw.review.licence && fw.review.status, "missing metadata: review author, licence or status");
  need(fw.scale && fw.scale.min === 1 && fw.scale.max === 8, "scale must run from 1 to 8");
  need(fw.prior && fw.prior.sd > 0, "prior sd must be positive");
  const p = fw.policy;
  need(p, "missing policy");
  if (p) {
    // One interaction must never be enough for mastery (agreed rule A-2).
    need(p.mastery_gap_days >= 1, "policy must require at least one day between demonstrations for mastery");
    need(p.demonstrated_min_direct >= 2, "policy must require at least 2 direct observations to demonstrate");
    need(p.demonstrated_min_contexts >= 2, "policy must require at least 2 contexts to demonstrate");
    need(p.demonstrated_probability > 0.5 && p.demonstrated_probability < 1, "demonstrated_probability must be between 0.5 and 1");
    need(p.evaluator_max_shift > 0 && p.evaluator_max_shift <= 1.5, "evaluator_max_shift must be in (0, 1.5]");
    need(p.inferred_max_shift > 0 && p.inferred_max_shift <= p.evaluator_max_shift, "inferred_max_shift must be positive and no larger than evaluator_max_shift");
    need(p.time_variance_per_day >= 0, "time_variance_per_day must not be negative");
  }

  const seen = new Set<string>();
  const leaves = new Map<string, Capability>();
  const dup = (id: string) => {
    if (seen.has(id)) problems.push(`duplicate id: ${id}`);
    seen.add(id);
  };
  if (!Array.isArray(fw.strands) || fw.strands.length === 0) problems.push("no strands");
  for (const s of fw.strands ?? []) {
    dup(s.id);
    need(s.id?.startsWith(`${ROOT}.`), `strand id must start with ${ROOT}.: ${s.id}`);
    need(s.name, `strand ${s.id} has no name`);
    if (!s.substrands?.length) problems.push(`strand ${s.id} has no sub-strands`);
    for (const ss of s.substrands ?? []) {
      dup(ss.id);
      need(ss.id?.startsWith(`${s.id}.`), `sub-strand ${ss.id} is not inside ${s.id}`);
      if (!ss.capabilities?.length) problems.push(`sub-strand ${ss.id} has no capabilities`);
      for (const c of ss.capabilities ?? []) {
        dup(c.id);
        need(c.id?.startsWith(`${ss.id}.`), `capability ${c.id} is not inside ${ss.id}`);
        need(c.name, `capability ${c.id} has no name`);
        need(["skeleton", "core", "planned"].includes(c.tier), `capability ${c.id} has an unknown tier`);
        need(c.weight > 0, `capability ${c.id} must have a positive weight`);
        if (c.tier === "skeleton") {
          need(c.description, `skeleton capability ${c.id} has no description`);
          const bands = Object.keys(c.bands ?? {});
          need(bands.length >= 3, `skeleton capability ${c.id} needs band descriptors for at least 3 bands`);
          for (const b of bands) need(Number(b) >= 1 && Number(b) <= 8, `capability ${c.id} has a band outside 1–8: ${b}`);
          need(Array.isArray(c.misconceptions), `skeleton capability ${c.id} has no misconception list`);
        }
        // any capability that is specified at all must be specified completely (from 0.2.0, core ones too)
        if (c.bands && c.tier !== "skeleton") {
          need(c.description, `capability ${c.id} has band descriptors but no description`);
          const bands = Object.keys(c.bands);
          need(bands.length >= 3, `capability ${c.id} needs band descriptors for at least 3 bands`);
          for (const b of bands) need(Number(b) >= 1 && Number(b) <= 8, `capability ${c.id} has a band outside 1–8: ${b}`);
          need(Array.isArray(c.misconceptions) && c.misconceptions.length > 0, `capability ${c.id} has band descriptors but no misconception list`);
        }
        const tags = new Set<string>();
        for (const m of c.misconceptions ?? []) {
          need(/^[a-z][a-z0-9_]*$/.test(m.id), `capability ${c.id} has a badly formed misconception id: ${m.id}`);
          if (tags.has(m.id)) problems.push(`capability ${c.id} lists misconception ${m.id} twice`);
          tags.add(m.id);
        }
        leaves.set(c.id, c);
      }
    }
  }
  for (const k of fw.couplings ?? []) {
    need(leaves.has(k.a), `coupling refers to unknown capability ${k.a}`);
    need(leaves.has(k.b), `coupling refers to unknown capability ${k.b}`);
    need(k.a !== k.b, `capability ${k.a} is coupled to itself`);
    need(k.strength >= 0 && k.strength <= 0.6, `coupling ${k.a} ↔ ${k.b} must be between 0 and 0.6`);
  }
  const graph = new Map<string, string[]>();
  for (const r of fw.prerequisites ?? []) {
    need(leaves.has(r.capability), `prerequisite refers to unknown capability ${r.capability}`);
    need(leaves.has(r.requires), `${r.capability} requires unknown capability ${r.requires}`);
    graph.set(r.capability, [...(graph.get(r.capability) ?? []), r.requires]);
  }
  // loops in the prerequisite graph
  const state = new Map<string, number>(); // 1 visiting, 2 done
  const visit = (id: string, path: string[]): void => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) {
      problems.push(`prerequisite loop: ${[...path, id].join(" → ")}`);
      return;
    }
    state.set(id, 1);
    for (const next of graph.get(id) ?? []) visit(next, [...path, id]);
    state.set(id, 2);
  };
  for (const id of graph.keys()) visit(id, []);
  return problems;
}

export function indexFramework(fw: Framework): FrameworkIndex {
  const problems = validateFramework(fw);
  if (problems.length) throw new FrameworkError(problems);
  const leaves = new Map<string, Capability>();
  const leafIds: string[] = [];
  const parent = new Map<string, string>();
  const children = new Map<string, { id: string; weight: number }[]>();
  const names = new Map<string, string>([[ROOT, "English"]]);
  children.set(ROOT, []);
  for (const s of fw.strands) {
    parent.set(s.id, ROOT);
    children.get(ROOT)!.push({ id: s.id, weight: s.weight });
    names.set(s.id, s.name);
    children.set(s.id, []);
    for (const ss of s.substrands) {
      parent.set(ss.id, s.id);
      children.get(s.id)!.push({ id: ss.id, weight: ss.weight });
      names.set(ss.id, ss.name);
      children.set(ss.id, []);
      for (const c of ss.capabilities) {
        parent.set(c.id, ss.id);
        children.get(ss.id)!.push({ id: c.id, weight: c.weight });
        names.set(c.id, c.name);
        leaves.set(c.id, c);
        leafIds.push(c.id);
      }
    }
  }
  const couplings = new Map<string, { other: string; strength: number }[]>();
  for (const k of fw.couplings) {
    couplings.set(k.a, [...(couplings.get(k.a) ?? []), { other: k.b, strength: k.strength }]);
    couplings.set(k.b, [...(couplings.get(k.b) ?? []), { other: k.a, strength: k.strength }]);
  }
  const requires = new Map<string, string[]>();
  for (const r of fw.prerequisites) requires.set(r.capability, [...(requires.get(r.capability) ?? []), r.requires]);
  return { framework: fw, key: `${fw.id}@${fw.version}`, leaves, leafIds, parent, children, names, couplings, requires };
}

/** The strand a node belongs to ("EN.RDG" for "EN.RDG.INF.motives"). */
export function strandOf(id: string): string {
  return id.split(".").slice(0, 2).join(".");
}

export function misconceptionIds(index: FrameworkIndex, capability: CapabilityId): Set<string> {
  return new Set((index.leaves.get(capability)?.misconceptions ?? []).map((m) => m.id));
}
