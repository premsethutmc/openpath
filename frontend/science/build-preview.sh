#!/bin/sh
# Run from the repo root. Keep the public preview confined to these static assets.
set -eu
src=frontend/science
out=preview-dist
mkdir -p "$out/plant-a-seed" "$out/pressure-in-sand" "$out/prism"
cp "$src/index.html" "$src/science.css" "$out/"
copy_lab() {
  lab=$1
  shift
  for asset in "$@"; do cp "$src/$lab/$asset" "$out/$lab/"; done
}
copy_lab plant-a-seed index.html model.mjs seed.css seed.mjs
copy_lab pressure-in-sand index.html model.mjs lab.css lab.mjs
copy_lab prism index.html model.mjs prism.css prism.mjs
printf 'User-agent: *\nDisallow: /\n' > "$out/robots.txt"
