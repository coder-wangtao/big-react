import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from "shared//ReactSymbol";

import {
  Key,
  ElementType,
  Ref,
  Props,
  ReactElementType,
} from "shared/ReactTypes";

const ReactElement = function (
  type: ElementType,
  key: Key,
  ref: Ref,
  props: Props,
): ReactElementType {
  const element: ReactElementType = {
    $$typeof: REACT_ELEMENT_TYPE,
    type: type,
    key,
    ref,
    props,
    __mark: "KaSong",
  };

  return element;
};

export const Fragment = REACT_FRAGMENT_TYPE;

function hasValidKey(config: any) {
  return config.key !== undefined;
}

function hasValidRef(config: any) {
  return config.ref !== undefined;
}

export const createElement = (
  type: ElementType,
  config: any,
  ...maybeChildren: any
) => {
  let key: Key = null;
  const props: Props = {};
  let ref: Ref = null;

  for (const prop in config) {
    const val = config[prop];
    if (prop === "key") {
      if (val !== undefined) {
        key = "" + val;
      }
      continue;
    }
    if (prop === "ref") {
      if (val !== undefined) {
        ref = val;
      }
      continue;
    }
    if ({}.hasOwnProperty.call(config, prop)) {
      props[prop] = val;
    }
  }
  const maybeChildrenLength = maybeChildren.length;
  if (maybeChildrenLength) {
    if (maybeChildrenLength === 1) {
      props.children = maybeChildren[0];
    } else {
      props.children = maybeChildren;
    }
  }
  return ReactElement(type, key, ref, props);
};

export function isValidElement(object: any) {
  return (
    typeof object === "object" &&
    object !== null &&
    object.$$typeof === REACT_ELEMENT_TYPE
  );
}

// jsxDEV传入的后续几个参数与jsx不同
export const jsx = (type: ElementType, config: any, maybeKey: any) => {
  let key: Key = null;
  const props: any = {};
  let ref: Ref = null;
  if (maybeKey !== undefined) {
    key = "" + maybeKey;
  }

  for (const prop in config) {
    const val = config[prop];
    if (prop === "key") {
      if (hasValidKey(config)) {
        key = "" + val;
      }
      continue;
    }
    if (prop === "ref" && val !== undefined) {
      if (hasValidRef(config)) {
        ref = val;
      }
      continue;
    }
    if ({}.hasOwnProperty.call(config, prop)) {
      props[prop] = val;
    }
  }
  return ReactElement(type, key, ref, props);
};

export const jsxDEV = jsx;
