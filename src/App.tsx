import React, { useState, FC, useEffect } from "react";

import "./App.css";
import "./stylesheets/vega-lite-example.css";

import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import VegaLiteV5Schema from "./constants/vega-lite-v5-schema.json";
import Editor from "./components/Editor";
import { ProjectionProps } from "../src/lib/widgets";
import { setIn } from "./lib/utils";

const code2 = `
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
const Pill: FC<{
  name: string;
  setCurrentCode: (x: any) => void;
  currentCode: string;
}> = function Pill(props) {
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

const Shelf: FC<{
  name: string;
  content: { currentValue: any; keyPath: string[] };
  setCurrentCode: (x: any) => void;
  currentCode: string;
}> = function Shelf(props) {
  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: "PILL",
    drop: (x: any) => {
      const update = setIn(
        props.content.keyPath,
        x.name,
        JSON.parse(props.currentCode)
      );
      props.setCurrentCode(JSON.stringify(update, null, 2));
      return { name: "Dustbin" };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const isActive = canDrop && isOver;
  const backgroundColor = isActive
    ? "darkgreen"
    : canDrop
    ? "darkkhaki"
    : "#222";
  const currentValue = props.content.currentValue;

  return (
    <div
      ref={drop}
      className="shelf"
      style={{ backgroundColor }}
      data-testid="dustbin"
    >
      {isActive && !currentValue && "Release to drop"}
      {!isActive && !currentValue && "Drag a box here"}
      {!isActive && currentValue && (
        <div className="shelf-content">
          <div>{currentValue}</div>
          <div
            onClick={() => {
              const update = setIn(
                props.content.keyPath,
                false,
                props.currentCode
              );
              props.setCurrentCode(JSON.stringify(update, null, 2));
            }}
          >
            ⦻
          </div>
        </div>
      )}
    </div>
  );
};

function ExampleProjection(props: ProjectionProps) {
  const [count, setCount] = useState(0);
  return (
    <div className="counter" onClick={() => setCount(count + 1)}>
      counter-{count}
    </div>
  );
}

function App() {
  const [currentCode, setCurrentCode] = useState(code2);
  const shelf = (content: any) => (
    <DndProvider backend={HTML5Backend}>
      <Shelf
        name={"test"}
        content={content}
        setCurrentCode={setCurrentCode}
        currentCode={currentCode}
      />
    </DndProvider>
  );

  useEffect(() => {
    setCurrentCode(code2);
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="App">
        <div className="flex">
          {["a", "b"].map((x) => (
            <Pill
              name={x}
              key={x}
              setCurrentCode={setCurrentCode}
              currentCode={currentCode}
            />
          ))}
          <button onClick={() => setCurrentCode("{}")}>new text</button>
        </div>
        <Editor
          schema={VegaLiteV5Schema}
          code={currentCode}
          onChange={(x) => setCurrentCode(x)}
          projections={[
            {
              query: ["data", "values", "*"],
              type: "tooltip",
              projection: ({ keyPath }) => {
                return <div>hi annotation projection {keyPath.join(",")}</div>;
              },
            },
            {
              // query: ["data", "values", "*"],
              query: ["description", "description___key"],
              type: "inline",
              projection: ExampleProjection,
            },
            {
              // query: ["data", "values", "*"],
              query: ["mark", "mark___key"],
              type: "inline",
              projection: ExampleProjection,
            },
            {
              // query: ["data", "values", "*"],
              query: ["encoding", "*", "field", "field___val"],
              type: "inline",
              projection: shelf,
            },
          ]}
        />
      </div>
    </DndProvider>
  );
}

export default App;
