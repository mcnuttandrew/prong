import { linter } from "@codemirror/lint";
import { produceLintValidations } from "./vendored/validator";
import { codeString } from "../lib/utils";
import { cmStatePlugin } from "./cmState";

const errorCodeToErrorType: any = {
  1: "error",
  2: "warning",
  3: "info",
  4: "info",
};

export const jsonLinter = linter((source) => {
  return lintCode(
    source.state.field(cmStatePlugin).schema,
    codeString(source, 0)
  );
});

export const lintCode = (schema: any, code: string): Promise<LintError[]> => {
  return produceLintValidations(schema, code).then((x) => {
    console.log(x);
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
};

export interface LintError {
  from: number;
  to: number;
  severity: "error" | "warning" | "info";
  source: string;
  message: string;
}
