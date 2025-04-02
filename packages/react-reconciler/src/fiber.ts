import { Key, Props, ReactElementType, Ref } from "shared/ReactTypes";
import { Flags, NoFlags } from "./fiberFlags";
import { Container } from "hostConfig";
import {
  Fragment,
  FunctionComponent,
  HostComponent,
  WorkTag,
} from "./workTags";
import { Lane, Lanes, NoLane, NoLanes } from "./fiberLanes";

export class FiberNode {
  pendingProps: Props;
  memoizedProps: Props | null;
  key: Key;
  stateNode: any;
  type: any;
  ref: Ref;
  tag: WorkTag;
  flags: Flags;
  subtreeFlags: Flags;
  deletions: FiberNode[] | null;

  return: FiberNode | null;
  sibling: FiberNode | null;
  child: FiberNode | null;
  index: number;

  updateQueue: unknown;
  memoizedState: any;

  alternate: FiberNode | null;

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    // 实例
    this.tag = tag;
    this.key = key || null;
    this.stateNode = null;
    this.type = null;

    // 树结构
    this.return = null;
    this.sibling = null;
    this.child = null;
    this.index = 0;

    this.ref = null;

    // 状态
    this.memoizedState = null; //memoizedState对于 函数组件（App）根节点，就是hook链表
    this.pendingProps = pendingProps; //pendingProps对于文本节点里面是{content:"1111"}  对于div等节点就是jsx props {children:,...} / diff过程中老的jsx
    this.memoizedProps = null; //pendingProps对于文本节点里面是{content:"1111"}  对于div等节点就是jsx props {children:,...}  beginWork执行后赋值 / diff过程中新的jsx
    this.updateQueue = null;

    // 副作用
    this.flags = NoFlags;
    this.subtreeFlags = NoFlags;
    this.deletions = null;

    // 调度
    // this.lanes = NoLanes;
    // this.childLanes = NoLanes;

    this.alternate = null;
  }
}

export class FiberRootNode {
  container: Container;
  current: FiberNode;
  finishedWork: FiberNode | null;
  pendingLanes: Lanes;
  finishLane: Lane;
  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container;
    this.current = hostRootFiber;
    hostRootFiber.stateNode = this;
    this.finishedWork = null;
    this.pendingLanes = NoLanes;
    this.finishLane = NoLane;
  }
}

export function createFiberFromElement(element: ReactElementType): FiberNode {
  const { type, key, props } = element;

  let fiberTag: WorkTag = FunctionComponent;

  if (typeof type === "string") {
    fiberTag = HostComponent;
  } else if (typeof type !== "function") {
    console.error("未定义的type类型", element);
  }
  const fiber = new FiberNode(fiberTag, props, key);
  fiber.type = type;

  return fiber;
}

export function createFiberFromFragment(elements: any[], key: Key): FiberNode {
  const fiber = new FiberNode(Fragment, elements, key);
  return fiber;
}

export const createWorkInProgress = (
  current: FiberNode,
  pendingProps: Props,
): FiberNode => {
  let wip = current.alternate;
  if (wip === null) {
    // mount
    wip = new FiberNode(current.tag, pendingProps, current.key);
    wip.type = current.type;
    wip.stateNode = current.stateNode;

    wip.alternate = current;
    current.alternate = wip;
  } else {
    // update
    wip.pendingProps = pendingProps;
    wip.flags = NoFlags;
    wip.subtreeFlags = NoFlags;
    wip.deletions = null;
    wip.type = current.type;
  }
  wip.updateQueue = current.updateQueue;
  wip.flags = current.flags;
  wip.child = current.child;

  // 数据
  wip.memoizedProps = current.memoizedProps;
  wip.memoizedState = current.memoizedState;

  return wip;
};
