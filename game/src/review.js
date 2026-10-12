// Reviewer's view, only when the page is opened with #review. Never part of the child's screen.
export function reviewPanel(voices) {
  const box = document.createElement("aside");
  box.id = "review";
  box.innerHTML = `<p class="r-state"></p><p class="r-line" lang="ta"></p><ol class="r-log"></ol>`;
  document.body.appendChild(box);
  const state = box.querySelector(".r-state"), line = box.querySelector(".r-line"), list = box.querySelector(".r-log");
  let shown = "";
  return {
    add(e) {
      const li = document.createElement("li");
      li.textContent = `${e.t.toFixed(1)}s  ${e.kind}: ${e.text}`;
      li.className = "r-" + e.kind;
      list.prepend(li);
      while (list.children.length > 40) list.lastChild.remove();
    },
    line(v) { line.textContent = v ? `${v.text}  ·  ${v.translit}  ·  “${v.meaning}”` : ""; },
    tick(dt, s) { if (s !== shown) { shown = s; state.textContent = "state: " + s; } },
  };
}
