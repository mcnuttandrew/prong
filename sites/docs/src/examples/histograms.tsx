import { useState } from "react";
import { bin } from "d3-array";
import { scaleBand, scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { interpolateGreens } from "d3-scale-chromatic";
import { SyntaxNode } from "@lezer/common";
import { Projection, ProjectionProps, utils } from "prong";

export function isDataTable(input: any): boolean {
  // array
  if (!Array.isArray(input)) {
    return false;
  }
  // array of objects
  if (!input.every((x) => typeof x === "object")) {
    return false;
  }

  const types = Array.from(
    new Set(
      input.flatMap((row) =>
        Object.values(row).map((el) => {
          if (el === null) {
            return "null";
          }
          return typeof el;
        })
      )
    )
  );
  const allowed = new Set(["string", "number", "boolean", "null", "object"]);
  const allAllowed = types.every((typ) => allowed.has(typ));
  return allAllowed;
}

export function extractFieldNames(dataSets: Record<string, any>) {
  const fieldNames = new Set<string>([]);
  Object.values(dataSets).forEach((data) => {
    if (!isDataTable(data)) {
      return;
    }
    data.forEach((row: Record<string, any>) => {
      Object.keys(row).forEach((fieldName) => fieldNames.add(fieldName));
    });
  });
  return Array.from(fieldNames);
}

export function extractScaleNames(currentCode: string): string[] {
  const code = utils.simpleParse(currentCode, { scales: [] });
  return Array.from(
    (code.scales || []).reduce((acc: Set<string>, { name }: any) => {
      if (name) {
        acc.add(name);
      }
      return acc;
    }, new Set<string>([]))
  );
}

export type DataTable = Record<string, number | string | boolean | undefined>[];
// this is an imperfect histogram
export function createHistograms(
  data: DataTable
): Record<string, d3.Bin<number, number>[]> {
  if (data.length === 0) {
    return {};
  }
  const keys = Object.keys(data[0]);
  const histograms: Record<string, d3.Bin<number, number>[]> = {};
  keys
    .filter((key) =>
      data.every((row) => !row[key] || typeof row[key] === "number")
    )
    .forEach((key) => {
      const values: number[] = data.map((x) => x[key] as number);
      const domain: [number, number] = [
        Math.min(...values),
        Math.max(...values),
      ];
      histograms[key] = bin().domain(domain)(values);
    });
  return histograms;
}

function getDataSetName(node: SyntaxNode, fullCode: string): string | false {
  const x =
    node?.parent?.parent?.parent?.parent?.parent?.parent?.parent?.parent;
  if (!x) {
    return false;
  }
  const parsedCode = utils.simpleParse(fullCode.slice(x.from, x.to), false);
  if (!parsedCode) {
    return false;
  }
  const target = parsedCode?.from?.data;
  return target || false;
}

export type PreComputedHistograms = Record<
  string,
  Record<string, d3.Bin<number, number>[]>
>;

type SparkRenderer = (props: {
  histogram: Histogram;
  selectedBin: any;
  setSelectedBin: (newBin: any) => void;
  yScale: any;
  xScale: any;
  height: number;
}) => JSX.Element[];

const BarChart: SparkRenderer = (props) => {
  const { selectedBin, xScale, yScale, setSelectedBin, histogram, height } =
    props;

  const res = histogram.map((bin, idx) => {
    const isSelected =
      selectedBin && selectedBin.x0 === bin.x0 && selectedBin?.x1 === bin.x1;
    return (
      <g transform={`translate(${xScale(bin.x0 as any)})`} key={`${idx}-bar`}>
        <rect
          x={0}
          stroke="white"
          width={xScale.bandwidth()}
          y={height - yScale(bin.length)}
          fill="#9BCF63"
          height={yScale(bin.length)}
          opacity={isSelected ? 1 : 0.8}
        ></rect>

        <rect
          onMouseEnter={() => setSelectedBin(bin)}
          onMouseLeave={() => setSelectedBin(null)}
          x={0}
          width={xScale.bandwidth()}
          y={0}
          fill="white"
          height={height}
          opacity={0}
        ></rect>
      </g>
    );
  });
  return res;
};

const LineChart: SparkRenderer = (props) => {
  const { selectedBin, xScale, yScale, setSelectedBin, histogram, height } =
    props;
  const lineScale = line()
    .x((d: any) => xScale(d.x0))
    .y((d) => yScale(d.length));
  const pathString = lineScale(histogram as any);
  const path = (
    <path d={pathString as string} fill="none" stroke="brown" key={"item"} />
  );
  const res = histogram.map((bin, idx) => {
    const isSelected =
      selectedBin && selectedBin.x0 === bin.x0 && selectedBin?.x1 === bin.x1;
    return (
      <g
        transform={`translate(${xScale(bin.x0 as any)})`}
        key={`${idx}-selection-stuff`}
      >
        {isSelected && (
          <rect x={0} width={2} fill="brown" y={0} height={height} />
        )}
        <rect
          onMouseEnter={() => setSelectedBin(bin)}
          onMouseLeave={() => setSelectedBin(null)}
          x={0}
          width={xScale.bandwidth()}
          y={0}
          fill="white"
          height={height}
          opacity={0}
        ></rect>
      </g>
    );
  });
  return [...res, path];
};

const Heatmap: SparkRenderer = (props) => {
  const { selectedBin, xScale, yScale, setSelectedBin, histogram, height } =
    props;

  const colorScale = scaleLinear().domain(yScale.domain()).range([0, 1]);

  const res = histogram.map((bin, idx) => {
    const isSelected =
      selectedBin && selectedBin.x0 === bin.x0 && selectedBin?.x1 === bin.x1;
    return (
      <g transform={`translate(${xScale(bin.x0 as any)})`} key={`${idx}-bar`}>
        <rect
          x={0}
          stroke="white"
          width={xScale.bandwidth()}
          y={0}
          fill={interpolateGreens(colorScale(bin.length))}
          height={height}
          opacity={isSelected ? 1 : 0.8}
        ></rect>

        <rect
          onMouseEnter={() => setSelectedBin(bin)}
          onMouseLeave={() => setSelectedBin(null)}
          x={0}
          width={xScale.bandwidth()}
          y={0}
          fill="white"
          height={height}
          opacity={0}
        ></rect>
      </g>
    );
  });
  return res;
};

type Histogram = d3.Bin<number, number>[];

function buildHistogramProjection(
  preComputedHistograms: PreComputedHistograms,
  sparkPosition: SparkPos,
  sparkType: SparkType
) {
  return function HistogramProjection(props: ProjectionProps) {
    const [selectedBin, setSelectedBin] = useState<d3.Bin<
      number,
      number
    > | null>(null);
    const { currentValue, node, fullCode } = props;
    const key = currentValue.slice(1, currentValue.length - 1);
    const datasetName = getDataSetName(node, fullCode);
    if (!datasetName) {
      return <div></div>;
    }
    const histogram: Histogram = preComputedHistograms?.[datasetName]?.[key];
    if (!histogram) {
      return <div></div>;
    }
    const height = 15;
    const width = 150;
    const xScale = scaleBand()
      .domain(histogram.map((d) => d.x0) as any)
      .range([0, width]);
    const yScale = scaleLinear()
      .domain([0, Math.max(...histogram.map((el) => el.length))])
      .range([0, height]);
    const textProps = {
      fontSize: 8,
      textAnchor: "middle",
      pointerEvents: "none",
      x:
        xScale.bandwidth() / 2 +
        (!!selectedBin ? xScale(selectedBin.x0 as any) || 0 : 0),
    };
    const chartProps = {
      histogram,
      selectedBin,
      setSelectedBin,
      yScale,
      xScale,
      height,
    };

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <svg height={height} width={width} style={{ overflow: "visible" }}>
          <g transform="translate(0, 2.5)">
            <rect
              width={width}
              height={height}
              stroke="gray"
              strokeDasharray="4 1"
              fill="ghostwhite"
            ></rect>
            {sparkType === "bar" && BarChart(chartProps)}
            {sparkType === "line" && LineChart(chartProps)}
            {sparkType === "heatmap" && Heatmap(chartProps)}

            {selectedBin && (
              <text y={-2} {...textProps} pointerEvents="none">
                {selectedBin.length}
              </text>
            )}
            {selectedBin && (
              <text y={height + 2} {...textProps} pointerEvents="none">
                {`[${selectedBin.x0} - ${selectedBin.x1}]`}
              </text>
            )}
          </g>
        </svg>
      </div>
    );
  };
}

export const sparkPositions = [
  "right",
  "left",
  // "above",
  // "below",
  // "inline transparent",
  // "inline opaque",
  // "expand inline",
  // "left margin",
  // "right margin",
  // "inline start",
  // "inline end",
] as const;
export const sparkTypes = ["line", "bar", "heatmap"];
export type SparkPos = (typeof sparkPositions)[number];
export type SparkType = (typeof sparkTypes)[number];

export const buildSparkProjection = (
  preComputedHistograms: PreComputedHistograms,
  position: SparkPos,
  type: SparkType
): Projection => {
  // above, below, right
  let mode = "suffix";
  if (position === "left") {
    mode = "prefix";
  }
  return {
    projection: buildHistogramProjection(preComputedHistograms, position, type),
    hasInternalState: false,
    type: "inline",
    mode,
    query: {
      type: "index",
      query: ["marks", 0, "encode", "enter", "*", "field", "field___value"],
    },
  } as Projection;
};
