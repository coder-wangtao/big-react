import { Props, Key, Ref, ReactElementType, Wakeable } from "shared/ReactTypes";
import {
  ContextProvider,
  Fragment,
  FunctionComponent,
  HostComponent,
  WorkTag,
  SuspenseComponent,
  OffscreenComponent,
  LazyComponent,
  MemoComponent,
} from "./workTags";
import { Flags, NoFlags } from "./fiberFlags";
import { Container } from "hostConfig";
import { Lane, Lanes, NoLane, NoLanes } from "./fiberLanes";
import { Effect } from "./fiberHooks";
import { CallbackNode } from "scheduler";
import {
  REACT_MEMO_TYPE,
  REACT_PROVIDER_TYPE,
  REACT_LAZY_TYPE,
  REACT_SUSPENSE_TYPE,
} from "shared/ReactSymbol";
import { ContextItem } from "./fiberContext";

//是当前函数组件以来的context，形成一个单向链表，这些context之间本身没有什么关系
interface FiberDependencies<Value> {
  //单向链表
  firstContext: ContextItem<Value> | null;
  lanes: Lanes; //某个更新，会导致某个context变化，dependencies的lanes就会增加这个更新对应的lane，
  //我们就可以通过查找某个Fiber下dependencies的lane,我们就知道当前fiber中的context存不存在待执行的更新
}

export class FiberNode {
  type: any;
  tag: WorkTag;
  pendingProps: Props;
  key: Key;
  stateNode: any;
  ref: Ref | null;

  return: FiberNode | null;
  sibling: FiberNode | null;
  child: FiberNode | null;
  index: number;

  memoizedProps: Props | null;
  memoizedState: any;
  alternate: FiberNode | null;

  //副作用
  flags: Flags;
  subtreeFlags: Flags;
  updateQueue: unknown;
  deletions: FiberNode[] | null; //父节点所有需要被删除的子节点

  lanes: Lanes;
  childLanes: Lanes;

  dependencies: FiberDependencies<any> | null;

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    // 实例
    this.tag = tag;
    this.key = key || null;
    // HostComponent <div> div DOM
    this.stateNode = null;
    // FunctionComponent () => {}
    this.type = null;

    // 构成树状结构
    this.return = null;
    this.sibling = null;
    this.child = null;
    this.index = 0;

    this.ref = null;

    // 作为工作单元
    this.pendingProps = pendingProps; //开始工作前的props
    this.memoizedProps = null; //工作完成后确定下来的props
    this.memoizedState = null;
    this.updateQueue = null;

    this.alternate = null;
    // 副作用
    this.flags = NoFlags;
    this.subtreeFlags = NoFlags;
    this.deletions = null;

    this.lanes = NoLanes;
    this.childLanes = NoLanes;

    this.dependencies = null;
  }
}

export interface PendingPassiveEffects {
  unmount: Effect[];
  update: Effect[];
}

export class FiberRootNode {
  container: Container;
  current: FiberNode;
  finishedWork: FiberNode | null;
  pendingLanes: Lanes; // 所有未被消费的lane的集合
  suspendedLanes: Lanes; //
  pingedLanes: Lanes;
  finishedLane: Lane; //代表本本次更新消费的lane
  pendingPassiveEffects: PendingPassiveEffects; //收集effect回调的容器

  callbackNode: CallbackNode | null;
  callbackPriority: Lane;

  pingCache: WeakMap<Wakeable<any>, Set<Lane>> | null;

  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container;
    this.current = hostRootFiber;
    hostRootFiber.stateNode = this;
    this.finishedWork = null;
    this.pendingLanes = NoLanes;
    this.suspendedLanes = NoLanes;
    this.pingedLanes = NoLanes;
    this.finishedLane = NoLane;

    this.callbackNode = null;
    this.callbackPriority = NoLane;

    this.pendingPassiveEffects = {
      unmount: [],
      update: [],
    };

    this.pingCache = null;
  }
}

export const createWorkInProgress = (
  current: FiberNode,
  pendingProps: Props,
): FiberNode => {
  let wip = current.alternate;
  if (wip === null) {
    // mount
    wip = new FiberNode(current.tag, pendingProps, current.key);
    wip.stateNode = current.stateNode;

    wip.alternate = current;
    current.alternate = wip;
  } else {
    // update
    wip.pendingProps = pendingProps;
    wip.flags = NoFlags;
    wip.subtreeFlags = NoFlags;
    wip.deletions = null;
  }
  wip.type = current.type;
  wip.updateQueue = current.updateQueue;
  wip.child = current.child;
  wip.memoizedProps = current.memoizedProps;
  wip.memoizedState = current.memoizedState;
  wip.ref = current.ref;

  wip.lanes = current.lanes;
  wip.childLanes = current.childLanes;

  const currentDeps = current.dependencies;
  wip.dependencies =
    currentDeps === null
      ? null
      : {
          lanes: currentDeps.lanes,
          firstContext: currentDeps.firstContext,
        };

  return wip;
};

export function createFiberFromElement(element: ReactElementType): FiberNode {
  const { type, key, props, ref } = element;
  let fiberTag: WorkTag = FunctionComponent;

  if (typeof type === "string") {
    // <div/> type: 'div'
    fiberTag = HostComponent;
  } else if (typeof type === "object") {
    switch (type.$$typeof) {
      case REACT_PROVIDER_TYPE:
        fiberTag = ContextProvider;
        break;
      case REACT_MEMO_TYPE:
        fiberTag = MemoComponent;
        break;
      case REACT_LAZY_TYPE:
        fiberTag = LazyComponent;
        break;
      default:
        console.warn("未定义的type类型", element);
        break;
    }
  } else if (type === REACT_SUSPENSE_TYPE) {
    fiberTag = SuspenseComponent;
  } else if (typeof type !== "function" && __DEV__) {
    console.warn("为定义的type类型", element);
  }
  const fiber = new FiberNode(fiberTag, props, key);
  fiber.type = type;
  fiber.ref = ref;
  return fiber;
}

export function createFiberFromFragment(elements: any[], key: Key): FiberNode {
  const fiber = new FiberNode(Fragment, elements, key);
  return fiber;
}

export interface OffscreenProps {
  mode: "visible" | "hidden";
  children: any;
}

export function createFiberFromOffscreen(pendingProps: OffscreenProps) {
  const fiber = new FiberNode(OffscreenComponent, pendingProps, null);
  // TODO stateNode
  return fiber;
}
