import { FiberNode } from "react-reconciler/src/fiber";
import { HostComponent, HostText } from "react-reconciler/src/workTags";
import { Props } from "shared/ReactTypes";

export type Container = Element;
export type Instance = Element;
export type TextInstance = Text;

// export const createInstance = (type: string, props: any): Instance => {
export const createInstance = (type: string, props: Props): Instance => {
  // TODO 处理props
  const element = document.createElement(type);
  return element;
};

export const appendInitialChild = (
  parent: Instance | Container,
  child: Instance,
) => {
  parent.appendChild(child);
};

export const createTextInstance = (content: string) => {
  return document.createTextNode(content);
};

export const appendChildToContainer = appendInitialChild;
