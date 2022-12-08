import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { MenuEvent, classNames } from "../utils";

type MenuElementRenderer<T> = (props: {
  eventDispatch: (menuEvent: MenuEvent, shouldCloseMenu?: boolean) => void;
  // TODO fix this type;
  menuElement: T;
  isSelected: boolean;
}) => JSX.Element;

const DisplayElement: MenuElementRenderer<any> = (props) => (
  <div
    className={classNames({
      "cm-annotation-render-widget-display": true,
      "cm-annotation-widget-element": !props.isSelected,
      "cm-annotation-widget-element-selected": props.isSelected,
    })}
  >
    <ReactMarkdown>{props.menuElement.content}</ReactMarkdown>
  </div>
);

const InputElement: MenuElementRenderer<any> = (props) => {
  const { isSelected, menuElement, eventDispatch } = props;
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isSelected) {
      ref.current?.focus();
    }
  }, [isSelected]);
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
    <div
      className={classNames({
        "flex-down": true,
        "cm-annotation-widget-element": !props.isSelected,
        "cm-annotation-widget-element-selected": props.isSelected,
      })}
    >
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

const ButtonElement: MenuElementRenderer<any> = (props) => (
  <div
    className={classNames({
      "cm-annotation-widget-element": !props.isSelected,
      "cm-annotation-widget-element-selected": props.isSelected,
    })}
  >
    <button
      onClick={() => props.eventDispatch(props.menuElement.onSelect, true)}
    >
      {props.menuElement.content}
    </button>
  </div>
);

const DropdownElement: MenuElementRenderer<any> = (props) => {
  return (
    <div>
      <select title={props.menuElement.type}>
        {props.menuElement.content.map((x: string) => {
          return <option value={x}>{x}</option>;
        })}
      </select>
    </div>
  );
};

const dispatch: Record<string, MenuElementRenderer<any>> = {
  display: DisplayElement,
  button: ButtonElement,
  projection: (props) => props.menuElement.element,
  "free-input": InputElement,
  dropdown: DropdownElement,
};
const RenderMenuElement: MenuElementRenderer<any> = (props) => {
  return dispatch[props.menuElement.type](props);
};

export default RenderMenuElement;
