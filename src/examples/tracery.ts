// Forked from http://tracery.io/editor/js/tracery/tracery.js
interface Rule {}
// interface Section {
//   raw: string;
//   type: TraceryNodeType;
// }
type Section = {
  raw: string;
  type: TraceryNodeType;
};
type Sections = {
  [idx: number]: Section;
  length: number;
  errors?: any[];
};
type Modifier = (s: string) => string;

/**
 * @author Kate
 */

var itSpacer = "";
class NodeIterator {
  node: TraceryNode;
  childIndex: number;
  mode: 0 | 1 | 2;
  constructor(node: TraceryNode) {
    this.node = node;
    this.childIndex = -1;
    this.mode = 0;
  }
  // Go to the next
  next() {
    // Actions for this node
    // 0: Just entered
    // 1: Start children
    // 2: Children finished, exit

    switch (this.mode) {
      case 0:
        itSpacer += "   ";
        this.mode = 1;
        return { log: itSpacer + "Enter " + this.node };

      case 1:
        if (!this.node.children || this.node.children.length === 0) {
          this.mode = 2;
          return {
            log: itSpacer + "start children: no children",
          };
        } else {
          var childCount = this.node.children.length;
          this.node = this.node.children[0];
          this.mode = 0;
          return {
            log: itSpacer + "starting 0 of " + childCount + " children",
          };
        }
      case 2:
        itSpacer = itSpacer.substring(3);

        // Find a sibling
        if (this.node.parent) {
          // Attempt sibling
          var nextSib = this.node.childIndex + 1;
          if (this.node.parent.children![nextSib] !== undefined) {
            this.node = this.node.parent.children![nextSib];
            this.mode = 0;
            return { log: itSpacer + " starting sibling " + nextSib };
          } else {
            this.node = this.node.parent;
            this.mode = 2;
            return { log: itSpacer + " no remaining siblings, exit to parent" };
          }
        }
        return null;
    }
  }
}

function isVowel(c: string) {
  var c2 = c.toLowerCase();
  return c2 === "a" || c2 === "e" || c2 === "i" || c2 === "o" || c2 === "u";
}

function isAlphaNum(c: string) {
  return (
    (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9")
  );
}

var baseEngModifiers: Record<string, Modifier> = {
  varyTune: function (s: string) {
    var s2 = "";
    var d = Math.ceil(Math.random() * 5);
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i) - 97;
      if (c >= 0 && c < 26) {
        var v2 = ((c + d) % 13) + 97;
        s2 += String.fromCharCode(v2);
      } else {
        s2 += String.fromCharCode(c + 97);
      }
    }
    return s2;
  },

  capitalizeAll: function (s: string) {
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

  capitalize: function (s: string) {
    return s.charAt(0).toUpperCase() + s.substring(1);
  },

  a: function (s: string) {
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

  s: function (s: string) {
    switch (s.charAt(s.length - 1)) {
      case "s":
      case "h":
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
  ed: function (s: string) {
    switch (s.charAt(s.length - 1)) {
      case "e":
        return s + "d";
      case "y":
        if (!isVowel(s.charAt(s.length - 2)))
          return s.substring(0, s.length - 1) + "ied";
        else return s + "d";
      case "s":
      case "h":
      case "x":
      default:
        return s + "ed";
    }
  },
};

type TraceryNodeType = -1 | 0 | 1 | 2;
export class TraceryNode {
  childIndex: number;
  childRule?: Rule;
  children?: TraceryNode[];
  depth: number;
  expansionErrors?: any[];
  finishedText?: string;
  grammar: Grammar;
  isExpanded: boolean;
  parent: TraceryNode | null;
  raw: string;
  type: TraceryNodeType;
  preactions?: NodeAction[];
  symbol?: Symbol;
  modifiers?: Modifier[];
  id: string;

  constructor(
    parent: TraceryNode,
    childIndex: number,
    // settings: { raw: string; type: TraceryNodeType }
    settings: any
  ) {
    if (settings.raw === undefined) {
      throw Error("No raw input for node");
    }
    if (parent instanceof tracery.Grammar) {
      this.grammar = parent;
      this.parent = null;
      this.depth = 0;
      this.childIndex = 0;
    } else {
      this.grammar = parent.grammar;
      this.parent = parent;
      this.depth = parent.depth + 1;
      this.childIndex = childIndex;
    }

    this.raw = settings.raw;
    this.type = settings.type;
    this.isExpanded = false;

    if (!this.grammar) {
      console.warn("No grammar specified for this node", this);
    }
    this.id = `${Math.random()}`;
  }
  toString() {
    return "Node('" + this.raw + "' " + this.type + " d:" + this.depth + ")";
  }

  // Expand the node (with the given child rule)
  //  Make children if the node has any
  expandChildren(childRule: Rule, preventRecursion: boolean) {
    this.children = [];
    this.finishedText = "";

    // Set the rule for making children,
    // and expand it into section
    this.childRule = childRule;
    if (this.childRule !== undefined) {
      // @ts-ignore
      var sections = tracery.parse(childRule);
      for (var i = 0; i < sections.length; i++) {
        this.children[i] = new TraceryNode(this, i, sections[i]);
        if (!preventRecursion) this.children[i].expand(preventRecursion);

        // Add in the finished text
        this.finishedText += this.children[i].finishedText;
      }
    } else {
      console.warn("No child rule provided, can't expand children");
    }
  }

  // Expand this rule (possibly creating children)
  expand(preventRecursion?: boolean) {
    if (!this.isExpanded) {
      this.isExpanded = true;

      this.expansionErrors = [];

      // Types of nodes
      // -1: raw, needs parsing
      //  0: Plaintext
      //  1: Tag ("#symbol.mod.mod2.mod3#" or "#[pushTarget:pushRule]symbol.mod")
      //  2: Action ("[pushTarget:pushRule], [pushTarget:POP]", more in the future)

      switch (this.type) {
        // Raw rule
        case -1:
          this.expandChildren(this.raw, !!preventRecursion);
          break;

        // plaintext, do nothing but copy text into finsihed text
        case 0:
          this.finishedText = this.raw;
          break;

        // Tag
        case 1:
          // Parse to find any actions, and figure out what the symbol is
          this.preactions = [];

          var parsed = tracery.parseTag(this.raw);

          // Break into symbol actions and modifiers
          this.symbol = parsed.symbol;
          this.modifiers = parsed.modifiers;

          // Create all the preactions from the raw syntax
          if (parsed.preactions.length > 0) {
            this.preactions = [];
            console.log(parsed.preactions);
            for (var i = 0; i < parsed.preactions.length; i++) {
              this.preactions[i] = new NodeAction(
                this,
                // @ts-ignore
                parsed.preactions[i].raw
              );
            }

            // Make undo actions for all preactions (pops for each push)
            // TODO

            // Activate all the preactions
            for (var i = 0; i < this.preactions.length; i++) {
              this.preactions[i].activate();
            }
          }

          this.finishedText = this.raw;

          // Expand (passing the node, this allows tracking of recursion depth)
          // @ts-ignore
          var selectedRule = this.grammar.selectRule(this.symbol, this);

          if (!selectedRule) {
            this.expansionErrors.push({
              log: "Child rule not created",
            });
          }
          this.expandChildren(selectedRule, !!preventRecursion);

          // Apply modifiers
          for (var i = 0; i < this.modifiers.length; i++) {
            // @ts-ignore
            var mod = this.grammar.modifiers[this.modifiers[i]];
            if (!mod) this.finishedText += "((." + this.modifiers[i] + "))";
            else this.finishedText = mod(this.finishedText);
          }
          // Perform post-actions
          break;
        case 2:
          // Just a bare action?  Expand it!
          this.preactions = [new NodeAction(this, this.raw)];
          this.preactions[0].activate();

          // No visible text for an action
          // TODO: some visible text for if there is a failure to perform the action?
          this.finishedText = "";
          break;
      }
    } else {
      //console.warn("Already expanded " + this);
    }
  }
}
// const TraceryNode = function () {};

// An action that occurs when a node is expanded
// Types of actions:
// 0 Push: [key:rule]
// 1 Pop: [key:POP]
// 2 function: [functionName(param0,param1)] (TODO!)
class NodeAction {
  node: TraceryNode;
  target: any;
  type: 0 | 1 | 2;
  rule?: any;
  ruleNode?: TraceryNode;
  raw?: string;

  constructor(node: TraceryNode, raw: string) {
    if (!node) console.warn("No node for NodeAction");
    if (!raw) console.warn("No raw commands for NodeAction");

    this.node = node;

    var sections = raw.split(":");
    this.target = sections[0];

    // No colon? A function!
    if (sections.length === 1) {
      this.type = 2;
    }

    // Colon? It's either a push or a pop
    else {
      this.rule = sections[1];
      if (this.rule === "POP") {
        this.type = 1;
      } else {
        this.type = 0;
      }
    }
  }

  activate() {
    var grammar = this.node.grammar;
    switch (this.type) {
      case 0:
        // @ts-ignore
        this.ruleNode = new TraceryNode(grammar, 0, {
          type: -1,
          raw: this.rule,
        });
        // @ts-ignore
        this.ruleNode.expand();
        // @ts-ignore
        this.ruleText = this.ruleNode.finishedText;

        // @ts-ignore
        grammar.pushRules(this.target, this.ruleText, this);
        // @ts-ignore
        console.log("Push rules:" + this.target + " " + this.ruleText);
        break;
      case 1:
        break;
      case 2:
        break;
    }
  }
}

// Sets of rules
// Can also contain conditional or fallback sets of rulesets)
type Distribution = "random" | "shuffle" | "weighted" | "falloff";
class RuleSet {
  conditionalRule?: RuleSet;
  conditionalValues?: Record<string, any>;
  defaultRules?: any[];
  distribution: Distribution;
  falloff: number;
  grammar: Grammar;
  ranking: any;
  raw: string;
  shuffledDeck?: any;
  defaultUses: any;

  constructor(grammar: Grammar, raw: any) {
    this.raw = raw;
    this.grammar = grammar;
    this.falloff = 1;
    this.distribution = "random";
    if (this.grammar.distribution)
      this.distribution = this.grammar.distribution;

    if (Array.isArray(raw)) {
      this.defaultRules = raw;
    } else if (typeof raw === "string" || raw instanceof String) {
      this.defaultRules = [raw];
    } else if (raw === "object") {
      // TODO: support for conditional and hierarchical rule sets
    }
  }

  getRule() {
    // console.log("Get rule", this.raw);
    // Is there a conditional?
    if (this.conditionalRule) {
      var value = this.grammar.expand(this.conditionalRule);
      // does this value match any of the conditionals?
      // @ts-ignore
      if (this.conditionalValues && this.conditionalValues[value]) {
        // @ts-ignore
        var v = this.conditionalValues[value].getRule();
        if (v !== null && v !== undefined) return v;
      }
      // No returned value?
    }

    // Is there a ranked order?
    if (this.ranking) {
      for (var i = 0; i < this.ranking.length; i++) {
        var v = this.ranking.getRule();
        if (v !== null && v !== undefined) return v;
      }

      // Still no returned value?
    }

    if (this.defaultRules !== undefined) {
      var index = 0;
      // Select from this basic array of rules

      // Get the distribution

      switch (this.distribution) {
        case "shuffle":
          // create a shuffle desk
          if (!this.shuffledDeck || this.shuffledDeck.length === 0) {
            // make an array
            this.shuffledDeck = fyshuffle(
              // @ts-ignore
              Array.apply(null, { length: this.defaultRules.length }).map(
                Number.call,
                Number
              )
            );
          }

          index = this.shuffledDeck.pop();

          break;
        case "weighted":
          break;
        case "falloff":
          break;
        default:
          index = Math.floor(
            Math.pow(Math.random(), this.falloff) * this.defaultRules.length
          );
          break;
      }

      if (!this.defaultUses) this.defaultUses = [];
      this.defaultUses[index] = ++this.defaultUses[index] || 1;
      return this.defaultRules[index];
    }
  }

  clearState() {
    if (this.defaultUses) {
      this.defaultUses = [];
    }
  }
}

function fyshuffle(array: any[]) {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

class Symbol {
  key: string;
  grammar: Grammar;
  rawRules: Rule[];
  stack?: RuleSet[];
  uses?: any[];

  baseRules: RuleSet;
  constructor(grammar: Grammar, key: string, rawRules: Rule[]) {
    // Symbols can be made with a single value, and array, or array of objects of (conditions/values)
    this.key = key;
    this.grammar = grammar;
    this.rawRules = rawRules;

    this.baseRules = new RuleSet(this.grammar, rawRules);
    this.clearState();
  }

  clearState() {
    // Clear the stack and clear all ruleset usages
    this.stack = [this.baseRules];

    this.uses = [];
    this.baseRules.clearState();
  }

  pushRules(rawRules: Rule) {
    var rules = new RuleSet(this.grammar, rawRules);
    if (!this.stack) {
      this.stack = [];
    }
    this.stack.push(rules);
  }

  popRules() {
    this.stack?.pop();
  }

  selectRule(node?: TraceryNode) {
    if (!this.uses) {
      this.uses = [];
    }
    this.uses.push({
      node: node,
    });

    if (!this.stack || this.stack.length === 0)
      throw Error("No rules for " + this.key);
    return this.stack[this.stack.length - 1].getRule();
  }
}

class Grammar {
  raw?: any;
  modifiers: Record<string, any>;
  symbols?: Record<string, Symbol>;
  subgrammars?: Grammar[];
  distribution?: Distribution;
  constructor(raw: any) {
    this.modifiers = {};
    this.loadFromRawObj(raw);
  }

  clearState() {
    var keys = Object.keys(this.symbols || {});
    for (var i = 0; i < keys.length; i++) {
      this.symbols![keys[i]].clearState();
    }
  }

  addModifiers(mods: Record<string, Modifier>) {
    // copy over the base modifiers
    for (var key in mods) {
      if (mods.hasOwnProperty(key)) {
        this.modifiers[key] = mods[key];
      }
    }
  }

  loadFromRawObj(raw: any) {
    this.raw = raw;
    this.symbols = {};
    this.subgrammars = [];

    if (this.raw) {
      // Add all rules to the grammar
      for (var key in this.raw) {
        if (this.raw.hasOwnProperty(key)) {
          this.symbols[key] = new Symbol(this, key, this.raw[key]);
        }
      }
    }
  }

  createRoot(rule: RuleSet | string) {
    // Create a node and subnodes
    // @ts-ignore
    var root = new TraceryNode(this, 0, {
      type: -1,
      raw: rule,
    });

    return root;
  }

  expand(rule: RuleSet) {
    var root = this.createRoot(rule);
    root.expand();
    return root;
  }

  flatten(rule: RuleSet) {
    return this.expand(rule).finishedText;
  }

  // Create or push rules
  pushRules(key: string, rawRules: RuleSet[], sourceAction: NodeAction) {
    // @ts-ignore
    if (this.symbols[key] === undefined) {
      // @ts-ignore
      this.symbols[key] = new Symbol(this, key, rawRules);
      // @ts-ignore
      if (sourceAction) this.symbols[key].isDynamic = true;
    } else {
      // @ts-ignore
      this.symbols[key].pushRules(rawRules);
    }
  }

  popRules(key: string) {
    if (!(this.symbols && this.symbols[key]))
      throw Error("No symbol for key " + key);
    this.symbols[key].popRules();
  }

  selectRule(key?: string, node?: TraceryNode) {
    // @ts-ignore
    if (this.symbols[key]) return this.symbols[key].selectRule(node);

    // Failover to alternative subgrammars
    for (var i = 0; i < (this.subgrammars || []).length; i++) {
      const gram = this.subgrammars![i];
      if (gram?.symbols && gram?.symbols[key as string])
        return gram.symbols[key as string].selectRule();
    }

    return `((${key}))`;
  }
}

// var Grammar = function (raw, settings) {
//   this.modifiers = {};
//   this.loadFromRawObj(raw);
// };

// Parses a plaintext rule in the tracery syntax
const tracery = {
  createGrammar: function (raw: any) {
    const grammar = new Grammar(raw);
    grammar.addModifiers(baseEngModifiers);
    return grammar;
  },

  // Parse the contents of a tag
  parseTag: function (tagContents: string) {
    const parsed: {
      symbol?: Symbol;
      preactions: NodeAction[];
      postactions: NodeAction[];
      modifiers: Modifier[];
    } = {
      symbol: undefined,
      preactions: [],
      postactions: [],
      modifiers: [],
    };
    // @ts-ignore
    const sections = tracery.parse(tagContents);
    let symbolSection = undefined;
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].type === 0) {
        if (symbolSection === undefined) {
          symbolSection = sections[i].raw;
        } else {
          throw Error("multiple main sections in " + tagContents);
        }
      } else {
        // @ts-ignore
        parsed.preactions.push(sections[i]);
      }
    }

    if (symbolSection === undefined) {
      //   throw ("no main section in " + tagContents);
    } else {
      let components = symbolSection.split(".");
      // @ts-ignore
      parsed.symbol = components[0];
      // @ts-ignore
      parsed.modifiers = components.slice(1);
    }
    return parsed;
  },

  parse: function (rule: RuleSet) {
    let depth = 0;
    let inTag = false;
    let sections: Sections = [];
    let escaped = false;

    sections.errors = [];
    let start = 0;

    let escapedSubstring = "";
    let lastEscapedChar: string | undefined = undefined;
    function createSection(start: number, end: number, type: string) {
      if (end - start < 1) {
        // @ts-ignore
        sections.errors.push(start + ": 0-length section of type " + type);
      }
      var rawSubstring;
      if (lastEscapedChar !== undefined) {
        rawSubstring =
          // @ts-ignore
          escapedSubstring + rule.substring(lastEscapedChar + 1, end);
      } else {
        // @ts-ignore
        rawSubstring = rule.substring(start, end);
      }
      // @ts-ignore
      sections.push({
        type: type,
        raw: rawSubstring,
      });
      lastEscapedChar = undefined;
      escapedSubstring = "";
    }

    // @ts-ignore
    for (var i = 0; i < rule.length; i++) {
      if (!escaped) {
        // @ts-ignore
        var c = rule.charAt(i);

        switch (c) {
          // Enter a deeper bracketed section
          case "[":
            if (depth === 0 && !inTag) {
              // @ts-ignore
              if (start < i) createSection(start, i, 0);
              start = i + 1;
            }
            depth++;
            break;
          case "]":
            depth--;

            // End a bracketed section
            if (depth === 0 && !inTag) {
              // @ts-ignore
              createSection(start, i, 2);
              start = i + 1;
            }
            break;

          // Hashtag
          //   ignore if not at depth 0, that means we are in a bracket
          case "#":
            if (depth === 0) {
              if (inTag) {
                // @ts-ignore
                createSection(start, i, 1);
                start = i + 1;
              } else {
                // @ts-ignore
                if (start < i) createSection(start, i, 0);
                start = i + 1;
              }
              inTag = !inTag;
            }
            break;

          case "\\":
            escaped = true;
            // @ts-ignore
            escapedSubstring = escapedSubstring + rule.substring(start, i);
            start = i + 1;
            // @ts-ignore
            lastEscapedChar = i;
            break;
        }
      } else {
        escaped = false;
      }
    }
    // @ts-ignore
    if (start < rule.length) createSection(start, rule.length, 0);

    if (inTag) {
      sections.errors.push("Unclosed tag");
    }
    if (depth > 0) {
      sections.errors.push("Too many [");
    }
    if (depth < 0) {
      sections.errors.push("Too many ]");
    }

    return sections;
  },
  TraceryNode,
  Grammar,
  Symbol,
  RuleSet,
};

export default tracery;

interface App {
  generateCount: 1;
  mode: undefined;
  grammar: Grammar;
  generatedRoots: TraceryNode[];
  origin?: string;
}

// var app = {
//   generateCount: 1,
//   mode: undefined,
//   grammar: grammar,
// };
function generateRoot(app: App) {
  var origin = app.origin;
  if (!origin) {
    origin = "origin";
  }
  return app.grammar.createRoot(`#${origin}#`);
}

export function generate(preventRecursion: boolean, app: App) {
  // Clear the grammar
  app.grammar.clearState();

  app.generatedRoots = [];
  for (var i = 0; i < app.generateCount; i++) {
    var root = generateRoot(app);
    root.expand(preventRecursion);
    app.generatedRoots[i] = root;
    //  root.visualizeExpansion($("#output .content"));

    // app.stepIterator = new NodeIterator(root);
  }
  console.log(app);
  return app.generatedRoots;
  //   refreshVisualization();
}
