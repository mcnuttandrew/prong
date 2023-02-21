import { MenuRow } from "./compute-menu-contents";
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
              return el.content.toLowerCase().includes(term);
            case "display":
              return el.content.toLowerCase().includes(term);
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
