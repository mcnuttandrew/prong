import { TraceryGrammar, TraceryGrammarRaw } from "./tracery";
import { ParserError } from "./tracery-parser";

interface Section {
  closeSymbol?: string;
  context?: any;
  depth?: number;
  endIndex?: number;
  index: number;
  inner?: any;
  openSymbol?: string | null;
  parent?: any;
  raw?: string;
  children: any[];
}

export function getPathFromJSON(s: string, index: number) {
  // // TODO: not valid for any of that *inside* strings

  // // Jump forward to the next whitespace, in case we're in the middle of the
  let nextSpace = s.indexOf(" ", index);

  if (nextSpace > 0) index = nextSpace + 1;

  var matches = s.substring(0, index).match(/".*":/g);
  if (matches) {
    var lastMatch = matches[matches.length - 1];
    return [lastMatch.substring(1, lastMatch.length - 2)];
  }

  return [];
}

// Given a string with a bunch of arbitrarily-nested sections:
//   e.g. "hello #world.replace('a', '#vowel#')#"
//   e.g. "some <<data='foo'>> and fxn('test #bar#', {'foo':[1,2,3]})"
type SimpleFunc = (a: any, b: any, idx?: number) => string;
// export function mapObject(obj: TraceryGrammarRaw, fxn: SimpleFunc) {
//   let obj2: TraceryGrammar = {};
//   for (let key in obj) {
//     if (obj.hasOwnProperty(key)) {
//       obj2[key] = fxn(obj[key], key);
//     }
//   }
//   return obj2;
// }

export function mapObject(
  obj: Record<string, any>,
  fn: (val: any, key: string) => any | void
): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, val]) => [key, fn(val, key)])
  );
}

export function tabSpacer(count: number) {
  let s = "";
  for (var i = 0; i < count; i++) s += "\t";
  return s;
}

export function mapObjectToArray(obj: TraceryGrammar, fxn: SimpleFunc) {
  let obj2 = [];
  let index = 0;
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      obj2.push(fxn(obj[key], key, index));
      index++;
    }
  }
  return obj2;
}

type HandlerProp = {
  index: number;
  s: string;
  c?: string;
  //   am maybe wrong
  section: Section;
};
export function parseProtected(
  contextSpec: any,
  startContext: string,
  s: string,
  handlers: {
    onOpenSection?: (prop: HandlerProp) => void;
    onChar?: (props: HandlerProp) => void;
    onCloseSection?: (props: HandlerProp) => void;
    onError?: (props: {
      type: string;
      index: number;
      openSymbol: string;
      raw: string;
    }) => void;
  } = {}
) {
  function openSection(index: number = 0, openSymbol: string | null = null) {
    let nextContext = openSymbol
      ? current!.context.exits[openSymbol]
      : contextSpec.contexts[startContext];
    if (nextContext === undefined) console.warn(openSymbol, current!.context);

    let section: Section = {
      context: nextContext,
      index: index,
      openSymbol,
      closeSymbol: openSymbol ? contextSpec.symbolPairs[openSymbol] : null,
      depth: current && current.depth ? current.depth + 1 : 0,
      parent: current,
      children: [],
    };

    if (openSymbol == null) {
      section.raw = s;
      section.inner = s;
    }

    if (current) current.children.push(section);

    // Set this as the symbol
    current = section;
    // and get all the possible open symbols for the next inner section

    if (openSymbol && handlers.onOpenSection) {
      handlers.onOpenSection({
        index: i,
        s: s,
        section: current,
      });
    }
  }

  function closeSection(index: number) {
    let openLength = current!.openSymbol ? current!.openSymbol.length : 0;
    let closeLength = current!.closeSymbol ? current!.closeSymbol.length : 0;
    if (current?.depth && current.depth < 0)
      console.warn("trying to close base section?", s, current!.closeSymbol);
    current!.raw = s.substring(current!.index, index + closeLength);
    current!.inner = s.substring(current!.index + openLength, index);
    current!.endIndex = index + closeLength;

    // Call the closing handler
    if (handlers.onCloseSection) {
      handlers.onCloseSection({
        index: i,
        s: s,
        section: current!,
      });
    }

    current = current!.parent;
  }

  let current: Section | undefined;
  openSection();

  // Save the root
  let root = current;

  let isProtected = false;
  for (var i = 0; i < s.length; i++) {
    let c = s[i];

    // Skip protected
    if (isProtected) isProtected = false;
    // Start protected
    else if (c === "\\") isProtected = true;
    else {
      // console.log(`${tabSpacer(current.depth)}${c}`)

      // First, is this the closing string of our current section?
      // If so, close this section, thats our highest priority!
      if (
        current?.closeSymbol &&
        current.closeSymbol !== null &&
        s.startsWith(current.closeSymbol, i)
      ) {
        closeSection(i);
      } else {
        // Can we start a new section here?
        // What are our options for inner sections, given the current section?
        let openSymbol = current!.context.open.filter((symbol: any) =>
          s.startsWith(symbol, i)
        )[0];

        if (openSymbol) {
          openSection(i, openSymbol);
        } else {
          if (handlers.onChar) {
            handlers.onChar({
              index: i,
              s,
              c,
              section: current!,
            });
          }
        }
      }
    }
  }

  if (current!.depth === 0) {
    closeSection(s.length);
  } else {
    // For each remaining section
    while (current!.parent) {
      if (handlers.onError) {
        handlers.onError({
          type: `unmatched '${current!.openSymbol}'`,
          index: current!.index,
          openSymbol: current!.openSymbol as string,
          raw: s.substring(current!.index),
        });
      }
      current = current!.parent;
    }
  }

  return root;
}

//=================================================================================================
//=================================================================================================
//=================================================================================================

export function splitIntoProtectedSections(
  contextSpec: any,
  startContext: string,
  s: string
): { sections: Section[]; errors: ParserError[]; isPlaintext?: boolean } {
  let errors: ParserError[] = [];
  let sections: Section[] = [];
  let last = 0;

  // split into text and protected sections
  parseProtected(
    contextSpec,
    startContext,
    s,
    // AM: god i hate this
    // (handlers = {
    {
      onOpenSection: ({ index, s, section }) => {
        if (section.depth === 1) {
          // Create a text section
          sections.push({
            index: last,
            endIndex: index,
            raw: s.substring(last, index),
          } as Section);
        }
      },
      onCloseSection: ({ index, s, section }) => {
        if (section.depth === 1) {
          sections.push({
            index: section.index,
            endIndex: section.endIndex,
            openSymbol: section.openSymbol,
            inner: section.inner,
            raw: section.raw,
          } as Section);

          last = index + section!.closeSymbol!.length;
        }
      },
      onError: (error) => {
        errors.push(error);
      },
    }
  );
  sections.push({
    index: last,
    endIndex: s.length,
    raw: s.substring(last),
  } as Section);
  return {
    sections: sections,
    errors: errors,
  };
}

//=================================================================================================
//=================================================================================================
//=================================================================================================

// Split this string into some set of raw sections and splitters
export function splitProtected(
  contextSpec: Record<any, any>,
  startContext: string,
  s: string,
  splitters: string[],
  saveSplitters = false
) {
  let sections = [];
  let last = 0;

  parseProtected(
    contextSpec,
    startContext,
    s,
    // (handlers = {
    {
      onChar: ({ index, section, c }) => {
        if (section.depth == 0) {
          // Find the largest splitter at this location
          let splitter;
          for (var i = 0; i < splitters.length; i++) {
            // Is this one bigger?
            if (
              s.startsWith(splitters[i], index) &&
              (splitter === undefined || splitter.length < splitters[i].length)
            ) {
              splitter = splitters[i];
            }
          }
          // Found one?
          if (splitter) {
            // end this text section
            sections.push(s.substring(last, index));

            if (saveSplitters)
              sections.push({
                splitter: splitter,
                index: index,
              });

            last = index + splitter.length;
          }
        }
      },
    }
  );

  // Last text section
  sections.push(s.substring(last));

  return sections;
}

//=================================================================================================
//=================================================================================================
//=================================================================================================
// Given a string with nested sections and some binary and unary operators ("i++", "-x", "-x%y + j^2", "z <= -x + sin(y)")
// Split on the highest

let priority = [
  ["=>"],
  [" for ", " in ", " where "],
  ["=", "+=", "-=", "*=", "/=", "^=", "%="],
  ["==", "!=", ">=", "<=", "<", ">"],
  ["+", "-"],
  ["*", "/"],
  ["^", "%"],
  ["!"],
];

let priorityOrder: Record<string, number> = {};
priority.forEach((data, lvl) =>
  data.forEach((item) => {
    priorityOrder[item] = lvl;
  })
);

export function constructTree(
  contextSpec: any,
  startContext: string,
  s: string
) {
  let ops = Object.keys(priorityOrder).sort((a, b) => b.length - a.length);

  let indices: { index: number; op: Op; unary: boolean; priority: number }[] =
    [];

  let skipIndex = -1;

  // Get the indices of every operator
  parseProtected(
    contextSpec,
    startContext,
    s,
    // (handlers = {
    {
      onChar: ({ index, section, c }) => {
        if (section.depth == 0 && skipIndex <= index) {
          // Is this an operator?
          let foundOps = ops.filter((op) => s.startsWith(op, index));

          // TODO: disqualify certain unary ops
          // e.g "x--y" vs '--y'

          if (foundOps.length > 0) {
            let op = foundOps[0];

            // is there anything between this and the last one?
            let unary = s.substring(skipIndex, index).trim().length === 0;

            // Correct for "x + -y" vs "x - y"
            let priority = priorityOrder[op];
            if (unary && op === "-") {
              priority = 10;
            }

            indices.push({ index, op, unary, priority });

            skipIndex = index + op.length;
          }
        }
      },
    }
  );

  type Op = any;
  function createTree(
    startIndex: number,
    endIndex: number,
    indices: Op[]
  ): { op: Op; lhs: any; rhs: any } | string {
    if (indices.length === 0) return s.substring(startIndex, endIndex).trim();
    // console.log(`create subtree: '${s.substring(startIndex, endIndex)}', ${indices.map(op => op.op)}`);
    // Identify the highest priority index

    let best = undefined;
    let bestIndex = -1;
    for (var i = 0; i < indices.length; i++) {
      let op = indices[i];
      if (!best || op.priority < best.priority) {
        best = op;
        bestIndex = i;
      }
    }

    // console.log("Split on", best, bestIndex)

    // Recurse for left and right sides of the tree
    // Setting the start and end indices and dividing up the op indexes
    return {
      op: best!.op,
      lhs: createTree(startIndex, best!.index, indices.slice(0, bestIndex)),
      rhs: createTree(
        best!.index + best!.op.length,
        endIndex,
        indices.slice(bestIndex + 1)
      ),
    };
  }

  return createTree(0, s.length, indices);
}
