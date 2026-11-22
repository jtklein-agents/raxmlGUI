#!/bin/sh
# PROTOTYPE (#328). Runs the draft flat config on the `yarn lint` file set with ESLint 10 from a
# scratch install, so the repo's own node_modules (ESLint 8) stays untouched.
# Usage: prototype/run-eslint10.sh <scratch-dir> [extra eslint args]
# Scratch dir setup: npm i eslint@10 @eslint/js@10 typescript-eslint@8 typescript@5.9 \
#   eslint-plugin-lodash eslint-plugin-import-x eslint-plugin-react-hooks @stylistic/eslint-plugin globals
S=$1; shift
cp eslint.config.prototype.mjs "$S/eslint.config.mjs"
"$S/node_modules/.bin/eslint" -c "$S/eslint.config.mjs" "src/**/*.{js,jsx,ts,tsx}" electron.vite.config.js vitest.config.mjs "$@"
