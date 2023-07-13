export { default as Editor } from "./components/Editor";
export { default as StandardBundle } from "./projections/standard-bundle";
import { simpleParse, setIn, maybeTrim } from "./lib/utils";
import prettifier from "./lib/vendored/prettifier";
export const utils = { simpleParse, setIn, maybeTrim, prettifier };

export { type Projection, type ProjectionProps } from "./lib/projections";

import "./stylesheets/style.css";
