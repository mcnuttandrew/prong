// forked from
// https:github.com/microsoft/vscode-json-languageservice/blob/386122c7f0b6dfab488b3cadaf135188bf367e0f/src/parser/jsonParser.ts
/* eslint-disable */
import * as Json from "jsonc-parser";
// import { SyntaxKind } from "jsonc-parser";
// import { ScanError } from "jsonc-parser";
import { ErrorCode, isNumber } from "./utils";
import { Severity } from "./validator";

import * as nls from "vscode-nls";
// const Json = require("jsonc-parser");
let localize = nls.loadMessageBundle();

enum ScanError {
  None = 0,
  UnexpectedEndOfComment = 1,
  UnexpectedEndOfString = 2,
  UnexpectedEndOfNumber = 3,
  InvalidUnicode = 4,
  InvalidEscapeCharacter = 5,
  InvalidCharacter = 6,
}

enum SyntaxKind {
  OpenBraceToken = 1,
  CloseBraceToken = 2,
  OpenBracketToken = 3,
  CloseBracketToken = 4,
  CommaToken = 5,
  ColonToken = 6,
  NullKeyword = 7,
  TrueKeyword = 8,
  FalseKeyword = 9,
  StringLiteral = 10,
  NumericLiteral = 11,
  LineCommentTrivia = 12,
  BlockCommentTrivia = 13,
  LineBreakTrivia = 14,
  Trivia = 15,
  Unknown = 16,
  EOF = 17,
}

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

/**
 * A range in a text document expressed as (zero-based) start and end positions.
 *
 * If you want to specify a range that contains a line including the line ending
 * character(s) then use an end position denoting the start of the next line.
 * For example:
 * ```ts
 * {
 *     start: { line: 5, character: 23 }
 *     end : { line 6, character : 0 }
 * }
 * ```
 */
export interface Range {
  /**
   * The range's start position
   */
  start: Position;

  /**
   * The range's end position.
   */
  end: Position;
}
const createRange = (start: Position, end: Position): Range => ({ start, end });
// const Range = {
//   create: (start: number, end: number): IRange => ({
//     offset: start,
//     length: end - start,
//   }),
// };

const getToken = (scanner: Json.JSONScanner): SyntaxKind => {
  return scanner.getToken() as unknown as SyntaxKind;
};

interface Diagnostic {
  range: Range;
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
  // const commentRanges = undefined;
  const commentRanges: Range[] = [];

  function _scanNext(): SyntaxKind {
    while (true) {
      const token = scanner.scan() as unknown as SyntaxKind;
      _checkScanError();
      switch (token) {
        case SyntaxKind.LineCommentTrivia:
        case SyntaxKind.BlockCommentTrivia:
          if (Array.isArray(commentRanges)) {
            commentRanges.push(
              createRange(
                positionAt(text, scanner.getTokenOffset()),
                positionAt(
                  text,
                  scanner.getTokenOffset() + scanner.getTokenLength()
                )
              )
            );
          }
          break;
        case SyntaxKind.Trivia:
        case SyntaxKind.LineBreakTrivia:
          break;
        default:
          return token;
      }
    }
  }

  function _accept(token: SyntaxKind): boolean {
    if ((scanner.getToken() as unknown as SyntaxKind) === token) {
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
      const range = createRange(
        positionAt(text, startOffset),
        positionAt(text, endOffset)
      );
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
    skipUntilAfter: SyntaxKind[] = [],
    skipUntil: SyntaxKind[] = []
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
      let token = scanner.getToken() as unknown as SyntaxKind;
      while (token !== SyntaxKind.EOF) {
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
    switch (scanner.getTokenError() as unknown as ScanError) {
      case ScanError.InvalidUnicode:
        _error(
          localize("InvalidUnicode", "Invalid unicode sequence in string."),
          ErrorCode.InvalidUnicode
        );
        return true;
      case ScanError.InvalidEscapeCharacter:
        _error(
          localize(
            "InvalidEscapeCharacter",
            "Invalid escape character in string."
          ),
          ErrorCode.InvalidEscapeCharacter
        );
        return true;
      case ScanError.UnexpectedEndOfNumber:
        _error(
          localize("UnexpectedEndOfNumber", "Unexpected end of number."),
          ErrorCode.UnexpectedEndOfNumber
        );
        return true;
      case ScanError.UnexpectedEndOfComment:
        _error(
          localize("UnexpectedEndOfComment", "Unexpected end of comment."),
          ErrorCode.UnexpectedEndOfComment
        );
        return true;
      case ScanError.UnexpectedEndOfString:
        _error(
          localize("UnexpectedEndOfString", "Unexpected end of string."),
          ErrorCode.UnexpectedEndOfString
        );
        return true;
      case ScanError.InvalidCharacter:
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
    if (getToken(scanner) !== SyntaxKind.OpenBracketToken) {
      return undefined;
    }
    const node = new ArrayASTNodeImpl(parent, scanner.getTokenOffset());
    _scanNext(); // consume OpenBracketToken

    const count = 0;
    let needsComma = false;
    while (
      getToken(scanner) !== SyntaxKind.CloseBracketToken &&
      getToken(scanner) !== SyntaxKind.EOF
    ) {
      if (getToken(scanner) === SyntaxKind.CommaToken) {
        if (!needsComma) {
          _error(
            localize("ValueExpected", "Value expected"),
            ErrorCode.ValueExpected
          );
        }
        const commaOffset = scanner.getTokenOffset();
        _scanNext(); // consume comma
        if (getToken(scanner) === SyntaxKind.CloseBracketToken) {
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
          [SyntaxKind.CloseBracketToken, SyntaxKind.CommaToken]
        );
      } else {
        node.items.push(item);
      }
      needsComma = true;
    }

    if (getToken(scanner) !== SyntaxKind.CloseBracketToken) {
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
      if (getToken(scanner) === SyntaxKind.Unknown) {
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

    if (getToken(scanner) === SyntaxKind.ColonToken) {
      node.colonOffset = scanner.getTokenOffset();
      _scanNext(); // consume ColonToken
    } else {
      _error(
        localize("ColonExpected", "Colon expected"),
        ErrorCode.ColonExpected
      );
      if (
        getToken(scanner) === SyntaxKind.StringLiteral &&
        positionAt(text, key.offset + key.length).line <
          positionAt(text, scanner.getTokenOffset()).line
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
        [SyntaxKind.CloseBraceToken, SyntaxKind.CommaToken]
      );
    }
    node.valueNode = value;
    node.length = value.offset + value.length - node.offset;
    return node;
  }

  function _parseObject(
    parent: ASTNode | undefined
  ): ObjectASTNode | undefined {
    if (getToken(scanner) !== SyntaxKind.OpenBraceToken) {
      return undefined;
    }
    const node = new ObjectASTNodeImpl(parent, scanner.getTokenOffset());
    const keysSeen: any = Object.create(null);
    _scanNext(); // consume OpenBraceToken
    let needsComma = false;

    while (
      getToken(scanner) !== SyntaxKind.CloseBraceToken &&
      getToken(scanner) !== SyntaxKind.EOF
    ) {
      if (getToken(scanner) === SyntaxKind.CommaToken) {
        if (!needsComma) {
          _error(
            localize("PropertyExpected", "Property expected"),
            ErrorCode.PropertyExpected
          );
        }
        const commaOffset = scanner.getTokenOffset();
        _scanNext(); // consume comma
        if (getToken(scanner) === SyntaxKind.CloseBraceToken) {
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
          [SyntaxKind.CloseBraceToken, SyntaxKind.CommaToken]
        );
      } else {
        node.properties.push(property);
      }
      needsComma = true;
    }

    if (getToken(scanner) !== SyntaxKind.CloseBraceToken) {
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
    if (getToken(scanner) !== SyntaxKind.StringLiteral) {
      return undefined;
    }

    const node = new StringASTNodeImpl(parent, scanner.getTokenOffset());
    node.value = scanner.getTokenValue();

    return _finalize(node, true);
  }

  function _parseNumber(
    parent: ASTNode | undefined
  ): NumberASTNode | undefined {
    if (getToken(scanner) !== SyntaxKind.NumericLiteral) {
      return undefined;
    }

    const node = new NumberASTNodeImpl(parent, scanner.getTokenOffset());
    if ((scanner.getTokenError() as unknown as ScanError) === ScanError.None) {
      const tokenValue = scanner.getTokenValue();
      try {
        const numberValue = Json.parse(tokenValue);
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
    switch (getToken(scanner)) {
      case SyntaxKind.NullKeyword:
        return _finalize(
          new NullASTNodeImpl(parent, scanner.getTokenOffset()),
          true
        );
      case SyntaxKind.TrueKeyword:
        return _finalize(
          new BooleanASTNodeImpl(parent, true, scanner.getTokenOffset()),
          true
        );
      case SyntaxKind.FalseKeyword:
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
  if (token !== SyntaxKind.EOF) {
    _root = _parseValue(_root);
    if (!_root) {
      _error(
        localize("Invalid symbol", "Expected a JSON object, array or literal."),
        ErrorCode.Undefined
      );
    } else if (getToken(scanner) !== SyntaxKind.EOF) {
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

/**
 * Position in a text document expressed as zero-based line and character offset.
 * The offsets are based on a UTF-16 string representation. So a string of the form
 * `a𐐀b` the character offset of the character `a` is 0, the character offset of `𐐀`
 * is 1 and the character offset of b is 3 since `𐐀` is represented using two code
 * units in UTF-16.
 *
 * Positions are line end character agnostic. So you can not specify a position that
 * denotes `\r|\n` or `\n|` where `|` represents the character offset.
 */
export interface Position {
  /**
   * Line position in a document (zero-based).
   * If a line number is greater than the number of lines in a document, it defaults back to the number of lines in the document.
   * If a line number is negative, it defaults to 0.
   */
  line: number;

  /**
   * Character offset on a line in a document (zero-based). Assuming that the line is
   * represented as a string, the `character` value represents the gap between the
   * `character` and `character + 1`.
   *
   * If the character value is greater than the line length it defaults back to the
   * line length.
   * If a line number is negative, it defaults to 0.
   */
  character: number;
}

function positionAt(content: string, offset: number): Position {
  offset = Math.max(Math.min(offset, content.length), 0);

  let lineOffsets = computeLineOffsets(content, true);
  let low = 0,
    high = lineOffsets.length;
  if (high === 0) {
    return { line: 0, character: offset };
  }
  while (low < high) {
    let mid = Math.floor((low + high) / 2);
    if (lineOffsets[mid] > offset) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  // low is the least x for which the line offset is larger than the current offset
  // or array.length if no line offset is larger than the current offset
  let line = low - 1;
  return { line, character: offset - lineOffsets[line] };
}

enum CharCode {
  // const enum CharCode {
  /**
   * The `\n` character.
   */
  LineFeed = 10,
  /**
   * The `\r` character.
   */
  CarriageReturn = 13,
}
function computeLineOffsets(
  text: string,
  isAtLineStart: boolean,
  textOffset = 0
): number[] {
  const result: number[] = isAtLineStart ? [textOffset] : [];
  for (let i = 0; i < text.length; i++) {
    let ch = text.charCodeAt(i);
    if (ch === CharCode.CarriageReturn || ch === CharCode.LineFeed) {
      if (
        ch === CharCode.CarriageReturn &&
        i + 1 < text.length &&
        text.charCodeAt(i + 1) === CharCode.LineFeed
      ) {
        i++;
      }
      result.push(textOffset + i + 1);
    }
  }
  return result;
}
