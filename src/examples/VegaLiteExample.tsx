import React, { useState, FC } from "react";

import "../stylesheets/vega-lite-example.css";

import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import * as Json from "jsonc-parser";

import VegaLiteV5Schema from "../constants/vega-lite-v5-schema.json";
import Editor from "../components/Editor";
import { ProjectionProps } from "../../src/lib/projections";
import { setIn } from "../lib/utils";

const vegaLiteCode = `
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
const Pill: FC<{ name: string }> = function Pill(props) {
  const { name } = props;
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "PILL",
    item: { name },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
      handlerId: monitor.getHandlerId(),
    }),
  }));

  const opacity = isDragging ? 0.4 : 1;
  return (
    <div ref={drag} className="pill" style={{ opacity }} data-testid={`pill`}>
      {name}
    </div>
  );
};

function lazyParse(content: string): any {
  try {
    return Json.parse(content);
  } catch (e) {
    return content;
  }
}

// const DataTable = (props: ProjectionProps): JSX.Element => {
//   const parsed = lazyParse(props.currentValue);
//   console.log(props, parsed);
//   if (!Array.isArray(parsed) || !parsed.length) {
//     return <div>hi</div>;
//   }
//   const keys: string[] = Array.from(
//     parsed.reduce((acc, row: Record<string, any>) => {
//       Object.keys(row).forEach((key) => acc.add(key));
//       return acc;
//     }, new Set())
//   );
//   return (
//     <div>
//       <table>
//         <tr>
//           {keys.map((key) => (
//             <th>{key}</th>
//           ))}
//         </tr>
//         {parsed.map((row) => (
//           <tr>
//             {keys.map((key) => (
//               <td>{row[key]}</td>
//             ))}
//           </tr>
//         ))}
//       </table>
//     </div>
//   );
// };

const Shelf: FC<{
  currentValue: any;
  keyPath: string[];
  setCurrentCode: (x: any) => void;
  currentCode: string;
  // getCurrentCode: () => string;
}> = function Shelf(props) {
  const {
    keyPath,
    currentCode,
    // getCurrentCode,
    setCurrentCode,
    currentValue,
  } = props;
  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: "PILL",
    drop: (x: any) => {
      // const currentCode = getCurrentCode();
      const update = setIn(keyPath, x.name, currentCode);
      setCurrentCode(update);
      return { name: "Dustbin" };
    },
    collect: (m) => ({ isOver: m.isOver(), canDrop: m.canDrop() }),
  }));

  const isActive = canDrop && isOver;
  const backgroundColor = isActive
    ? "darkgreen"
    : canDrop
    ? "darkkhaki"
    : "#222";
  const parsedCurrentValue = lazyParse(currentValue);
  return (
    <div
      ref={drop}
      className="shelf"
      style={{ backgroundColor }}
      data-testid="dustbin"
    >
      {isActive && !parsedCurrentValue && "Release to drop"}
      {!isActive && !parsedCurrentValue && "Drag a box here"}
      {!isActive && parsedCurrentValue && (
        <div className="shelf-content">
          <div>{parsedCurrentValue}</div>
          <div
            onClick={() => {
              // const currentCode = getCurrentCode();
              const update = setIn(keyPath, false, currentCode);
              setCurrentCode(update);
            }}
          >
            ⦻
          </div>
        </div>
      )}
    </div>
  );
};

function CounterProjection(props: ProjectionProps) {
  const [count, setCount] = useState(0);
  return (
    <div className="counter" onClick={() => setCount(count + 1)}>
      counter-{count}
    </div>
  );
}

const shelf =
  (setCurrentCode: any, currentCode: any) => (content: ProjectionProps) => {
    return (
      <DndProvider backend={HTML5Backend}>
        <Shelf
          setCurrentCode={setCurrentCode}
          currentCode={currentCode}
          keyPath={content.keyPath as any}
          currentValue={content.currentValue}
        />
      </DndProvider>
    );
  };

function VegaLiteExampleApp() {
  const [currentCode, setCurrentCode] = useState(vegaLiteCode);
  const [formVal, setFormVal] = useState("type some stuff");

  function DynamicProjection(props: ProjectionProps) {
    return (
      <div className="dynamic-projection-example">
        my content is "{formVal}"
      </div>
    );
  }
  const fields = ["penguins", "flowers", "wheat", "squids"];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="App">
        <div className="flex">
          {fields.map((x) => (
            <Pill name={x} key={x} />
          ))}
          <button onClick={() => setCurrentCode("{}")}>new text</button>
          <div className="flex-down">
            <label htmlFor="example-form-val">{formVal}</label>
            <input
              id="example-form-val"
              value={formVal}
              onChange={(e) => setFormVal(e.target.value)}
            />
          </div>
        </div>
        <Editor
          schema={VegaLiteV5Schema}
          code={currentCode}
          onChange={(x) => setCurrentCode(x)}
          projections={[
            {
              query: { type: "index", query: ["data", "values", "*"] },
              type: "tooltip",
              projection: ({ keyPath }) => {
                return <div>hi annotation projection {keyPath.join(",")}</div>;
              },
              hasInternalState: false,
              name: "popover example",
            },
            {
              query: {
                type: "index",
                query: ["encoding", "*", "field", "field___val"],
              },
              type: "tooltip",
              projection: (props) => {
                return (
                  <div>
                    {fields.map((x) => (
                      <button
                        onClick={() =>
                          setCurrentCode(setIn(props.keyPath, x, currentCode))
                        }
                        key={x}
                      >
                        {x}
                      </button>
                    ))}
                  </div>
                );
              },
              hasInternalState: false,
              name: "Field Picker",
            },
            // {
            //   query: ["data", "values", "*"],
            //   type: "inline",
            //   projection: DataTable,
            //   hasInternalState: false,
            // },
            {
              // query: ["data", "values", "*"],
              query: {
                type: "index",
                query: ["description", "description___key"],
              },
              type: "inline",
              projection: CounterProjection,
              hasInternalState: true,
              name: "counter",
            },
            {
              // query: ["data", "values", "*"],
              query: { type: "index", query: ["mark", "mark___key"] },
              type: "inline",
              projection: DynamicProjection,
              hasInternalState: true,
              name: "dynamic projection",
            },
            {
              // query: ["data", "values", "*"],
              query: {
                type: "index",
                query: ["encoding", "*", "field", "field___val"],
              },
              type: "inline",
              projection: shelf(setCurrentCode, currentCode),
              hasInternalState: false,
              name: "dnd",
            },
          ]}
        />
      </div>
    </DndProvider>
  );
}

export default VegaLiteExampleApp;
