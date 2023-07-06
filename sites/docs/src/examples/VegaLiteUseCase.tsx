import { useState, FC, useEffect } from "react";

import { VegaLite } from "react-vega";
import "../stylesheets/vega-lite-example.css";

import { prettifier, StandardBundle, Editor, utils } from "prong";
import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import DataTable from "./DataTable";

import VegaLiteV5Schema from "../constants/vega-lite-v5-schema.json";
import { ProjectionProps, Projection } from "../../src/lib/projections";
import { vegaLiteCode } from "./example-data";
import {
  extractFieldNames,
  usePersistedState,
  buildInlineDropDownProjection,
} from "./example-utils";

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
      const update = utils.setIn(keyPath, `"${x.name}"`, currentCode);
      setCurrentCode(update);
      return { name: "Dustbin" };
    },
    collect: (m) => ({ isOver: m.isOver(), canDrop: m.canDrop() }),
  }));

  const isActive = canDrop && isOver;
  const parsedCurrentValue = utils.simpleParse(currentValue, currentValue);
  return (
    <div
      ref={drop}
      className={utils.classNames({
        shelf: true,
        "shelf-empty": !isActive && !parsedCurrentValue,
        "shelf-full": !isActive && parsedCurrentValue,
        "shelf-droppable": isActive && !parsedCurrentValue,
      })}
      data-testid="dustbin"
    >
      {isActive && !parsedCurrentValue && "Release to drop"}
      {!isActive && !parsedCurrentValue && "Drag a box here"}
      {!isActive && parsedCurrentValue && (
        <div className="shelf-content">
          <div>{parsedCurrentValue}</div>
          <div
            onClick={() =>
              setCurrentCode(utils.setIn(keyPath, '""', currentCode))
            }
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
            const inlinedData = utils.simpleParse(result, []);
            const insertCode = inlinedData
              .map((x: any) => JSON.stringify(x))
              .join(",\n\t\t");
            const prepped = `{\n\t"values": [\n\t\t${insertCode}\n\t]}`;
            const newCode = utils.setIn(keyPath, prepped, fullCode);
            setCode(newCode);
          };
          reader.readAsText(file);
        }}
      />
    </label>
  );
};

const UploadDataset: React.FC<{
  setCode: (code: string) => void;
  fullCode: string;
}> = ({ setCode, fullCode }) => {
  return (
    <label className="flex-down">
      Upload JSON File
      <input
        type="file"
        accept="json"
        name="file"
        onChange={(event) => {
          const file = event.target.files![0];
          var reader = new FileReader();
          reader.onload = function (event) {
            const result = event.target!.result;
            const inlinedData = utils.simpleParse(result, []);
            const insertCode = inlinedData
              .map((x: any) => JSON.stringify(x))
              .join(",\n\t\t");
            setCode(
              prettifier(
                utils.simpleParse(
                  utils.setIn(
                    ["data", "values", "values___value"],
                    `[${insertCode}]`,
                    fullCode
                  ),
                  {}
                )
              )
            );
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
        utils.simpleParse(
          utils.setIn(["data", "values", "values___value"], x, currentCode),
          {}
        )
      );
    });
}

function getFieldNamesFromSpec(currentCode: string): string[] {
  const currentVal = utils.simpleParse(currentCode, {});
  const vals = currentVal?.data?.values;
  if (!vals || !Array.isArray(vals)) {
    return [];
  }
  return extractFieldNames(vals);
}

function getMarkType(currentCode: string): string | null {
  const currentVal = utils.simpleParse(currentCode, {});
  const val = currentVal?.mark;
  if (typeof val !== "string") {
    return null;
  }
  return val;
}

function VegaLiteExampleApp() {
  const [currentCode, setCurrentCode] = usePersistedState(
    "currentCodeVLDemo",
    vegaLiteCode
  );
  const [showDataTable, setShowDataTable] = useState<boolean>(true);
  const [fields, setFields] = useState<string[]>([]);
  const [markType, setMarkType] = useState<string | null>(null);
  useEffect(() => {
    setFields(getFieldNamesFromSpec(currentCode));
    setMarkType(getMarkType(currentCode));
  }, [currentCode]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="App vl-demo">
        <div>
          <b>Select Data</b>
          <div className="flex data-container">
            <UploadDataset fullCode={currentCode} setCode={setCurrentCode} />
            <div>
              Pick from a predefined one
              <div>
                {[
                  // "penguins.json",
                  "barley.json",
                  "wheat.json",
                ].map((file) => {
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
        </div>
        <div>
          <b>Columns from selected dataset</b>
          <div className="data-container">
            {fields.map((x) => (
              <Pill name={x} key={x} />
            ))}
          </div>
        </div>
        <div>
          {!showDataTable && (
            <button onClick={() => setShowDataTable(true)}>
              Show data table
            </button>
          )}

          <button onClick={() => setCurrentCode(vegaLiteCode)}>Reset</button>
        </div>

        <div className="flex">
          <Editor
            schema={VegaLiteV5Schema}
            code={currentCode}
            onChange={(x) => setCurrentCode(x)}
            projections={
              [
                ...Object.values(StandardBundle),
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
                                utils.setIn(
                                  props.keyPath,
                                  `"${x}"`,
                                  currentCode
                                )
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
                  query: {
                    type: "index",
                    query: ["data", "values", "values___value"],
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
                markType &&
                  buildInlineDropDownProjection(
                    [
                      "area",
                      "bar",
                      "circle",
                      "line",
                      "point",
                      "rect",
                      "rule",
                      "square",
                      "tick",
                    ],
                    markType,
                    ["mark", "mark___value"]
                  ),

                BuildUploadAndInline(["data"]),
              ].filter((x) => x) as Projection[]
            }
          />
          <div className="chart-container">
            <VegaLite spec={utils.simpleParse(currentCode, {})} />
          </div>
        </div>
      </div>
    </DndProvider>
  );
}

export default VegaLiteExampleApp;
