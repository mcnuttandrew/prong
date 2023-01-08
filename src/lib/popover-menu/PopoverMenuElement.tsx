import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { classNames } from "../utils";
import { MenuEvent } from "../modify-json";

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
    <ReactMarkdown>{props.menuElement.content.trim()}</ReactMarkdown>
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
        flex: true,
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

const ButtonElement: MenuElementRenderer<any> = ({
  isSelected,
  menuElement: { onSelect, content, label },
  eventDispatch,
}) => (
  <div
    className={classNames({
      flex: true,
      "cm-annotation-widget-element": !isSelected,
      "cm-annotation-widget-element-selected": isSelected,
    })}
  >
    <button onClick={() => eventDispatch(onSelect, true)}>{content}</button>
    {label && <div>{label}</div>}
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

const ProjectionElement: MenuElementRenderer<any> = ({
  isSelected,
  menuElement: { element },
}) => (
  <div
    className={classNames({
      "cm-annotation-widget-element": !isSelected,
      "cm-annotation-widget-element-selected": isSelected,
    })}
  >
    {element}
  </div>
);

const dispatch: Record<string, MenuElementRenderer<any>> = {
  display: DisplayElement,
  button: ButtonElement,
  projection: ProjectionElement,
  "free-input": InputElement,
  dropdown: DropdownElement,
};
const RenderMenuElement: MenuElementRenderer<any> = (props) => {
  return dispatch[props.menuElement.type](props);
};

export default RenderMenuElement;
