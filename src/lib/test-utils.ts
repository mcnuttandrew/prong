import { SyntaxNode } from "@lezer/common";
import { parser } from "@lezer/json";
// could also write one that is find by text content?
export function findNodeByLocation(
  text: string,
  from: number,
  to: number
): SyntaxNode | null {
  let foundNode: SyntaxNode | null = null;
  parser.parse(text).iterate({
    enter: (node) => {
      // console.log(node.from, node.to, node.node.type);
      if (node.from === from && node.to === to) {
        foundNode = node.node as unknown as SyntaxNode;
      }
    },
  });
  return foundNode;
}

export function findNodeByText(
  text: string,
  matchText: string
): SyntaxNode | null {
  let foundNode: SyntaxNode | null = null;
  parser.parse(text).iterate({
    enter: (node) => {
      // console.log(node.from, node.to, node.node.type);
      const testText = text.slice(node.from, node.to);
      if (testText === matchText) {
        foundNode = node.node as unknown as SyntaxNode;
      }
    },
  });
  return foundNode;
}
