import {
  mapObject,
  splitIntoProtectedSections,
  splitProtected,
  constructTree,
  parseProtected,
} from "./tracery-parser-tools";
import {
  Tracery,
  TraceryType,
  TraceryError,
  tracerySpec,
  TraceryGrammar,
} from "./tracery";

export type ParserError =
  | {
      symbolKey: string;
      ruleIndex: any;
      node: any;
      errors: any;
    }
  //   | { type: keyof typeof TraceryError | typeof TraceryError; raw: string };
  | { type: string; raw?: string; msg?: string };

type PathType = "local" | "global";
export interface ParserNode {
  id: number;
  //   type: keyof typeof TraceryType;
  type: string;
  raw: string | number;
  content: any;
  errors: ParserError[];
  isDynamic?: boolean;
  pathType?: PathType;
}

function traverseNodeTree(root: any, fxn: any) {
  if (root === undefined) return;
  // what subcomponents does this node have?
  // let keys = Tracery.TypeSubcomponents[root.type]
  fxn(root);

  for (let key in root.content) {
    let obj = root.content[key];

    if (Array.isArray(obj)) obj.forEach((item) => traverseNodeTree(item, fxn));
    else traverseNodeTree(obj, fxn);
  }
}

export function getAllGrammarErrors(parsedGrammar: TraceryGrammar) {
  let errors = {
    byKey: {} as Record<string, ParserError[]>,
    all: [] as ParserError[],
  };
  mapObject(parsedGrammar, (rules, key: string) => {
    errors.byKey[key] = [];
    rules.forEach((rule: any, ruleIndex: number) => {
      traverseNodeTree(rule, (node: ParserNode) => {
        if (node.errors === undefined) console.warn("no error array:", node);
        if (node.errors.length > 0) {
          let err = {
            symbolKey: key,
            ruleIndex: ruleIndex,
            node: node,
            errors: node.errors,
          };
          errors.all.push(err);
          errors.byKey[key].push(err);
        }
      });
    });
  });

  return errors;
}

let nodeCount = 0;
export interface TraceryContent {
  sections?: ParserNode[];
  mods?: any[];
  src?: any;
  preactions?: any;
  address?: any;
  parameters?: any[];
}
function createNode(
  type: keyof typeof TraceryType,
  raw: string | number,
  //   content?: TraceryContent,
  content?: any,
  errors?: ParserError[]
): ParserNode {
  errors = errors || [];
  content = content || {};
  if (TraceryType[type] === undefined)
    console.warn(`No Tracery node type defined for ${type}`);
  return {
    id: nodeCount++,
    type: TraceryType[type],
    raw: raw,
    content: content,
    errors: errors,
  };
}

function splitIntoExpressionSections(raw: string) {
  // Trim and split
  let result = splitIntoProtectedSections(
    tracerySpec,
    "expression",
    raw.trim()
  );
  // Remove empty sections
  result.sections = result.sections.filter(
    (s) => s.openSymbol !== undefined || s!.raw!.trim().length > 0
  );

  result.isPlaintext = false;
  if (
    result.sections.length === 1 &&
    result.sections[0].openSymbol === undefined
  )
    result.isPlaintext = true;

  return result;
}

function parseKey(raw: string): ParserNode {
  // Split into sections, like "weapon{myWeaponType.capitalize}_hand"
  let result = splitIntoExpressionSections(raw);

  let errors = result.errors;
  // Dynamic keys can only have plaintext or tag{} sections
  let sections = result.sections.map((s) => {
    if (s.openSymbol === undefined) return createTextNode(s.raw!);

    if (s.openSymbol === "{") return parseTag(s.inner);

    console.warn("bad key section: ", s.raw);
    errors.push({
      type: "bad key section",
      msg: `unknown key section "${s.raw}"`,
    });
  }) as ParserNode[];

  let node = createNode("KEY", raw, { sections }, result.errors);
  node.isDynamic = !result.isPlaintext;
  return node;
}

// An address is a set of keys (or just one)
// ie: "/party/5/socket{count}/weapon"  "/language/french/adjectives/{myAdj}/femPlural"
// "animal" vs "animal/mammal" vs "/animal/mammal"?
type ExpressionAddress = string;
function parseAddress(raw: string, expressionAddress?: ExpressionAddress) {
  let splitter = expressionAddress ? "." : "/";

  let rawSections = splitProtected(tracerySpec, "expression", raw, [splitter]);

  if (rawSections.length === 1) return parseKey(raw);

  // Does it start with a "/" (or "." if an expression address)?
  let pathType: PathType = "local";
  if (rawSections[0].trim().length === 0) {
    // starts with ""
    pathType = "global";
    rawSections = rawSections.slice(1);
  }

  let node = createNode("ADDRESS", raw, {
    sections: rawSections.map((rawKey) => parseKey(rawKey)),
  });

  node.pathType = pathType;
  return node;
}

function parseFunctionOrAddress(raw: string, isFunction?: boolean) {
  raw = raw.trim();

  // Are there parenthesis here?
  let result = splitIntoExpressionSections(raw);
  let errors = result.errors;
  let sections = result.sections;

  // Anything other than {} or a last () here?

  // Parse the address itself

  let last = sections[sections.length - 1];
  if (last.openSymbol === "(") {
    let addressRaw = raw.substring(0, last.index);
    let address = parseAddress(addressRaw);

    // Slice off the parameters (we'll deal with them later)
    // ... the rest is part of the address of the function (ie: "/foo/bar/handler{event}")
    sections = sections.slice(0, sections.length - 1);

    let rawParamText = last.inner.trim();
    let parameters: ParserNode[] = [];

    if (rawParamText.length > 0) {
      let rawParams = splitProtected(tracerySpec, "expression", rawParamText, [
        ",",
      ]);
      parameters = rawParams.map((s) => parseExpression(s));
    }

    return createNode("FXN", raw, { address, parameters });
  } else {
    // are we sure its a function? (ie, a modifier without parameters or '()')
    if (isFunction)
      return createNode("FXN", raw, {
        address: parseAddress(raw),
        parameters: [],
      });
    return parseAddress(raw);
  }
}

// Parse an expression
// Might be
//		a key/address: 	"x" "foo.bar"
// 		a number: 		"5"
// 		a function: 	"max(x, y)"
//		optree: 		x + y*-2 >= max(a,b)^2

function parseExpression(raw: string, skipTreeParsing?: boolean): ParserNode {
  // Are there unprotected operators?
  // Are there protected sections? (ie, a fxn)

  // return parseKey(raw)

  let tree: any;
  if (skipTreeParsing) {
    tree = raw;
  } else {
    raw = raw.trim();
    tree = constructTree(tracerySpec, "expression", raw);
  }

  if (tree.op) {
    return createNode("OPTREE", raw, {
      op: createNode("OPERATOR", tree.op),
      lhs: parseExpression(tree.lhs, true),
      rhs: parseExpression(tree.rhs, true),
    });
  } else {
    let parsed = parseProtected(tracerySpec, "expression", raw);
    if (
      parsed?.children.length === 1 &&
      (parsed.children[0].openSymbol === "'" ||
        parsed.children[0].openSymbol === '"')
    ) {
      // A string!
      return parseRule(raw);
    }

    // Might be a number, a function, or an address
    // @ts-ignore
    if (!isNaN(raw)) {
      return createNode("NUMBER", parseFloat(raw));
    }

    // is it a function or address?
    return parseFunctionOrAddress(raw);
  }
}

function parseTag(raw: string) {
  raw = raw.trim();
  let errors: ParserError[] = [];

  const [address, ...modsRaw] = splitProtected(tracerySpec, "expression", raw, [
    ".",
  ]);

  // Question, are there any inner tags in here?
  let innerParsed = splitIntoExpressionSections(address);
  // Clip off any preceding []

  let preactions = [];
  while (innerParsed.sections[0].openSymbol == "[") {
    let inner = innerParsed.sections[0].inner;
    preactions.push(parseAction(inner));
    innerParsed.sections = innerParsed.sections.slice(1);
  }

  let remainingAddress = address;
  if (preactions.length > 0) {
    console.log(preactions);
    // Clip the inner actions off the address
    remainingAddress = address.substring(innerParsed.sections[0].index);
  }

  if (raw.indexOf("[") >= 0) {
    errors.push({ type: TraceryError.TAGPUSH, raw: raw });
    console.warn("tagWithPush", raw);
  }

  let src = parseAddress(remainingAddress);

  // Reparse the modifiers as functions
  // They may be simple keys (".s", ".capitalize")
  // or full funtions ("replace('a', '{adj} #animal#'"))

  let mods = modsRaw.map((mod) => parseFunctionOrAddress(mod, true));

  return createNode("TAG", raw, { mods, src, preactions }, errors);
}

function parseAction(raw: string) {
  raw = raw.trim();
  let errors: ParserError[] = [];

  const [actionKey, ...rg] = splitProtected(tracerySpec, "expression", raw, [
    ":",
  ]);

  // Todo: this *should* be an action/function/thingie
  if (rg.length == 0 || rg.length > 1) {
    errors.push({
      type: TraceryError.WEIRDPUSH,
      raw: raw,
    });
    return createNode("ACTION", raw, {}, errors);
  }

  // Key + rule generator situation
  let rawRules = rg[0];
  let key = parseKey(actionKey);

  if (rawRules === "POP") return createNode("POP", raw, { key }, errors);
  else {
    let rules = splitProtected(tracerySpec, "innerRule", rawRules, [","]).map(
      (s) => parseRule(s)
    );
    // TODO: more sophisticated rule parsing
    return createNode("PUSH", raw, { rules, key }, errors);
  }
}

export function createTextNode(raw: string, errors?: ParserError[]) {
  return createNode("TEXT", raw, {}, errors);
}

// Split this into sections
export function parseRule(raw: string): ParserNode {
  let errors: ParserError[] = [];

  let result = splitIntoProtectedSections(tracerySpec, "rule", raw);

  let sections = result.sections.map((section) => {
    switch (section.openSymbol) {
      case "#":
        return parseTag(section.inner);

      case "[":
        return parseAction(section.inner);

      case "<<":
        // @ts-ignore
        return createNode("PROP", section.inner);
      // return parseAction(section.inner)

      case undefined:
        return createNode("TEXT", section!.raw!);

      default:
        console.warn("unknown section type ", section);
    }
  }) as ParserNode[];
  errors = errors.concat(result.errors);

  sections = sections.filter(
    (s) => s.type !== Tracery.Type.TEXT || `${s.raw}`.length > 0
  );
  return createNode("RULE", raw, { sections }, errors);

  // Simple rule?
  // if (sections.length == 1 && sections[0].type === Tracery.Type.TEXT)
  // 	return sections[0]
}

// Notes:
// could be a rg
//  [myChar:[x in animals where hasTag(x)]]
//  [myChar:[animals]]
//  [myChar:[fish,bird,robot]]
//  [myChar:[fish,"bird","robot",/myChar/person]]

// Example use case:
// "Generate 100 recipes, pick the ones that are vegetarian and total price > 10,
//    and list them, if there are any, otherwise apologize"
// [recipes100:['#recipe#' for x in range(0,100)]]
// [recipes100Filtered:[x in recipes where (not hasTag("meat") and totalValue("price") > 10)]
// [join("\n", "(none found)" if count(recipes100Filtered) == 0 else recipes100Filtered]

// Constraint solver? "Generate one recipe that is vegetarian and total price > 10"
// Construct some

// #name.capitalize# #name.last#  #[animal where hasTag("mammal")]#
