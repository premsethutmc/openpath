/** Connect another phone: what the parent is told, and that a phone without an account cannot show a code. */
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
(globalThis as { React?: unknown }).React = React;
const { ConnectPhones } = await import("./ParentView.tsx");
const html = (canShow: boolean) => renderToStaticMarkup(React.createElement(ConnectPhones, { linking: { canShow, showCode: async () => ({ code: "ABCD-EFGH", expires_in: 900 }), join: async () => undefined } }));

test("PC-1 a signed-in phone can show a code; any phone with a server can type one; the consequences are stated", () => {
  const signedIn = html(true);
  assert.match(signedIn, /Show a code on this phone/);
  assert.match(signedIn, /type the code shown on the other phone/);
  assert.match(signedIn, /not merged/);
  const fresh = html(false);
  assert.ok(!fresh.includes("Show a code on this phone"));
  assert.match(fresh, />Connect</);
});
