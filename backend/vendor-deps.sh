#!/usr/bin/env bash
# Reproducible Python dependencies without a package index.
#
# Some build/test environments (including the one the grading audit ran in) cannot reach PyPI but can reach GitHub over git.
# This clones every pure-Python dependency pinned in requirements.txt (and the grading-audit oracle's SymPy/mpmath) at its exact
# release tag into a vendor directory and prints the PYTHONPATH to use. Nothing is installed system-wide.
#
#   eval "$(backend/vendor-deps.sh)"                          # Django test dependencies
#   eval "$(backend/vendor-deps.sh --audit)"                  # + SymPy and mpmath for tools/mathematics/grading-audit
#   cd backend && python3 manage.py test                      # SQLite is used when DATABASE_URL is unset
#
# psycopg is not vendored: the tests run on SQLite. Tags must match requirements.txt; the script refuses to continue if they do not.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
dest="${OPENPATH_VENDOR_DIR:-$HOME/.cache/openpath-vendor}"
mkdir -p "$dest"
pin() { grep -iE "^$1==" "$here/requirements.txt" | head -1 | sed -E 's/.*==([^ ;]+).*/\1/'; }
declare -A REPO=([django]=django/django [asgiref]=django/asgiref [djangorestframework]=encode/django-rest-framework [sqlparse]=andialbrecht/sqlparse)
paths=()
for pkg in django asgiref djangorestframework sqlparse; do
  v="$(pin "$pkg")"; [ -n "$v" ] || { echo "no pin for $pkg in requirements.txt" >&2; exit 1; }
  dir="$dest/$pkg-$v"
  [ -d "$dir/.git" ] || git clone -q --depth 1 --branch "$v" "https://github.com/${REPO[$pkg]}" "$dir" >&2
  paths+=("$dir")
done
if [ "${1:-}" = "--audit" ]; then
  for spec in "sympy/sympy sympy-1.14.0 sympy" "mpmath/mpmath 1.3.0 mpmath"; do
    set -- $spec; dir="$dest/$3-$2"
    [ -d "$dir/.git" ] || git clone -q --depth 1 --branch "$2" "https://github.com/$1" "$dir" >&2
    paths+=("$dir")
  done
fi
(IFS=:; echo "export PYTHONPATH=\"${paths[*]}\${PYTHONPATH:+:\$PYTHONPATH}\"")
