import { PackagedElement, updateFiberProps } from "./SyntheticEvent";

export type Container = PackagedElement | Document;
export type Instance = PackagedElement;
export type TextInstance = Text;

export const createInstance = (type: string, props: any): Instance => {
  const element = document.createElement(type);
  return updateFiberProps(element, props);
};

export const createTextInstance = (content: string) => {
  return document.createTextNode(content);
};

export const appendInitialChild = (parent: Instance, child: Instance) => {
  parent.appendChild(child);
};

export const appendChildToContainer = (
  child: Instance,
  container: Container,
) => {
  // appendChild 会把指定的节点移动到父元素的最后，即使该节点已经存在于 DOM 中，
  // appendChild 也会把它从原位置移除，并重新添加到最后的位置。
  // debugger;
  container.appendChild(child);
};

export const insertChildToContainer = (
  child: Instance,
  container: Container,
  before: Instance,
) => {
  container.insertBefore(before, child);
};

export const removeChild = (child: Instance, container: Container) => {
  container.removeChild(child);
};

export const commitTextUpdate = (
  textIntance: TextInstance,
  content: string,
) => {
  textIntance.nodeValue = content;
};
