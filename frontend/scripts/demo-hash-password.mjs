/**
 * Make the DEMO_PASSWORD_HASH value for the private demo server. The password is typed (hidden) or piped in on
 * standard input: never put it on the command line, where it would stay in the shell's history.
 *
 *   node scripts/demo-hash-password.mjs            type the password twice
 *   printf '%s' "$PW" | node scripts/demo-hash-password.mjs
 *
 * Prints only the hash (scrypt, random salt). Paste it into Render as DEMO_PASSWORD_HASH; keep the password itself in
 * a password manager.
 */
import { hashPassword } from "./demo-server.mjs";

const MIN = 12;

function ask(prompt) {
  return new Promise((resolve) => {
    const input = process.stdin;
    process.stderr.write(prompt);
    let value = "";
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");
    const onData = (ch) => {
      if (ch === "\r" || ch === "\n" || ch === "\u0004") {
        input.setRawMode(false);
        input.pause();
        input.off("data", onData);
        process.stderr.write("\n");
        resolve(value);
      } else if (ch === "\u0003") process.exit(130);
      else if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
      else value += ch;
    };
    input.on("data", onData);
  });
}

async function readPiped() {
  let s = "";
  for await (const chunk of process.stdin) s += chunk;
  return s.replace(/\r?\n$/, "");
}

let password;
if (process.stdin.isTTY) {
  password = await ask("Demo password: ");
  const again = await ask("Again: ");
  if (password !== again) {
    console.error("The two passwords differ. Nothing was made.");
    process.exit(1);
  }
} else password = await readPiped();
if (password.length < MIN) {
  console.error(`Use at least ${MIN} characters (a passphrase of four or more words is good). Nothing was made.`);
  process.exit(1);
}
console.log(await hashPassword(password));
