import { linter } from "@codemirror/lint";
import { produceLintValidations } from "./vendored/validator";
import { codeString } from "./utils";
import { cmStatePlugin } from "./cmState";
import { parser } from "@lezer/json";

export interface Diagonstic {
  location: {
    offset: number;
    length: number;
  };
  message: string;
  code: keyof typeof errorCodeToErrorType;
  source?: string;
  expected?: string[];
}

function validateCode(code: string): Promise<Diagonstic[]> {
  const errors: Diagonstic[] = [];
  parser.parse(code).iterate({
    enter: (node) => {
      if (node.node.type.name === "⚠") {
        errors.push({
          location: { offset: node.from, length: node.to - node.from },
          message: "Parse Error",
          code: 1,
          source: "parser",
        });
      }
    },
  });
  return Promise.resolve(errors);
}

const errorCodeToErrorType = {
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
  return Promise.all([
    produceLintValidations(schema, code),
    validateCode(code),
  ]).then(([x, parsedValidations]) => {
    const problems = [...x.problems, ...parsedValidations] as Diagonstic[];
    return problems.map((problem) => {
      const { location, message, code, source, expected } = problem;
      return {
        from: location.offset,
        to: location.offset + location.length,
        severity: code ? errorCodeToErrorType[code] : "info",
        source: source || "Schema Validation",
        message,
        expected,
      } as LintError;
    });
  });
};

export interface LintError {
  from: number;
  to: number;
  severity: "error" | "warning" | "info";
  source: string;
  message: string;
  expected?: string[];
}
