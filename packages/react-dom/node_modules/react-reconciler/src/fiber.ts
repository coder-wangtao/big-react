import { Props, Key, Ref, ReactElementType } from "shared/ReactTypes";
import { FunctionComponent, HostComponent, WorkTag } from "./workTags";
import { Flags, NoFlags } from "./fiberFlags";
import { Container } from "hostConfig";
export class FiberNode {
  type: any; //节点的类型，可以是原生 DOM 元素、函数组件或类组件等；
  tag: WorkTag; //
  key: Key;
  stateNode: any; //节点对应的实际 DOM 节点或组件实例；
  ref: Ref;

  // 构成树状结构
  return: FiberNode | null; //指向节点的父节点；
  sibling: FiberNode | null; //指向节点的下一个兄弟节点；
  child: FiberNode | null; //指向节点的第一个子节点；
  index: number | Props; // 索引

  // 作为工作单元
  memoizedProps: Props | null; // 已经更新完的属性
  memoizedState: any; // 更新完成后新的 State
  alternate: FiberNode | null; //指向节点的备份节点，用于在协调过程中进行比较；
  pendingProps: Props; //表示节点的新属性，用于在协调过程中进行更新。
  flags: Flags; // 表示节点的副作用类型，如更新、插入、删除等
  subtreeFlags: Flags; // 表示子节点的副作用类型，如更新、插入、删除等

  updateQueue: any; //更新计划队列

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    this.tag = tag;
    this.key = key;
    //HostComponent <div> div DOM
    this.stateNode = null;
    this.type = null;

    //执行父FiberNode
    this.return = null;
    this.sibling = null;
    this.child = null;
    this.index = 0;

    this.ref = null;
    this.pendingProps = pendingProps;
    this.memoizedProps = null;
    this.memoizedState = null;

    this.updateQueue = null;
    this.alternate = null;

    //副作用
    this.flags = NoFlags;
    this.subtreeFlags = NoFlags;
  }
}

export class FiberRootNode {
  container: Container;
  current: FiberNode;
  finishedWork: FiberNode | null;
  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container;
    this.current = hostRootFiber;
    hostRootFiber.stateNode = this;
    this.finishedWork = null;
  }
}
//生成与 hostRootFiber 对应的 workInProgress hostRootFiber；
export const createWorkInProgress = (
  current: FiberNode,
  pendingProps: Props,
): FiberNode => {
  let wip = current.alternate; //指向节点的备份节点，用于在协调过程中进行比较；第一次为null
  if (wip === null) {
    //mount
    wip = new FiberNode(current.tag, pendingProps, current.key);
    wip.stateNode = current.stateNode;
    wip.alternate = current; //备份节点
    current.alternate = wip;
  } else {
    //update
    wip.pendingProps = pendingProps;
    wip.flags = NoFlags;
    wip.subtreeFlags = NoFlags;
  }
  wip.type = current.type;
  wip.updateQueue = current.updateQueue;
  wip.child = current.child;
  wip.memoizedProps = current.memoizedProps;
  wip.memoizedState = current.memoizedState;
  return wip;
};

export function createFiberFromElement(element: ReactElementType): FiberNode {
  const { type, key, props } = element;
  let fiberTag: WorkTag = FunctionComponent;
  if (typeof type === "string") {
    fiberTag = HostComponent;
  } else if (typeof type !== "function" && __DEV__) {
    console.warn("未定义的type类型", element);
  }
  const fiber = new FiberNode(fiberTag, props, key);
  fiber.type = type;
  return fiber;
}

//当所有 React Element 都比较完成之后，会生成一棵新的 Fiber 树，此时，一共存在两棵 Fiber 树：

// current: 与视图中真实 UI 对应的 Fiber 树，当 React 开始新的一轮渲染时，会使用
// current 作为参考来比较新的树与旧树的差异，决定如何更新 UI；

// workInProgress: 触发更新后，正在 Reconciler 中计算的 Fiber 树，一旦 workInProgress 上的更新完成，
// 它将会被提交为新的current，成为下一次渲染的参考树，并清空旧的 current 树。
