import { generateMenuContent } from "./compute-menu-contents";
import { createNodeMap } from "./utils";
import { parser } from "@lezer/json";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const VegaSchema = require("../../../../sites/docs/src/constants/vega-schema.json");

const vegaCode = `{
  "marks": [
    {
      "type": "text",
      "from": {"data": "drive"},
      "encode": {
        "enter": {
          "x": {"scale": "x", "field": "miles"},
          "y": {"scale": "y", "field": "gas"},
          "dx": {"scale": "dx", "field": "side"},
          "dy": {"scale": "dy", "field": "side"},
          "fill": {"value": "#000"},
          "text": {"field": "year"},
          "align": {"scale": "align", "field": "side"},
          "baseline": {"scale": "base", "field": "side"}
        }
      }
    }
  ],
  "$schema": "https://vega.github.io/schema/vega/v3.0.json",
  "width": 800,
  "height": 500,
  "padding": 5,

  "data": [{ "name": "drive", "url": "data/driving.json"}],
  "scales": [
    {
      "name": "x",
      "type": "linear",
      "domain": {"data": "drive", "field": "miles"},
      "range": "width",
      "nice": true,
      "zero": false,
      "round": true
    },
    {
      "name": "y",
      "type": "linear",
      "domain": {"data": "drive", "field": "gas"},
      "range": "height",
      "nice": true,
      "zero": false,
      "round": true
    },
    {
      "name": "align",
      "type": "ordinal",
      "domain": ["left", "right", "top", "bottom"],
      "range": ["right", "left", "center", "center"]
    },
    {
      "name": "base",
      "type": "ordinal",
      "domain": ["left", "right", "top", "bottom"],
      "range": ["middle", "middle", "bottom", "top"]
    },
    {
      "name": "dx",
      "type": "ordinal",
      "domain": ["left", "right", "top", "bottom"],
      "range": [-7, 6, 0, 0]
    },
    {
      "name": "dy",
      "type": "ordinal",
      "domain": ["left", "right", "top", "bottom"],
      "range": [1, 1, -5, 6]
    }
  ]
}`;

test("generateMenuContent - smoke test", async () => {
  const nodeMap = await createNodeMap(VegaSchema, vegaCode);
  const skipTypes = new Set(["PropertyName"]);
  parser.parse(vegaCode).iterate({
    enter: (node) => {
      if (skipTypes.has(node.type.name)) {
        return;
      }
      expect(() =>
        generateMenuContent(node.node, nodeMap, vegaCode)
      ).not.toThrow();
    },
  });
});
