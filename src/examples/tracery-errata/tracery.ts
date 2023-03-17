import { tabSpacer, mapObject } from "./tracery-parser-tools";
import { parseRule, createTextNode, TraceryContent } from "./tracery-parser";
let jsonSpec = {
  id: "json",
  symbolPairs: {
    "[": "]",
    "{": "}",
    "'": "'",
    '"': '"',
  },
  map: {
    json: {
      "'": "string",
      '"': "string",
      "[": "json",
      "{": "json",
    },
    string: {},
  },
};

function isVowel(c: string) {
  var c2 = c.toLowerCase();
  return c2 === "a" || c2 === "e" || c2 === "i" || c2 === "o" || c2 === "u";
}

function isAlphaNum(c: string) {
  return (
    (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9")
  );
}

export let tracerySpec = {
  id: "tracery",
  symbolPairs: {
    "<<": ">>",
    "[": "]",
    "{": "}",
    "(": ")",
    "#": "#",
    "'": "'",
    '"': '"',
  },
  map: {
    expression: {
      "'": "rule",
      '"': "rule",
      "(": "expression",
      "[": "expression",
      "{": "expression",
    },
    rule: {
      "<<": "expression",
      "#": "expression",
      "[": "expression",
    },
    innerRule: {
      "<<": "expression",
      "#": "expression",
      "[": "expression",
      "{": "expression",
    },
  },
};

let baseMods: Record<string, (s: string) => string> = {
  capitalizeAll: function (s) {
    var s2 = "";
    var capNext = true;
    for (var i = 0; i < s.length; i++) {
      if (!isAlphaNum(s.charAt(i))) {
        capNext = true;
        s2 += s.charAt(i);
      } else {
        if (!capNext) {
          s2 += s.charAt(i);
        } else {
          s2 += s.charAt(i).toUpperCase();
          capNext = false;
        }
      }
    }
    return s2;
  },

  capitalize: (s) => s.charAt(0).toUpperCase() + s.substring(1),

  a: function (s) {
    if (s.length > 0) {
      if (s.charAt(0).toLowerCase() === "u") {
        if (s.length > 2) {
          if (s.charAt(2).toLowerCase() === "i") return "a " + s;
        }
      }

      if (isVowel(s.charAt(0))) {
        return "an " + s;
      }
    }

    return "a " + s;
  },

  firstS: function (s) {
    console.log(s);
    var s2 = s.split(" ");

    var finished = baseMods.s(s2[0]) + " " + s2.slice(1).join(" ");
    console.log(finished);
    return finished;
  },

  s: function (s) {
    switch (s.charAt(s.length - 1)) {
      case "s":
        return s + "es";
      case "h":
        return s + "es";
      case "x":
        return s + "es";
      case "y":
        if (!isVowel(s.charAt(s.length - 2)))
          return s.substring(0, s.length - 1) + "ies";
        else return s + "s";
      default:
        return s + "s";
    }
  },
  ed: function (s) {
    switch (s.charAt(s.length - 1)) {
      case "s":
        return s + "ed";
      case "e":
        return s + "d";
      case "h":
        return s + "ed";
      case "x":
        return s + "ed";
      case "y":
        if (!isVowel(s.charAt(s.length - 2)))
          return s.substring(0, s.length - 1) + "ied";
        else return s + "d";
      default:
        return s + "ed";
    }
  },
};

// Additional annotation for the spec
function processSpec(spec: ITracerySpec) {
  spec.contexts = {};

  for (const contextID in spec.map) {
    let exitMap = spec.map[contextID];
    // Create open and close character sects
    let open = Object.keys(exitMap);
    let close = open.map((s) => {
      if (!spec.symbolPairs[s])
        console.warn(`no matching symbol ${s} in specification ${spec.id}`);
      return spec.symbolPairs[s];
    });

    spec.contexts[contextID] = {
      // @ts-ignore
      id: contextID,
      open: open,
      close: close,
    };
  }

  // Add all of the connections
  for (const contextID in spec.contexts) {
    let context = spec.contexts[contextID];
    context.exits = {};

    let contextMap = spec.map[contextID];

    for (const symbol in contextMap) {
      let targetID = contextMap[symbol];
      if (!spec.contexts[targetID])
        console.warn(
          `No context named '${targetID}' in specification ${spec.id}`
        );

      context.exits[symbol] = spec.contexts[targetID];
    }
  }
}

// Annotate this specification (fluff it out so its more easily usable, also do error checking)
processSpec(tracerySpec);
processSpec(jsonSpec);

// tracery.js

// https://github.com/umdjs/umd/blob/master/templates/commonjsStrict.js

// If you just want to support Node, or other CommonJS-like environments that
// support module.exports, and you are not creating a module that has a
// circular dependency, then see returnExports.js instead. It will allow
// you to export a function as the module value.

// Defines a module "commonJsStrict" that depends another module called "b".
// Note that the name of the module is implied by the file name. It is best
// if the file name and the exported global have matching names.

// If the 'b' module also uses this type of boilerplate, then
// in the browser, it will create a global .b that is used below.

// If you do not want to support the browser global path, then you
// can remove the `root` use and the passing `this` as the first arg to
// the top function.

// (function (root, factory) {
//   if (typeof define === "function" && define.amd) {
//     // AMD. Register as an anonymous module.
//     define(["exports"], factory);
//   } else if (
//     typeof exports === "object" &&
//     typeof exports.nodeName !== "string"
//   ) {
//     // CommonJS
//     factory(exports);
//   } else {
//     // Browser globals
//     factory((root.Tracery = {}));
//   }
// })(typeof self !== "undefined" ? self : this, function (exports) {
//========================================================================
//========================================================================
//========================================================================

interface ITraceryContext {
  id: number;
  open: string[];
  close: string[];
  exits?: Record<string, ITraceryContext>;
  nodeCount: number;
}

interface ITracerySpec {
  contexts?: Record<string, ITraceryContext>;
  symbolPairs?: any;
  map: any;
  id: string;
}

// type ITraceryContent = Record<string, any>;
// interface ITraceryContent {
//   sections?: any[];
// }
// type ITraceryContent = Record<string, ITraceryTemplate>;

interface ITraceryTemplate {
  content: TraceryContent;
  raw: string;
  type: string;
}

export class TraceryNode {
  id: number;
  template: ITraceryTemplate;
  context: TraceryContext;
  depth: number;
  content?: TraceryContent;
  finished: string | undefined;
  finishedAddress?: string;

  constructor(
    context: TraceryContext,
    template: ITraceryTemplate,
    parent?: TraceryNode
  ) {
    this.id = context.nodeCount++;
    this.template = template;
    this.context = context;
    // this.parent = parent
    this.depth = parent ? parent.depth + 1 : 0;

    if (template === undefined) console.warn("undefined template");

    this.createContentNodes();
  }

  debugPrint(s: string) {
    console.log(tabSpacer(this.depth) + `${this.template.type + this.id}:` + s);
  }

  createContentNodes() {
    this.content = {};

    for (let key in this.template.content) {
      // AM: i don't think this guard is necessary?
      if (this.template.content.hasOwnProperty(key)) {
        let obj: ITraceryTemplate | undefined =
          this.template.content[key as keyof TraceryContent];
        if (obj === undefined)
          console.warn(
            `No template for ${key} in '${this.template.raw}', ${this.template.type} `
          );
        if (Array.isArray(obj)) {
          if (obj.includes(undefined))
            console.warn(
              `empty item in '${key}' in '${this.template.raw}', ${this.template.type}`
            );

          // @ts-ignore
          this.content[key] = obj.map(
            (item) => new TraceryNode(this.context, item, this)
          );
        } else {
          // @ts-ignore
          this.content[key] = new TraceryNode(this.context, obj, this);
        }
      }
    }
  }

  // Expand this node (no async)
  expand() {
    console.log("Expanding", this.template.type);
    switch (this.template.type) {
      case "rule":
        this.content!.sections!.forEach((s) => s.expand());
        this.finished = this.content!.sections!.map((s) => s.finished).join("");

        break;

      case "text":
        this.finished = this.template.raw;
        break;

      case "tag":
        this.content!.preactions.forEach((action) => action.expand());

        this.content!.src.expand();

        // Where's the source for this tag? may be a key or an address/fxn
        let address = this.content!.src.finished;
        this.finishedAddress = address;
        this.content!.ruleset = this.context.getRuleSet(this, address);

        if (this.content!.ruleset === undefined) {
          this.content!.rule = createTextNode(`((${address}))`);
        } else {
          this.content!.rule = this.context.selectRule(
            this,
            this.content!.ruleset
          );
        }

        let expandedRule = new TraceryNode(
          this.context,
          this.content!.rule,
          this
        );
        expandedRule.expand();
        this.expandedRule = expandedRule;

        this.finished = expandedRule.finished;

        this.content!.mods.forEach((mod) => {
          mod.expand();
          // TODO find and apply mod
          let modFxn = this.context.getModifier(mod);
          let params = mod.parameters
            ? mod.parameters.map((p) => p.finished)
            : [];
          this.finished = modFxn(this.finished, ...params);
        });

        // TODO: pop the preactions
        break;

      case "key":
        // Get the value of this key,
        // and smoosh it together if its a dynamic key (e.g. 'foo{someVariable/5/x}bar')
        this.content!.sections.forEach((s) => s.expand());
        this.finished = this.content!.sections.map((s) => s.finished).join("");
        break;

      case "address":
        this.content!.sections.forEach((s) => s.expand());
        this.finished = this.content!.sections.map((s) => s.finished);
        break;

      case "fxn":
        this.content!.address.expand();
        this.content!.parameters.forEach((p) => p.expand());

        break;

      case "push":
        this.content!.key.expand();
        this.content!.rules.forEach((p) => p.expand());
        this.finishedRules = this.content!.rules.map((s) =>
          parseRule(s.finished)
        );
        this.target = this.content!.key.finished;
        this.context.pushRuleSet(this.target, this.finishedRules);

        break;
      case "pop":
        this.content!.key.expand();
        this.target = this.content!.key.finished;
        this.context.popRuleSet(this.target);

        break;

      default:
        console.warn("No expansion defined for type:" + this.template.type);
        break;
    }
  }
}

// class TagNode extends Node {
// 	constructor(template, template, parent) {
// 		super(template, template, parent);
// 	}
// }

// class ActionNode extends Node {
// 	constructor(template, template, parent) {
// 		super(template, template, parent);
// 	}
// }

//========================================================================
//========================================================================
//========================================================================

// export interface TraceryGrammar {}
export type TraceryGrammar = Record<string, { sections: any[] }[]>;
export type TraceryGrammarRaw = Record<string, string[]>;
interface TraceryContextOptions {}
type TraceryRule = {};
type TraceryRuleSet = TraceryRule[];

// A class/constructor for tracery context
// A context contains a grammar ... lots of other things
export class TraceryContext {
  grammar: TraceryGrammar;
  overlay: any;
  random: () => number;
  nodeCount: number;
  constructor(grammar: TraceryGrammar, options: TraceryContextOptions) {
    this.grammar = grammar;
    this.overlay = {};
    this.random = Math.random;
    // this.modifiers = baseMods;

    this.nodeCount = 0;
    Object.assign(this, options);
    console.log(
      `construct a tracery context ${this.grammar} ${Object.keys(this.grammar)}`
    );
  }

  getModifier(node: TraceryNode) {
    const content = node.content!;
    if (node.template.type === "fxn") {
      let address = content.address.finished;

      let modFxn;

      // Get the address
      if (content.address.template.type === "address") {
        // Get this from ... the world object?
        console.warn("No world obj implemented yet");
      } else {
        modFxn = baseMods[address];
      }

      if (modFxn === undefined) {
        modFxn = (s: string) => {
          let s2 = s + "." + content.address.template.raw;
          if (content.parameters.length > 0)
            s2 += `(${content.parameters.map((p) => p.finished).join(",")})`;
          return s2;
        };
      }
      return modFxn;
    } else {
      console.warn("WEIRD MOD");
      console.warn(node);
    }
  }

  pushRuleSet(key: string, ruleset: TraceryRuleSet) {
    if (this.overlay[key] === undefined) this.overlay[key] = [];
    this.overlay[key].push(ruleset);
    console.log(`push ${ruleset} to '${key}'`);
  }

  popRuleSet(key: string) {
    if (this.overlay[key] !== undefined && this.overlay[key].length > 0)
      this.overlay[key].pop();
    else console.warn(`no overlay rulesets for'${key}'`);
  }

  getRuleSet(node: TraceryNode, key: string) {
    // TODO: fancy ruleset retrieval
    if (this.overlay[key] && this.overlay[key].length > 0) {
      // Return the last set
      let ruleset = this.overlay[key][this.overlay[key].length - 1];
      return ruleset;
    }
    return this.grammar[key];
  }

  selectRule(node: TraceryNode, ruleset: TraceryRuleSet) {
    let index = Math.floor(this.random() * ruleset.length);
    return ruleset[index];
  }

  expand(rule: TraceryRule) {
    // If this is a string, parse it
    if (typeof rule === "string") rule = parseRule(rule);

    // Create a new rulenode
    let root = new TraceryNode(this, rule);
    root.expand();
    return root;
  }
}

// Create a version of the grammar with fully-parsed rules
// useful for debugging
function parseGrammar(rawGrammar: TraceryGrammarRaw) {
  let parsed = mapObject<any>(rawGrammar, (rawRules, key) => {
    // Array-ify singleton strings
    if (!Array.isArray(rawRules) && typeof rawRules === "string")
      rawRules = [rawRules];
    if (!Array.isArray(rawRules)) {
      console.warn("unknown ruleset: ", rawRules);
      return [];
    }
    return rawRules.map((rule) => parseRule(rule));
  });

  return parsed;
}

// function ConnectionMap(rawGrammar: TraceryGrammarRaw) {
//   let grammar = parseGrammar(rawGrammar);

//   // Ok, now we have a dictionary of arrays of rulesets
//   // Create a new dictionary to track references

//   let references = {};

//   function getOrCreateReference(key: string) {
//     if (!references[key])
//       references[key] = {
//         tags: {
//           count: 0,
//           bySymbol: {},
//           modifiers: [],
//         },
//       };
//     return references[key];
//   }

//   Object.entries(grammar).forEach(([key, rules]) => {
//     getOrCreateReference(key);

//     // For each rule
//     rules.forEach((rule, ruleIndex) => {
//       // $.each(rules, (ruleIndex, rule) => {
//       // for each section
//       rule.sections.forEach((section, sectionIndex) => {
//         //   $.each(rule.sections, (sectionIndex, section) => {
//         switch (section.type) {
//           case TraceryType.TEXT:
//             break;
//           case TraceryType.TAG:
//             let ref = getOrCreateReference(section.key);
//             if (!ref.tags.bySymbol[key]) ref.tags.bySymbol[key] = 0;

//             ref.tags.bySymbol[key]++;
//             ref.tags.count++;

//             break;

//           case TraceryType.ACTION:
//             // let ref = getOrCreateReference()

//             break;
//         }
//       });
//     });
//   });

//   // $.each(references, (key, ref) => {
//   // 	console.log(key, ref.tags.count)
//   // })
// }
export const TraceryType = {
  UNKNOWN: "unknown",
  NUMBER: "number",
  OPTREE: "optree",
  OPERATOR: "operator",
  TEXT: "text",
  TAG: "tag",
  ACTION: "action",
  PUSH: "push",
  POP: "pop",
  RULE: "rule",
  RG: "rulegen",
  FXN: "fxn",
  KEY: "key",
  ADDRESS: "address",
};
export const TraceryError = {
  TAGPUSH: "push rule inside a tag",
  WEIRDPUSH: "weird push",
  UNMATCHED: "unmatched protection",
};
export const Tracery: any = {
  // attach properties to the exports object to define
  // the exported module properties.
  createContext: (grammar: TraceryGrammar, options: TraceryContextOptions) => {
    return new TraceryContext(grammar, options);
  },
  parseGrammar: parseGrammar,
  //   ConnectionMap: ConnectionMap,
  Type: TraceryType,
  Error: TraceryError,
};
