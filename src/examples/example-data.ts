export const vegaCode = `
{
  "$schema": "https://vega.github.io/schema/vega/v5.json",
  "description": "A wheat plot example, which combines elements of dot plots and histograms.",
  "width": 500,
  "padding": 5,

  "signals": [
    { "name": "symbolDiameter", "value": 4,
      "bind": {"input": "range", "min": 1, "max": 8, "step": 0.25} },
    { "name": "binOffset", "value": 0,
      "bind": {"input": "range", "min": -0.1, "max": 0.1} },
    { "name": "binStep", "value": 0.075,
      "bind": {"input": "range", "min": 0.001, "max": 0.2, "step": 0.001} },
    { "name": "height", "update": "extent[1] * (1 + symbolDiameter)" }
  ],

  "data": [
    {
      "name": "points",
      "url": "data/normal-2d.json",
      "transform": [
        {
          "type": "bin", "field": "u",
          "extent": [-1, 1],
          "anchor": {"signal": "binOffset"},
          "step": {"signal": "binStep"},
          "nice": false,
          "signal": "bins"
        },
        {
          "type": "stack",
          "groupby": ["bin0"],
          "sort": {"field": "u"}
        },
        {
          "type": "extent", "signal": "extent",
          "field": "y1"
        }
      ]
    }
  ],

  "scales": [
    {
      "name": "xscale",
      "type": "linear",
      "range": "width",
      "domain": [-1, 1]
    },
    {
      "name": "yscale",
      "type": "linear",
      "range": "height",
      "domain": [0, {"signal": "extent[1]"}]
    }
  ],

  "axes": [
    { "orient": "bottom", "scale": "xscale",
      "values": {"signal": "sequence(bins.start, bins.stop + bins.step, bins.step)"},
      "domain": false, "ticks": false, "labels": false, "grid": true,
      "zindex": 0 },
    {"orient": "bottom", "scale": "xscale", "zindex": 1}
  ],

  "marks": [
    {
      "type": "symbol",
      "from": {"data": "points"},
      "encode": {
        "enter": {
          "fill": {"value": "transparent"},
          "strokeWidth": {"value": 0.5}
        },
        "update": {
          "x": {"scale": "xscale", "field": "u"},
          "y": {"scale": "yscale", "field": "y0"},
          "size": {"signal": "symbolDiameter * symbolDiameter"},
          "stroke": {"value": "steelblue"}
        },
        "hover": {
          "stroke": {"value": "firebrick"}
        }
      }
    }
  ]
}
`;

export const vegaLiteCode = `
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A simple bar chart with embedded data.",
  "data": {
    "values": [
      {"a": "A", "b": 28}, {"a": "B", "b": 55}, {"a": "C", "b": 43},
      {"a": "D", "b": 91}, {"a": "E", "b": 81}, {"a": "F", "b": 53},
      {"a": "G", "b": 19}, {"a": "H", "b": 87}, {"a": "I", "b": 52}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {"field": "a", "type": "nominal", "axis": {"labelAngle": 0}},
    "y": {"field": "b", "type": "quantitative"}
  }
}
`;

export const vegaLiteScatterPlot = `
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A scatterplot showing body mass and flipper lengths of penguins.",
  "data": {
    "url": "data/penguins.json"
  },
  "mark": "point",
  "encoding": {
    "x": {
      "field": "Flipper Length (mm)",
      "type": "quantitative",
      "scale": {"zero": false}
    },
    "y": {
      "field": "Body Mass (g)",
      "type": "quantitative",
      "scale": {"zero": false}
    },
    "color": {"field": "Species", "type": "nominal"},
    "shape": {"field": "Species", "type": "nominal"}
  }
}
`;
