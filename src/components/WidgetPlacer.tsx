import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  cb: (value: any) => void;
  content: any;
  wrap: HTMLElement;
  WrappedComponent: any;
  offsetLeft?: number;
  offsetTop?: number;
  parsedContent: any;
  parentType: string;
};

export default function WidgetPlacer(props: Props): JSX.Element {
  const {
    cb,
    content,
    wrap,
    WrappedComponent,
    offsetLeft = 0,
    offsetTop = 0,
    parsedContent,
    parentType,
  } = props;
  const { left: parentLeft, top: parentTop } = useMemo(
    () => wrap.getBoundingClientRect(),
    []
  );

  let [top, setTop] = useState(parentTop);
  let [left, setLeft] = useState(parentLeft);

  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (el.current) {
      let newTop =
        window.innerHeight - el.current.getBoundingClientRect().height - 20; // - 20 for margin
      const newLeft =
        window.innerWidth - el.current.getBoundingClientRect().width - 50;
      if (newLeft < left) {
        setLeft(newLeft);
        // If the element was moved to the left move it down to keep it from
        // concealing the actual color string beneath it
        setTop(top + 50);
      }
      if (newTop < top) {
        setTop(newTop);
      }

      const escHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          cb(null);
        }
      };
      document.addEventListener("keypress", escHandler);
      return () => document.removeEventListener("keypress", escHandler);
    }
  }, []);

  // todo pick a more appropriate name for this
  return (
    <div
      className="color-name-picker"
      style={{
        left: left + offsetLeft,
        top: top + offsetTop,
      }}
      ref={el}
    >
      <WrappedComponent
        cb={cb}
        content={content}
        wrap={wrap}
        parsedContent={parsedContent}
        parentType={parentType}
      />
    </div>
  );
}
