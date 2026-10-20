#!/usr/bin/env sh
# Builds the English CV (light + dark) with XeLaTeX into ../public/.
# The Persian CV comes from cv-fa.html (print to PDF from Chrome; see its header).
set -e
cd "$(dirname "$0")"
mkdir -p build ../public
for theme in light dark; do
  dark=0; [ "$theme" = dark ] && dark=1
  job="cv-en-$theme"
  for pass in 1 2; do
    xelatex -interaction=nonstopmode -halt-on-error -output-directory=build \
      -jobname="$job" "\\def\\cvdark{$dark}\\input{cv.tex}" >/dev/null
  done
  cp "build/$job.pdf" "../public/$job.pdf"
  echo "built public/$job.pdf"
done
