#!/usr/bin/env bash
yarn

# prep assets
mkdir -p dist/data 
rm -rf dist/data
mkdir dist/data 
cp ./node_modules/vega-datasets/data/* ./dist/data/
cp ./src/examples/Quiet* ./public/
cp ../../README.md ./public/

# swap to using the published version of prong edtior
# npx tsc &&
yarn add prong-editor &&
npx vite build &&
yarn remove prong-editor