import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { classNames } from "../utils";
import { MenuEvent } from "../modify-json";
import { MenuRow } from "../compute-menu-contents";

type MenuElementRenderer<T> = (props: {
  eventDispatch: (menuEvent: MenuEvent, shouldCloseMenu?: boolean) => void;
  // TODO fix this type;
  menuElement: T;
  isSelected: boolean;
  allElementsInGroupAreOfThisType: boolean;
  parentGroup: MenuRow;
}) => JSX.Element;

const DisplayElement: MenuElementRenderer<any> = (props) => {
  const isLintError = props.parentGroup.label === "Lint error";
  return (
    <div
      className={classNames({
        "cm-annotation-render-widget-display": true,
        "cm-annotation-widget-element": true,
        "cm-annotation-widget-element-selected": props.isSelected,
      })}
      style={isLintError ? { color: "red" } : {}}
    >
      <ReactMarkdown>{props.menuElement.content.trim()}</ReactMarkdown>
    </div>
  );
};

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
        "cm-annotation-widget-element": true,
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
  allElementsInGroupAreOfThisType,
}) => (
  <div
    className={classNames({
      flex: !allElementsInGroupAreOfThisType,
      "flex-down": allElementsInGroupAreOfThisType,
      "cm-annotation-widget-element": true,
      "cm-annotation-widget-element-selected": isSelected,
    })}
  >
    <button onClick={() => eventDispatch(onSelect, true)}>{content}</button>
    {label && <div>{label}</div>}
  </div>
);

const ProjectionElement: MenuElementRenderer<any> = ({
  isSelected,
  menuElement: { element },
}) => (
  <div
    className={classNames({
      "cm-annotation-widget-element": true,
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
};
const RenderMenuElement: MenuElementRenderer<any> = (props) => {
  return dispatch[props.menuElement.type](props);
};

export default RenderMenuElement;
