// forked from
// https:github.com/microsoft/vscode-json-languageservice/blob/386122c7f0b6dfab488b3cadaf135188bf367e0f/src/parser/jsonParser.ts
import * as Json from "jsonc-parser";
import { SyntaxKind } from "jsonc-parser";
import { ErrorCode } from "./utils";
import { IRange, Severity } from "./validator";

import * as nls from "vscode-nls";
let localize = nls.loadMessageBundle();

export type ASTNode =
  | ObjectASTNode
  | PropertyASTNode
  | ArrayASTNode
  | StringASTNode
  | NumberASTNode
  | BooleanASTNode
  | NullASTNode;

export interface BaseASTNode {
  readonly type:
    | "object"
    | "array"
    | "property"
    | "string"
    | "number"
    | "boolean"
    | "null";
  readonly parent?: ASTNode;
  readonly offset: number;
  readonly length: number;
  readonly children?: ASTNode[];
  readonly value?: string | boolean | number | null;
}
export interface ObjectASTNode extends BaseASTNode {
  readonly type: "object";
  readonly properties: PropertyASTNode[];
  readonly children: ASTNode[];
}
export interface PropertyASTNode extends BaseASTNode {
  readonly type: "property";
  readonly keyNode: StringASTNode;
  readonly valueNode?: ASTNode;
  readonly colonOffset?: number;
  readonly children: ASTNode[];
}
export interface ArrayASTNode extends BaseASTNode {
  readonly type: "array";
  readonly items: ASTNode[];
  readonly children: ASTNode[];
}
export interface StringASTNode extends BaseASTNode {
  readonly type: "string";
  readonly value: string;
}
export interface NumberASTNode extends BaseASTNode {
  readonly type: "number";
  readonly value: number;
  readonly isInteger: boolean;
}
export interface BooleanASTNode extends BaseASTNode {
  readonly type: "boolean";
  readonly value: boolean;
}
export interface NullASTNode extends BaseASTNode {
  readonly type: "null";
  readonly value: null;
}

const Range = {
  create: (start: number, end: number): IRange => ({
    offset: start,
    length: end - start,
  }),
};

interface Diagnostic {
  range: IRange;
  message: string;
  severity: Severity;
  code: ErrorCode;
  language: "json";
  // textDocument.languageId
}

export function parse(
  // textDocument: TextDocument
  text: string
  // config?: JSONDocumentConfig
) {
  const problems: Diagnostic[] = [];
  let lastProblemOffset = -1;
  // const text = textDocument.getText();
  const scanner = Json.createScanner(text, false);

  // const commentRanges: Range[] | undefined =
  //   config && config.collectComments ? [] : undefined;
  const commentRanges = undefined;

  function _scanNext(): Json.SyntaxKind {
    while (true) {
      const token = scanner.scan();
      _checkScanError();
      switch (token) {
        // case Json.SyntaxKind.LineCommentTrivia:
        // case Json.SyntaxKind.BlockCommentTrivia:
        //   if (Array.isArray(commentRanges)) {
        //     commentRanges.push(
        //       Range.create(
        //         textDocument.positionAt(scanner.getTokenOffset()),
        //         textDocument.positionAt(
        //           scanner.getTokenOffset() + scanner.getTokenLength()
        //         )
        //       )
        //     );
        //   }
        //   break;
        // case Json.SyntaxKind.Trivia:
        // case Json.SyntaxKind.LineBreakTrivia:
        //   break;
        default:
          return token;
      }
    }
  }

  function _accept(token: Json.SyntaxKind): boolean {
    if (scanner.getToken() === token) {
      _scanNext();
      return true;
    }
    return false;
  }

  function _errorAtRange<T extends ASTNode>(
    message: string,
    code: ErrorCode,
    startOffset: number,
    endOffset: number,
    // severity: DiagnosticSeverity = DiagnosticSeverity.Error
    severity: Severity = "Error"
  ): void {
    if (problems.length === 0 || startOffset !== lastProblemOffset) {
      // const range = Range.create(
      //   textDocument.positionAt(startOffset),
      //   textDocument.positionAt(endOffset)
      // );
      const range = Range.create(startOffset, endOffset);
      problems.push(
        { range, message, severity, code, language: "json" }
        // Diagnostic.create(
        //   range,
        //   message,
        //   severity,
        //   code
        //   // textDocument.languageId
        // )
      );
      lastProblemOffset = startOffset;
    }
  }

  function _error<T extends ASTNodeImpl>(
    message: string,
    code: ErrorCode,
    node: T | undefined = undefined,
    skipUntilAfter: Json.SyntaxKind[] = [],
    skipUntil: Json.SyntaxKind[] = []
  ): T | undefined {
    let start = scanner.getTokenOffset();
    let end = scanner.getTokenOffset() + scanner.getTokenLength();
    if (start === end && start > 0) {
      start--;
      while (start > 0 && /\s/.test(text.charAt(start))) {
        start--;
      }
      end = start + 1;
    }
    _errorAtRange(message, code, start, end);

    if (node) {
      _finalize(node, false);
    }
    if (skipUntilAfter.length + skipUntil.length > 0) {
      let token = scanner.getToken();
      while (token !== Json.SyntaxKind.EOF) {
        if (skipUntilAfter.indexOf(token) !== -1) {
          _scanNext();
          break;
        } else if (skipUntil.indexOf(token) !== -1) {
          break;
        }
        token = _scanNext();
      }
    }
    return node;
  }

  function _checkScanError(): boolean {
    switch (scanner.getTokenError()) {
      case Json.ScanError.InvalidUnicode:
        _error(
          localize("InvalidUnicode", "Invalid unicode sequence in string."),
          ErrorCode.InvalidUnicode
        );
        return true;
      case Json.ScanError.InvalidEscapeCharacter:
        _error(
          localize(
            "InvalidEscapeCharacter",
            "Invalid escape character in string."
          ),
          ErrorCode.InvalidEscapeCharacter
        );
        return true;
      case Json.ScanError.UnexpectedEndOfNumber:
        _error(
          localize("UnexpectedEndOfNumber", "Unexpected end of number."),
          ErrorCode.UnexpectedEndOfNumber
        );
        return true;
      case Json.ScanError.UnexpectedEndOfComment:
        _error(
          localize("UnexpectedEndOfComment", "Unexpected end of comment."),
          ErrorCode.UnexpectedEndOfComment
        );
        return true;
      case Json.ScanError.UnexpectedEndOfString:
        _error(
          localize("UnexpectedEndOfString", "Unexpected end of string."),
          ErrorCode.UnexpectedEndOfString
        );
        return true;
      case Json.ScanError.InvalidCharacter:
        _error(
          localize(
            "InvalidCharacter",
            "Invalid characters in string. Control characters must be escaped."
          ),
          ErrorCode.InvalidCharacter
        );
        return true;
    }
    return false;
  }

  function _finalize<T extends ASTNodeImpl>(node: T, scanNext: boolean): T {
    node.length =
      scanner.getTokenOffset() + scanner.getTokenLength() - node.offset;

    if (scanNext) {
      _scanNext();
    }

    return node;
  }

  function _parseArray(parent: ASTNode | undefined): ArrayASTNode | undefined {
    if (scanner.getToken() !== Json.SyntaxKind.OpenBracketToken) {
      return undefined;
    }
    const node = new ArrayASTNodeImpl(parent, scanner.getTokenOffset());
    _scanNext(); // consume OpenBracketToken

    const count = 0;
    let needsComma = false;
    while (
      scanner.getToken() !== Json.SyntaxKind.CloseBracketToken &&
      scanner.getToken() !== Json.SyntaxKind.EOF
    ) {
      if (scanner.getToken() === Json.SyntaxKind.CommaToken) {
        if (!needsComma) {
          _error(
            localize("ValueExpected", "Value expected"),
            ErrorCode.ValueExpected
          );
        }
        const commaOffset = scanner.getTokenOffset();
        _scanNext(); // consume comma
        if (scanner.getToken() === Json.SyntaxKind.CloseBracketToken) {
          if (needsComma) {
            _errorAtRange(
              localize("TrailingComma", "Trailing comma"),
              ErrorCode.TrailingComma,
              commaOffset,
              commaOffset + 1
            );
          }
          continue;
        }
      } else if (needsComma) {
        _error(
          localize("ExpectedComma", "Expected comma"),
          ErrorCode.CommaExpected
        );
      }
      const item = _parseValue(node);
      if (!item) {
        _error(
          localize("PropertyExpected", "Value expected"),
          ErrorCode.ValueExpected,
          undefined,
          [],
          [Json.SyntaxKind.CloseBracketToken, Json.SyntaxKind.CommaToken]
        );
      } else {
        node.items.push(item);
      }
      needsComma = true;
    }

    if (scanner.getToken() !== Json.SyntaxKind.CloseBracketToken) {
      return _error(
        localize("ExpectedCloseBracket", "Expected comma or closing bracket"),
        ErrorCode.CommaOrCloseBacketExpected,
        node
      );
    }

    return _finalize(node, true);
  }

  const keyPlaceholder = new StringASTNodeImpl(undefined, 0, 0);

  function _parseProperty(
    parent: ObjectASTNode | undefined,
    keysSeen: { [key: string]: PropertyASTNode | boolean }
  ): PropertyASTNode | undefined {
    const node = new PropertyASTNodeImpl(
      parent,
      scanner.getTokenOffset(),
      keyPlaceholder
    );
    let key = _parseString(node);
    if (!key) {
      if (scanner.getToken() === Json.SyntaxKind.Unknown) {
        // give a more helpful error message
        _error(
          localize(
            "DoubleQuotesExpected",
            "Property keys must be doublequoted"
          ),
          ErrorCode.Undefined
        );
        const keyNode = new StringASTNodeImpl(
          node,
          scanner.getTokenOffset(),
          scanner.getTokenLength()
        );
        keyNode.value = scanner.getTokenValue();
        key = keyNode;
        _scanNext(); // consume Unknown
      } else {
        return undefined;
      }
    }
    node.keyNode = key;

    const seen = keysSeen[key.value];
    if (seen) {
      _errorAtRange(
        localize("DuplicateKeyWarning", "Duplicate object key"),
        ErrorCode.DuplicateKey,
        node.keyNode.offset,
        node.keyNode.offset + node.keyNode.length,
        "Warning"
      );
      if (typeof seen === "object") {
        _errorAtRange(
          localize("DuplicateKeyWarning", "Duplicate object key"),
          ErrorCode.DuplicateKey,
          seen.keyNode.offset,
          seen.keyNode.offset + seen.keyNode.length,
          "Warning"
        );
      }
      keysSeen[key.value] = true; // if the same key is duplicate again, avoid duplicate error reporting
    } else {
      keysSeen[key.value] = node;
    }

    if (scanner.getToken() === Json.SyntaxKind.ColonToken) {
      node.colonOffset = scanner.getTokenOffset();
      _scanNext(); // consume ColonToken
    } else {
      _error(
        localize("ColonExpected", "Colon expected"),
        ErrorCode.ColonExpected
      );
      if (
        scanner.getToken() === Json.SyntaxKind.StringLiteral &&
        textDocument.positionAt(key.offset + key.length).line <
          textDocument.positionAt(scanner.getTokenOffset()).line
      ) {
        node.length = key.length;
        return node;
      }
    }
    const value = _parseValue(node);
    if (!value) {
      return _error(
        localize("ValueExpected", "Value expected"),
        ErrorCode.ValueExpected,
        node,
        [],
        [Json.SyntaxKind.CloseBraceToken, Json.SyntaxKind.CommaToken]
      );
    }
    node.valueNode = value;
    node.length = value.offset + value.length - node.offset;
    return node;
  }

  function _parseObject(
    parent: ASTNode | undefined
  ): ObjectASTNode | undefined {
    if (scanner.getToken() !== Json.SyntaxKind.OpenBraceToken) {
      return undefined;
    }
    const node = new ObjectASTNodeImpl(parent, scanner.getTokenOffset());
    const keysSeen: any = Object.create(null);
    _scanNext(); // consume OpenBraceToken
    let needsComma = false;

    while (
      scanner.getToken() !== Json.SyntaxKind.CloseBraceToken &&
      scanner.getToken() !== Json.SyntaxKind.EOF
    ) {
      if (scanner.getToken() === Json.SyntaxKind.CommaToken) {
        if (!needsComma) {
          _error(
            localize("PropertyExpected", "Property expected"),
            ErrorCode.PropertyExpected
          );
        }
        const commaOffset = scanner.getTokenOffset();
        _scanNext(); // consume comma
        if (scanner.getToken() === Json.SyntaxKind.CloseBraceToken) {
          if (needsComma) {
            _errorAtRange(
              localize("TrailingComma", "Trailing comma"),
              ErrorCode.TrailingComma,
              commaOffset,
              commaOffset + 1
            );
          }
          continue;
        }
      } else if (needsComma) {
        _error(
          localize("ExpectedComma", "Expected comma"),
          ErrorCode.CommaExpected
        );
      }
      const property = _parseProperty(node, keysSeen);
      if (!property) {
        _error(
          localize("PropertyExpected", "Property expected"),
          ErrorCode.PropertyExpected,
          undefined,
          [],
          [Json.SyntaxKind.CloseBraceToken, Json.SyntaxKind.CommaToken]
        );
      } else {
        node.properties.push(property);
      }
      needsComma = true;
    }

    if (scanner.getToken() !== Json.SyntaxKind.CloseBraceToken) {
      return _error(
        localize("ExpectedCloseBrace", "Expected comma or closing brace"),
        ErrorCode.CommaOrCloseBraceExpected,
        node
      );
    }
    return _finalize(node, true);
  }

  function _parseString(
    parent: ASTNode | undefined
  ): StringASTNode | undefined {
    if (scanner.getToken() !== Json.SyntaxKind.StringLiteral) {
      return undefined;
    }

    const node = new StringASTNodeImpl(parent, scanner.getTokenOffset());
    node.value = scanner.getTokenValue();

    return _finalize(node, true);
  }

  function _parseNumber(
    parent: ASTNode | undefined
  ): NumberASTNode | undefined {
    if (scanner.getToken() !== Json.SyntaxKind.NumericLiteral) {
      return undefined;
    }

    const node = new NumberASTNodeImpl(parent, scanner.getTokenOffset());
    if (scanner.getTokenError() === Json.ScanError.None) {
      const tokenValue = scanner.getTokenValue();
      try {
        const numberValue = JSON.parse(tokenValue);
        if (!isNumber(numberValue)) {
          return _error(
            localize("InvalidNumberFormat", "Invalid number format."),
            ErrorCode.Undefined,
            node
          );
        }
        node.value = numberValue;
      } catch (e) {
        return _error(
          localize("InvalidNumberFormat", "Invalid number format."),
          ErrorCode.Undefined,
          node
        );
      }
      node.isInteger = tokenValue.indexOf(".") === -1;
    }
    return _finalize(node, true);
  }

  function _parseLiteral(parent: ASTNode | undefined): ASTNode | undefined {
    let node: ASTNodeImpl;
    switch (scanner.getToken()) {
      case Json.SyntaxKind.NullKeyword:
        return _finalize(
          new NullASTNodeImpl(parent, scanner.getTokenOffset()),
          true
        );
      case Json.SyntaxKind.TrueKeyword:
        return _finalize(
          new BooleanASTNodeImpl(parent, true, scanner.getTokenOffset()),
          true
        );
      case Json.SyntaxKind.FalseKeyword:
        return _finalize(
          new BooleanASTNodeImpl(parent, false, scanner.getTokenOffset()),
          true
        );
      default:
        return undefined;
    }
  }

  function _parseValue(parent: ASTNode | undefined): ASTNode | undefined {
    return (
      _parseArray(parent) ||
      _parseObject(parent) ||
      _parseString(parent) ||
      _parseNumber(parent) ||
      _parseLiteral(parent)
    );
  }

  let _root: ASTNode | undefined = undefined;
  const token = _scanNext();
  if (token !== Json.SyntaxKind.EOF) {
    _root = _parseValue(_root);
    if (!_root) {
      _error(
        localize("Invalid symbol", "Expected a JSON object, array or literal."),
        ErrorCode.Undefined
      );
    } else if (scanner.getToken() !== Json.SyntaxKind.EOF) {
      _error(
        localize("End of file expected", "End of file expected."),
        ErrorCode.Undefined
      );
    }
  }
  return { root: _root, problems };
  // return new JSONDocument(_root, problems, commentRanges);
}

export abstract class ASTNodeImpl {
  public abstract readonly type:
    | "object"
    | "property"
    | "array"
    | "number"
    | "boolean"
    | "null"
    | "string";

  public offset: number;
  public length: number;
  public readonly parent: ASTNode | undefined;

  constructor(parent: ASTNode | undefined, offset: number, length: number = 0) {
    this.offset = offset;
    this.length = length;
    this.parent = parent;
  }

  public get children(): ASTNode[] {
    return [];
  }

  public toString(): string {
    return (
      "type: " +
      this.type +
      " (" +
      this.offset +
      "/" +
      this.length +
      ")" +
      (this.parent ? " parent: {" + this.parent.toString() + "}" : "")
    );
  }
}

export class NullASTNodeImpl extends ASTNodeImpl implements NullASTNode {
  public type: "null" = "null";
  public value: null = null;
  constructor(parent: ASTNode | undefined, offset: number) {
    super(parent, offset);
  }
}

export class BooleanASTNodeImpl extends ASTNodeImpl implements BooleanASTNode {
  public type: "boolean" = "boolean";
  public value: boolean;

  constructor(parent: ASTNode | undefined, boolValue: boolean, offset: number) {
    super(parent, offset);
    this.value = boolValue;
  }
}

export class ArrayASTNodeImpl extends ASTNodeImpl implements ArrayASTNode {
  public type: "array" = "array";
  public items: ASTNode[];

  constructor(parent: ASTNode | undefined, offset: number) {
    super(parent, offset);
    this.items = [];
  }

  public get children(): ASTNode[] {
    return this.items;
  }
}

export class NumberASTNodeImpl extends ASTNodeImpl implements NumberASTNode {
  public type: "number" = "number";
  public isInteger: boolean;
  public value: number;

  constructor(parent: ASTNode | undefined, offset: number) {
    super(parent, offset);
    this.isInteger = true;
    this.value = Number.NaN;
  }
}

export class StringASTNodeImpl extends ASTNodeImpl implements StringASTNode {
  public type: "string" = "string";
  public value: string;

  constructor(parent: ASTNode | undefined, offset: number, length?: number) {
    super(parent, offset, length);
    this.value = "";
  }
}

export class PropertyASTNodeImpl
  extends ASTNodeImpl
  implements PropertyASTNode
{
  public type: "property" = "property";
  public keyNode: StringASTNode;
  public valueNode?: ASTNode;
  public colonOffset: number;

  constructor(
    parent: ObjectASTNode | undefined,
    offset: number,
    keyNode: StringASTNode
  ) {
    super(parent, offset);
    this.colonOffset = -1;
    this.keyNode = keyNode;
  }

  public get children(): ASTNode[] {
    return this.valueNode ? [this.keyNode, this.valueNode] : [this.keyNode];
  }
}

export class ObjectASTNodeImpl extends ASTNodeImpl implements ObjectASTNode {
  public type: "object" = "object";
  public properties: PropertyASTNode[];

  constructor(parent: ASTNode | undefined, offset: number) {
    super(parent, offset);

    this.properties = [];
  }

  public get children(): ASTNode[] {
    return this.properties;
  }
}
