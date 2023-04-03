import React, { useState, FC, useEffect } from "react";

import { VegaLite } from "react-vega";
import "../stylesheets/vega-lite-example.css";

import prettifier from "../lib/vendored/prettifier";
import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import standardBundle from "../projections/standard-bundle";

import DataTable from "./DataTable";

import VegaLiteV5Schema from "../constants/vega-lite-v5-schema.json";
import Editor from "../components/Editor";
import { ProjectionProps, Projection } from "../../src/lib/projections";
import { simpleParse, setIn } from "../lib/utils";
import { vegaLiteCode } from "./example-data";
import { extractFieldNames } from "./example-utils";

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

const Shelf: FC<{
  currentValue: any;
  keyPath: string[];
  setCurrentCode: (x: any) => void;
  currentCode: string;
}> = function Shelf(props) {
  const { keyPath, currentCode, setCurrentCode, currentValue } = props;
  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: "PILL",
    drop: (x: any) => {
      const update = setIn(keyPath, `"${x.name}"`, currentCode);
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
  const parsedCurrentValue = simpleParse(currentValue, currentValue);
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

const UploadAndInline: React.FC<ProjectionProps> = (props) => {
  const { keyPath, fullCode, setCode } = props;
  return (
    <label>
      Upload File
      <input
        type="file"
        accept="json"
        name="file"
        onChange={(event) => {
          const file = event.target.files![0];
          var reader = new FileReader();
          reader.onload = function (event) {
            const result = event.target!.result;
            const inlinedData = simpleParse(result, []);
            const insertCode = inlinedData
              .map((x: any) => JSON.stringify(x))
              .join(",\n\t\t");
            const prepped = `{\n\t"values": [\n\t\t${insertCode}\n\t]}`;
            const newCode = setIn(keyPath, prepped, fullCode);
            setCode(newCode);
          };
          reader.readAsText(file);
        }}
      />
    </label>
  );
};

function BuildUploadAndInline(path: (string | number)[]): Projection {
  return {
    name: "upload-and-inline",
    query: { query: path, type: "index" },
    projection: (props: ProjectionProps) => <UploadAndInline {...props} />,
    type: "tooltip",
  };
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

function buildFileGet(fileName: string, currentCode: string) {
  return fetch(`./data/${fileName}`)
    .then((x) => x.text())
    .then((x) => {
      return prettifier(
        simpleParse(
          setIn(["data", "values", "values___value"], x, currentCode),
          {}
        )
      );
    });
}

function getFieldNamesFromSpec(currentCode: string): string[] {
  const currentVal = simpleParse(currentCode, {});
  const vals = currentVal?.data?.values;
  if (!vals || !Array.isArray(vals)) {
    return [];
  }
  return extractFieldNames(vals);
}

function getMarkType(currentCode: string): string | null {
  const currentVal = simpleParse(currentCode, {});
  const val = currentVal?.mark;
  if (typeof val !== "string") {
    return null;
  }
  return val;
}

function VegaLiteExampleApp() {
  const [currentCode, setCurrentCode] = useState(vegaLiteCode);
  const [showDataTable, setShowDataTable] = useState<boolean>(true);
  const [fields, setFields] = useState<string[]>([]);
  const [markType, setMarkType] = useState<string | null>(null);
  useEffect(() => {
    setFields(getFieldNamesFromSpec(currentCode));
    setMarkType(getMarkType(currentCode));
  }, [currentCode]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="App">
        <div>
          <div>Upload dataset </div>
          <div>
            Pick from a predefined one
            <div>
              {["penguins.json", "barley.json", "wheat.json"].map((file) => {
                return (
                  <button
                    key={file}
                    onClick={() =>
                      buildFileGet(file, currentCode).then((x) =>
                        setCurrentCode(x)
                      )
                    }
                  >
                    {file}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex">
          {fields.map((x) => (
            <Pill name={x} key={x} />
          ))}
        </div>
        {!showDataTable && (
          <button onClick={() => setShowDataTable(true)}>
            Show data table
          </button>
        )}
        <div className="flex">
          <Editor
            schema={VegaLiteV5Schema}
            code={currentCode}
            onChange={(x) => setCurrentCode(x)}
            projections={
              [
                // ...Object.values(standardBundle),
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
                                setIn(props.keyPath, `"${x}"`, currentCode)
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
                showDataTable && {
                  // query: { query: ["InlineDataset"], type: "schemaMatch" },
                  query: {
                    type: "index",
                    query: ["data", "values", "values___value"],
                    // query: ["data", "values"],
                  },
                  type: "inline",
                  name: "data table",
                  projection: (props: ProjectionProps) => (
                    <DataTable
                      {...props}
                      externalUpdate={(code) => setCurrentCode(code)}
                      hideTable={() => setShowDataTable(false)}
                    />
                  ),
                  hasInternalState: true,
                  mode: "replace-multiline",
                },
                {
                  // query: ["data", "values", "*"],
                  query: {
                    type: "index",
                    query: ["encoding", "*", "field", "field___value"],
                  },
                  type: "inline",
                  projection: shelf(setCurrentCode, currentCode),
                  hasInternalState: false,
                  name: "dnd",
                  mode: "replace",
                },
                markType && {
                  query: { type: "index", query: ["mark", "mark___value"] },
                  type: "inline",
                  hasInternalState: false,
                  mode: "replace",
                  projection: () => {
                    const marks = [
                      "arc",
                      "area",
                      "bar",
                      "boxplot",
                      "circle",
                      "errorband",
                      "errorbar",
                      "geoshape",
                      "image",
                      "line",
                      "point",
                      "rect",
                      "rule",
                      "square",
                      "text",
                      "tick",
                      "trail",
                    ];
                    return (
                      <select
                        value={markType}
                        onChange={(e) => {
                          setCurrentCode(
                            setIn(
                              ["mark", "mark___value"],
                              `"${e.target.value}"`,
                              currentCode
                            )
                          );
                        }}
                      >
                        {marks.map((mark) => (
                          <option key={mark}>{mark}</option>
                        ))}
                      </select>
                    );
                  },
                },
                BuildUploadAndInline(["data"]),
              ].filter((x) => x) as Projection[]
            }
          />
          <div>
            <VegaLite spec={simpleParse(currentCode, {})} />
          </div>
        </div>
      </div>
    </DndProvider>
  );
}

export default VegaLiteExampleApp;
