import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { xonokai } from "react-syntax-highlighter/dist/esm/styles/prism";
import ReactMarkdown from "react-markdown";

const MaskedMarkdown = ReactMarkdown as any;
const MaskedHighlight = SyntaxHighlighter as any;
function StyledMarkdown(props: { content: string }) {
  // @ts-ignore
  return (
    <MaskedMarkdown
      components={{
        code({ inline, className, children, ...props }) {
          return !inline ? (
            <MaskedHighlight
              {...props}
              children={String(children).replace(/\n$/, "")}
              style={xonokai}
              language={"jsx"}
              PreTag="div"
            />
          ) : (
            <code {...props} className={className}>
              {children}
            </code>
          );
        },
      }}
    >
      {props.content}
    </MaskedMarkdown>
  );
}
export default StyledMarkdown;
