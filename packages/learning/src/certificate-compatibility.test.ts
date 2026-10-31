// D1: certificate compatibility across the B2 rule change. Fixtures are real chains issued by the authority at be91d17 (authority@3, before B2);
// regenerate only from that commit (see docs/grader-teaching-integration/08-certificate-compatibility.md).
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { AUTHORITY_VERSION, DERIVATION_CERTIFICATE_VERSION, assessChain, chainVerificationStatus, replayDerivationChain, type DerivationCertificate } from "./derivation-authority.ts";
import { authorizeWorking } from "./derivation-interface.ts";

type Fixture = { statement: string; lines: string[]; note: string; issuedBy: string; verdict: string; chain: DerivationCertificate[] };
const historical: Fixture[] = JSON.parse(readFileSync(new URL("./fixtures/historical-authority-v3-certificates.json", import.meta.url), "utf8"));

describe("certificate compatibility (authority @3 -> @4)", () => {
  test("the label changed, the certificate format did not", () => {
    expect(AUTHORITY_VERSION).toBe("openpath-derivation-authority@4");
    expect(DERIVATION_CERTIFICATE_VERSION).toBe("openpath-derivation-certificate@3");
    expect(historical.length).toBe(4);
    for (const h of historical) expect(h.chain.every((c) => c.versions.authority === "openpath-derivation-authority@3")).toBe(true);
  });
  test("every historical @3 chain is reported historical, never replayed as current — including the one whose meaning changed", () => {
    for (const h of historical) {
      const s = chainVerificationStatus(h.statement, h.lines, h.chain);
      expect(s.status).toBe("historical-version-not-replayable");
      expect(s.versions).toEqual(["openpath-derivation-certificate@3 / openpath-derivation-authority@3"]);
      expect(replayDerivationChain(h.statement, h.lines, h.chain).ok).toBe(false);   // the replayer itself refuses another authority
    }
  });
  test("the recorded result is not rewritten: the fixture still says what it said when issued", () => {
    expect(historical.map((h) => h.verdict)).toEqual(["verified", "verified", "verified", "verified"]);
    const changed = historical.find((h) => h.statement === "2^3x = 64")!;
    const now = assessChain(changed.statement, changed.lines);
    expect(now.status).toBe("unsupported");                               // a NEW assessment is a separate event; it does not reach back
    expect(now.reason).toBe("task-unparsed");
  });
  test("relabelling a historical certificate to @4 does not make it current", () => {
    const h = historical[0];
    const forged = h.chain.map((c) => ({ ...c, versions: { ...c.versions, authority: AUTHORITY_VERSION } }));
    const s = chainVerificationStatus(h.statement, h.lines, forged as DerivationCertificate[]);
    expect(s.status).toBe("failed-replay");                               // the digest binds the versions
  });
  test("the same derivations, issued now, replay as current @4", () => {
    for (const h of historical.filter((x) => x.statement !== "2^3x = 64")) {
      const v = assessChain(h.statement, h.lines);
      expect(v.status).toBe("verified");
      expect(v.chain.every((c) => c.versions.authority === AUTHORITY_VERSION)).toBe(true);
      expect(chainVerificationStatus(h.statement, h.lines, v.chain).status).toBe("replayable-current");
    }
    const sym = assessChain("6 < 2x", ["x > 3"]);                          // a B2-only move is issued under @4 only
    expect(sym.status).toBe("verified");
    expect(sym.chain[0].versions.authority).toBe(AUTHORITY_VERSION);
    expect(authorizeWorking("3x = 19 - 4", ["3x = 15", "x = 5"]).versions.authority).toBe(AUTHORITY_VERSION);
  });
});
