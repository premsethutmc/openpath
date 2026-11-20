#!/bin/sh
# Run from the repo root. Keep the public preview confined to these static assets.
set -eu
src=frontend/science
out=preview-dist
mkdir -p "$out/plant-a-seed" "$out/pressure-in-sand" "$out/prism" "$out/salt-from-sand" "$out/separation-bench" "$out/chemistry-lab" "$out/flower-to-seed" "$out/shadow-lab" "$out/lift-the-rock"
cp "$src/index.html" "$src/science.css" "$out/"
copy_lab() {
  lab=$1
  shift
  for asset in "$@"; do cp "$src/$lab/$asset" "$out/$lab/"; done
}
copy_lab plant-a-seed index.html model.mjs seed.css seed.mjs
copy_lab pressure-in-sand index.html model.mjs lab.css lab.mjs
copy_lab prism index.html model.mjs prism.css prism.mjs
copy_lab salt-from-sand index.html model.mjs salt.css salt.mjs
copy_lab separation-bench index.html model.mjs bench.css bench.mjs
copy_lab chemistry-lab index.html catalog.mjs lab-model.mjs lab.css lab.mjs
copy_lab flower-to-seed index.html garden.css garden.mjs art.mjs model.mjs sound.mjs story.mjs story-model.mjs
copy_lab shadow-lab index.html shadow.css shadow.mjs model.mjs
copy_lab lift-the-rock index.html lever.css lever.mjs model.mjs
printf 'User-agent: *\nDisallow: /\n' > "$out/robots.txt"
