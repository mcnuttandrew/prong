import { Projection } from "../lib/projections";
const ClickTarget: Projection = {
  name: "click target",
  query: { type: "nodeType", query: ["[", "{"] },
  type: "inline",
  mode: "suffix",
  projection: () => <span>❒</span>,
  hasInternalState: false,
};

export default ClickTarget;
