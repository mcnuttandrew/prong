import { useEffect, useState } from "react";
import {
  ProjectionProps,
  utils,
} from "../../../../packages/prong-editor/src/index";
import { extractFieldNames, Table } from "./example-utils";

const letters = ["penguins", "flowers", "wheat", "squids", "dough", "bags"];

function RenderCell(props: {
  contents: string;
  onUpdate: (newValue: string | number) => void;
}) {
  const { contents, onUpdate } = props;
  const [active, setActive] = useState<boolean>(false);
  const [currentValue, setCurrentValue] = useState<string>(contents);
  if (!active) {
    return <td onClick={() => setActive(true)}>{contents}</td>;
  }
  return (
    <td>
      <input
        value={currentValue}
        title={"dynamic input for cell"}
        onChange={(e: any) => setCurrentValue(e.target.value)}
      />
      <div
        onClick={() => {
          setActive(false);
          onUpdate(
            isNaN(currentValue as any) ? currentValue : Number(currentValue)
          );
        }}
      >
        ✓
      </div>
    </td>
  );
}

function sortData(
  data: Table,
  sortedBy: string | false,
  forwardSort: boolean
): Table {
  return data.sort((a, b) => {
    if (!sortedBy) {
      return 0;
    }
    const aVal = a[sortedBy];
    const bVal = b[sortedBy];
    return (
      (forwardSort ? 1 : -1) *
      (typeof aVal === "string"
        ? aVal.localeCompare(bVal)
        : (aVal as number) - (bVal as number))
    );
  });
}

const PAGE_SIZE = 5;
function DataTableComponent(props: {
  data: Table;
  updateData: (newData: Table) => void;
  hideTable: () => void;
}) {
  const { data, updateData, hideTable } = props;
  const keys: string[] = extractFieldNames(data);
  const [visibleData, setVisibleData] = useState<Table>([]);
  const [page, setPage] = useState(0);
  const [sortedBy, setSortedBy] = useState<false | string>(false);
  const [forwardSort, setForwardSort] = useState<boolean>(true);
  const [maxPages, setMaxPages] = useState(0);
  useEffect(() => {
    setMaxPages(Math.floor(data.length / PAGE_SIZE));
    setPage(0);
  }, [data]);
  useEffect(() => {
    setVisibleData(
      sortData(data, sortedBy, forwardSort).slice(
        page * PAGE_SIZE,
        (page + 1) * PAGE_SIZE
      )
    );
  }, [data, page, sortedBy, forwardSort]);
  return (
    <div>
      <table className="styled-table">
        <thead>
          <tr>
            <th
              style={{ opacity: page === 0 ? 0.5 : 1 }}
              onClick={() => page > 0 && setPage(page - 1)}
            >
              ◀
            </th>
            {keys.map((key, idx) => (
              <th
                key={idx}
                onClick={() => {
                  if (key === sortedBy) {
                    setForwardSort(!forwardSort);
                  } else {
                    setSortedBy(key);
                  }
                }}
              >
                {key}
                {sortedBy === key ? (forwardSort ? "▼" : "▲") : ""}
              </th>
            ))}
            <th
              onClick={() => {
                const newKey = letters[keys.length];
                updateData(data.map((row) => ({ ...row, [newKey]: 0 })));
              }}
            >
              +
            </th>
            <th
              style={{ opacity: page === maxPages ? 0.5 : 1 }}
              onClick={() => page < maxPages && setPage(page + 1)}
            >
              ▶
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleData.map((row, idx) => (
            <tr key={`${idx}-row`}>
              <td></td>
              {keys.map((key, jdx) => (
                <RenderCell
                  key={`${key}-${jdx}`}
                  contents={row[key]}
                  onUpdate={(x) => {
                    updateData(
                      setValueInTable(data, idx + page * PAGE_SIZE, key, x)
                    );
                  }}
                />
              ))}
              <td></td>
              <td></td>
            </tr>
          ))}
          {/* pad to keep a consistent height */}
          {[...new Array(Math.max(0, PAGE_SIZE - visibleData.length))].map(
            (_, idx) => {
              return (
                <tr key={`space-row-${idx}`}>
                  <td>{"\t"}</td>
                </tr>
              );
            }
          )}
        </tbody>
        <tfoot>
          <tr>
            <th
              onClick={() => {
                updateData(sortData(data, sortedBy, forwardSort));
                hideTable();
              }}
            >
              Hide
            </th>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function setValueInTable(
  table: Table,
  rowNumber: number,
  key: string,
  newVal: string | number
): Table {
  return table.map((row, idx) => {
    if (idx !== rowNumber) {
      return row;
    }
    return { ...row, [key]: newVal };
  });
}

interface ExtendedProjectionProps extends ProjectionProps {
  externalUpdate: (code: string) => void;
  hideTable: () => void;
}

export default function DataTable(props: ExtendedProjectionProps): JSX.Element {
  const { externalUpdate, keyPath, fullCode, hideTable } = props;
  const parsed = utils.simpleParse(props.currentValue);
  if (!Array.isArray(parsed) || !parsed.length) {
    return <div>Loading data table...</div>;
  } else {
    return (
      <DataTableComponent
        data={parsed}
        hideTable={hideTable}
        updateData={(newData) => {
          externalUpdate(
            utils.setIn(keyPath, utils.prettifier(newData), fullCode)
          );
        }}
      />
    );
  }
}
