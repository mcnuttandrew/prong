import { useState, useEffect } from "react";
import VegaLiteV5Schema from "../constants/vega-lite-v5-schema.json";
import { Editor, ProjectionProps, Projection, utils } from "prong";
import { vegaLiteCode } from "./example-data";

function CounterProjection(_props: ProjectionProps) {
  const [count, setCount] = useState(0);
  return (
    <div className="counter" onClick={() => setCount(count + 1)}>
      Clicked {count} Times
    </div>
  );
}

function VegaLiteExampleApp() {
  const [currentCode, setCurrentCode] = useState(vegaLiteCode);
  const [clockRunning, setClockRunning] = useState<boolean>(true);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    setTimeout(() => {
      if (clockRunning) {
        setTimer(timer + 1);
      }
    }, 5000);
  }, [timer, clockRunning]);

  function DynamicProjection(_props: ProjectionProps) {
    return <div className="dynamic-projection-example">Timer: ({timer})</div>;
  }
  const fields = ["penguins", "flowers", "wheat", "squids"];

  return (
    <div className="App">
      <div className="flex">
        <button onClick={() => setCurrentCode("{}")}>new text</button>
        <button onClick={() => setClockRunning(!clockRunning)}>
          toggle timer
        </button>
      </div>

      <Editor
        schema={VegaLiteV5Schema}
        code={currentCode}
        onChange={(x) => setCurrentCode(x)}
        projections={
          [
            {
              query: { type: "index", query: ["data", "values", "*"] },
              type: "tooltip",
              projection: ({ keyPath }) => {
                return (
                  <div className="flex-down">
                    <div>hi annotation projection {keyPath.join(",")}</div>
                    <div>{`Timer value: ${timer}`}</div>
                  </div>
                );
              },
              name: "popover example",
            } as Projection,
            {
              query: {
                type: "index",
                query: ["encoding", "*", "field", "field___value"],
              },
              type: "tooltip",
              projection: (props) => {
                return (
                  <div>
                    {fields.map((x) => (
                      <button
                        onClick={() =>
                          setCurrentCode(
                            utils.setIn(props.keyPath, `"${x}"`, currentCode)
                          )
                        }
                        key={x}
                      >
                        {x}
                      </button>
                    ))}
                  </div>
                );
              },
              name: "Switch to",
            } as Projection,

            {
              // query: ["data", "values", "*"],
              query: {
                type: "index",
                query: ["description"],
              },
              type: "inline",
              projection: CounterProjection,
              hasInternalState: true,
              name: "counter",
              mode: "replace",
            },
            clockRunning && {
              // query: ["data", "values", "*"],
              query: { type: "index", query: ["$schema"] },
              type: "inline",
              projection: DynamicProjection,
              hasInternalState: true,
              name: "dynamic projection",
              mode: "replace",
            },
          ].filter((x) => x) as Projection[]
        }
      />
    </div>
  );
}

export default VegaLiteExampleApp;
