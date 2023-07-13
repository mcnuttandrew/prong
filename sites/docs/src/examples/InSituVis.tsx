import { useState, useEffect } from 'react'
import { Editor, StandardBundle } from 'prong-editor'
import VegaSchema from '../constants/vega-schema.json'
import { analyzeVegaCode } from './example-utils'
import {
    SparkType,
    sparkTypes,
    sparkPositions,
    SparkPos,
    PreComputedHistograms,
    createHistograms,
    DataTable,
    isDataTable,
    buildSparkProjection,
} from './histograms'

const connectedScatterPlotSpec = `{
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
}`

function InSituFigure1() {
    const [currentCode, setCurrentCode] = useState(connectedScatterPlotSpec)
    const [sparkPosition, setSparkPosition] = useState<SparkPos>('right')
    const [sparkType, setSparkType] = useState<SparkType>('line')
    const [preComputedHistograms, setPrecomputedHistograms] =
        useState<PreComputedHistograms>({})

    useEffect(() => {
        analyzeVegaCode(currentCode, ({ data }) => {
            const namedPairs = Object.entries(data)
                .filter(([_key, dataSet]) => isDataTable(dataSet))
                .map(([key, data]) => [
                    key,
                    createHistograms(data as DataTable),
                ])
            setPrecomputedHistograms(Object.fromEntries(namedPairs))
        })
    }, [currentCode])

    return (
        <div className="App">
            <div>
                <h1>Sparkline Config</h1>
                <div>
                    <div className="">
                        <label html-for="spark-pos-picker">Placement</label>
                        <select
                            id="spark-pos-picker"
                            title="Select a position for the spark line"
                            value={sparkPosition}
                            onChange={(e) =>
                                setSparkPosition(e.target.value as SparkPos)
                            }
                        >
                            {sparkPositions.map((val) => (
                                <option key={val}>{val}</option>
                            ))}
                        </select>
                    </div>
                    <div className="">
                        <label html-for="spark-type-picker">Mark type</label>
                        <select
                            id="spark-type-picker"
                            title="Select a position for the spark line"
                            value={sparkType}
                            onChange={(e) => setSparkType(e.target.value)}
                        >
                            {sparkTypes.map((val) => (
                                <option key={val}>{val}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            <Editor
                schema={VegaSchema}
                code={currentCode}
                onChange={(x) => setCurrentCode(x)}
                projections={[
                    ...Object.values(StandardBundle),
                    buildSparkProjection(
                        preComputedHistograms,
                        sparkPosition,
                        sparkType
                    ),
                ]}
            />{' '}
        </div>
    )
}

export default InSituFigure1
