import { filterContents } from "./search";
import { findNodeByText } from "./test-utils";
import { generateMenuContent } from "./compute-menu-contents";
import VegaLiteV5Schema from "../constants/vega-lite-v5-schema.json";
import { createNodeMap } from "./utils";
const updatedSchema = {
  ...VegaLiteV5Schema,
  $ref: "#/definitions/Config",
};

test("filterContents", async () => {
  const exampleString = `{ "axis": { } }`;
  const schemaMap = await createNodeMap(updatedSchema, exampleString);
  const target = findNodeByText(exampleString, `{ }`)!;
  const generatedContent = generateMenuContent(
    target,
    schemaMap,
    exampleString
  );
  expect(filterContents("gr", generatedContent)).toMatchSnapshot();
});
