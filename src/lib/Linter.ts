import { linter } from "@codemirror/lint";
import { produceLintValidations } from "../lib/from-vscode/validator";
import { codeString } from "../lib/utils";
import { JSONSchema } from "./JSONSchemaTypes";
import { cmStatePlugin } from "./cmState";

const errorCodeToErrorType: any = {
  1: "error",
  2: "warning",
  3: "info",
  4: "info",
};

export const jsonLinter = linter((source) => {
  const schema = source.state.field(cmStatePlugin).schema;
  return produceLintValidations(schema, codeString(source, 0)).then((x) => {
    return x.problems.map((problem) => {
      const { location, message, code } = problem;
      return {
        from: location.offset,
        to: location.offset + location.length,
        severity: code ? errorCodeToErrorType[code as any] : "info",
        source: "Schema Validation",
        message,
      };
    });
  });
});
