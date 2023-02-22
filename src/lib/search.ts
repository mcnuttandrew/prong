import { MenuRow } from "./compute-menu-contents";
import { SyntaxNode } from "@lezer/common";
// import levenshtein from 'js-levenshtein';
// todo https://itnext.io/string-similarity-the-basic-know-your-algorithms-guide-3de3d7346227

export function filterContents(searchTerm: string, rows: MenuRow[]): MenuRow[] {
  const term = searchTerm.toLowerCase();
  const result = rows
    .map((row) => {
      return {
        ...row,
        elements: row.elements.filter((el) => {
          switch (el.type) {
            case "button":
              return ((el.label || "") + el.content)
                .toLowerCase()
                .includes(term);
            case "display":
              return ((el.label || "") + el.content)
                .toLowerCase()
                .includes(term);
            case "free-input":
              return false;
            default:
              return true;
          }
        }),
      };
    })
    .filter((row) => row.elements.length > 0);
  return result;
}

/**
 * This function potentially filters the content depending on some heuristics
 * @param targetNode
 * @param fullCode
 * @param contents
 * @returns MenuRow[]
 */
export function potentiallyFilterContentForGesture(
  targetNode: SyntaxNode,
  fullCode: string,
  contents: MenuRow[]
) {
  // this suggests that this MAY be an autocomplete gesture
  const targetNodeIsError = targetNode.type.name === "⚠";
  const targNodeContent = fullCode.slice(targetNode.from, targetNode.to);
  const useContentAsFilter =
    targetNodeIsError && !targNodeContent.includes(" ");

  // console.log(
  //   targetNode.type,
  //   targNodeContent,
  //   contents
  // );

  if (useContentAsFilter) {
    return filterContents(targNodeContent, contents);
  } else {
    return contents;
  }
}
