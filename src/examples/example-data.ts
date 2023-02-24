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
      {"penguins": "A", "flowers": 28}, {"penguins": "B", "flowers": 55}, {"penguins": "C", "flowers": 43},
      {"penguins": "D", "flowers": 91}, {"penguins": "E", "flowers": 81}, {"penguins": "F", "flowers": 53},
      {"penguins": "G", "flowers": 19}, {"penguins": "H", "flowers": 87}, {"penguins": "I", "flowers": 52}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {"field": "penguins", "type": "nominal", "axis": {"labelAngle": 0}},
    "y": {"field": "flowers", "type": "quantitative"}
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
export const vegaLiteHeatmap = `
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {"url": "data/movies.json"},
  "transform": [{
    "filter": {"and": [
      {"field": "IMDB Rating", "valid": true},
      {"field": "Rotten Tomatoes Rating", "valid": true}
    ]}
  }],
  "mark": "rect",
  "width": 300,
  "height": 200,
  "encoding": {
    "x": {
      "bin": {"maxbins":60},
      "field": "IMDB Rating",
      "type": "quantitative"
    },
    "y": {
      "bin": {"maxbins": 40},
      "field": "Rotten Tomatoes Rating",
      "type": "quantitative"
    },
    "color": {
      "aggregate": "count",
      "type": "quantitative"
    }
  },
  "config": {
    "view": {
      "stroke": "transparent"
    }
  }
}
`;

export const vegaLiteStreamgraph = `
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": 300, "height": 200,
  "data": {"url": "data/unemployment-across-industries.json"},
  "mark": "area",
  "encoding": {
    "x": {
      "timeUnit": "yearmonth", "field": "date",
      "axis": {"domain": false, "format": "%Y", "tickSize": 0}
    },
    "y": {
      "aggregate": "sum", "field": "count",
      "axis": null,
      "stack": "center"
    },
    "color": {"field":"series", "scale":{"scheme": "category20b"}}
  }
}`;

export const vegaLiteLinechart = `
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "Stock prices of 5 Tech Companies over Time.",
  "data": {"url": "data/stocks.csv"},
  "mark": {
    "type": "line",
    "point": {
      "filled": false,
      "fill": "white"
    }
  },
  "encoding": {
    "x": {"timeUnit": "year", "field": "date"},
    "y": {"aggregate":"mean", "field": "price", "type": "quantitative"},
    "color": {"field": "symbol", "type": "nominal"}
  }
}
`;
