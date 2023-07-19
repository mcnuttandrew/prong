#!/usr/bin/env bash
yarn

# prep assets
mkdir -p public/data 
cp ./node_modules/vega-datasets/data/* ./public/data/
cp ./src/examples/Quiet* ./public/
cp ../../README.md ./public/
mkdir ./public/public
cp ../../example.png ./public/

# swap to using the published version of prong edtior
yarn add prong-editor &&
npx vite build &&
yarn remove prong-editor