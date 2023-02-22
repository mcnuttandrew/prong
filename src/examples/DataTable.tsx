import React from "react";
import { ProjectionProps } from "../lib/projections";
import { simpleParse } from "../lib/utils";

function extractFieldNames(data: Record<string, any>[]) {
  const fieldNames = new Set<string>([]);
  data.forEach((row: Record<string, any>) => {
    Object.keys(row).forEach((fieldName) => fieldNames.add(fieldName));
  });
  return Array.from(fieldNames);
}

function DataTableComponent(props: { data: Record<string, any>[] }) {
  const { data } = props;
  const keys: string[] = extractFieldNames(data);
  console.log(data);
  return (
    <div>
      <table className="styled-table">
        <thead>
          <tr>
            <th></th>
            {keys.map((key, idx) => (
              <th key={idx}>{key}</th>
            ))}
          </tr>
          <th></th>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={`${idx}-row`}>
              <td></td>
              {keys.map((key, idx) => (
                <td key={`${key}-${idx}`}>{row[key]}</td>
              ))}
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DataTable(props: ProjectionProps): JSX.Element {
  const parsed = simpleParse(props.currentValue);
  console.log(props, parsed);
  if (!Array.isArray(parsed) || !parsed.length) {
    return <div>Loading...</div>;
  } else {
    return <DataTableComponent data={parsed} />;
  }
}
