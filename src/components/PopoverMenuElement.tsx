import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { MenuEvent } from "../lib/utils";

type MenuElementRenderer<T> = (props: {
  eventDispatch: (menuEvent: MenuEvent, shouldCloseMenu?: boolean) => void;
  // TODO fix this type;
  menuElement: T;
  isSelected: boolean;
}) => JSX.Element;

const RenderMenuElementDisplay: MenuElementRenderer<any> = (props) => (
  <div
    style={{
      maxHeight: "200px",
      overflowY: "auto",
      fontSize: "13px",
      background: props.isSelected ? "red" : "none",
    }}
  >
    <ReactMarkdown>{props.menuElement.content}</ReactMarkdown>
  </div>
);

const RenderMenuElementInput: MenuElementRenderer<any> = (props) => {
  const { isSelected, menuElement, eventDispatch } = props;
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isSelected) {
      ref.current?.focus();
    }
  }, [isSelected]);
  const background = isSelected ? "red" : "none";
  const onSubmit = () => {
    const response = {
      ...menuElement.onSelect,
      payload: {
        key: `"${ref.current?.value}"`,
        value: menuElement.onSelect.payload.value,
      },
    };
    eventDispatch(response, true);
  };
  return (
    <div style={{ background }} className="flex-down">
      <input
        ref={ref}
        title={`Input element for ${menuElement.label}`}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            e.stopPropagation();
            onSubmit();
          }
        }}
      />
      <button onClick={onSubmit}>{menuElement?.label}</button>
    </div>
  );
};

const RenderMenuElementButton: MenuElementRenderer<any> = (props) => (
  <button
    onClick={() => props.eventDispatch(props.menuElement.onSelect, true)}
    style={{
      background: props.isSelected ? "red" : "none",
    }}
  >
    {props.menuElement.content}
  </button>
);

const dispatch: Record<string, MenuElementRenderer<any>> = {
  display: RenderMenuElementDisplay,
  button: RenderMenuElementButton,
  projection: (props) => props.menuElement.element,
  "free-input": RenderMenuElementInput,
};
const RenderMenuElement: MenuElementRenderer<any> = (props) => {
  return dispatch[props.menuElement.type](props);
};

export default RenderMenuElement;
