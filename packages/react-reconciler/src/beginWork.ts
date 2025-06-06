import { ReactElementType } from "shared/ReactTypes";
import { mountChildFibers, reconcileChildFibers } from "./childFibers";
import {
  FiberNode,
  createFiberFromFragment,
  createWorkInProgress,
  createFiberFromOffscreen,
  OffscreenProps,
} from "./fiber";
import { bailoutHook, renderWithHooks } from "./fiberHooks";
import { Lane, NoLanes, includeSomeLanes } from "./fiberLanes";
import { processUpdateQueue, UpdateQueue } from "./updateQueue";
import {
  ContextProvider,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
  MemoComponent,
  OffscreenComponent,
  SuspenseComponent,
  LazyComponent,
} from "./workTags";
import {
  Ref,
  NoFlags,
  DidCapture,
  Placement,
  ChildDeletion,
} from "./fiberFlags";
import {
  prepareToReadContext,
  propagateContextChange,
  pushProvider,
} from "./fiberContext";
import { pushSuspenseHandler } from "./suspenseContext";
import { cloneChildFibers } from "./childFibers";
import { shallowEqual } from "shared/shallowEquals";

// 是否能命中bailout
let didReceiveUpdate = false;

export function markWipReceivedUpdate() {
  didReceiveUpdate = true;
}

//
export const beginWork = (wip: FiberNode, renderLane: Lane) => {
  // bailout策略
  //命中性能优化的组件可以不用 reconcile 生成 wip.child,而是直接复用上次更新生成的 wip.child

  didReceiveUpdate = false;
  const current = wip.alternate;
  //TODO:
  // debugger;
  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = wip.pendingProps;
    // 四要素～ props type
    // {num: 0, name: 'cpn2'}
    // {num: 0, name: 'cpn2'}
    if (oldProps !== newProps || current.type !== wip.type) {
      didReceiveUpdate = true;
    } else {
      // state context
      const hasScheduledStateOrContext = checkScheduledUpdateOrContext(
        current,
        renderLane,
      );

      if (!hasScheduledStateOrContext) {
        // 四要素～ state context
        // 命中bailout
        didReceiveUpdate = false;

        switch (wip.tag) {
          case ContextProvider:
            const newValue = wip.memoizedProps.value;
            const context = wip.type._context;
            pushProvider(context, newValue);
            break;
          // TODO Suspense
        }

        return bailoutOnAlreadyFinishedWork(wip, renderLane);
      }
    }
  }

  // 在beginWork中根据update计算state
  // 代表update已经消费完了
  wip.lanes = NoLanes;
  // 比较，返回子fiberNode
  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip, renderLane); //首次渲染
    case HostComponent:
      return updateHostComponent(wip);
    case HostText:
      return null;
    case FunctionComponent:
      return updateFunctionComponent(wip, wip.type, renderLane); //setState
    case Fragment:
      return updateFragment(wip);
    case ContextProvider:
      return updateContextProvider(wip, renderLane);
    case SuspenseComponent:
      return updateSuspenseComponent(wip);
    case OffscreenComponent:
      return updateOffscreenComponent(wip);
    case LazyComponent:
      return mountLazyComponent(wip, renderLane);
    case MemoComponent:
      return updateMemoComponent(wip, renderLane);
    default:
      if (__DEV__) {
        console.warn("beginWork未实现的类型");
      }
      break;
  }
  return null;
};

function mountLazyComponent(wip: FiberNode, renderLane: Lane) {
  const LazyType = wip.type;
  const payload = LazyType._payload;
  const init = LazyType._init;
  const Component = init(payload);
  wip.type = Component;
  wip.tag = FunctionComponent;
  const child = updateFunctionComponent(wip, Component, renderLane);
  return child;
}

function updateMemoComponent(wip: FiberNode, renderLane: Lane) {
  // bailout四要素
  // props浅比较
  const current = wip.alternate;
  const nextProps = wip.pendingProps;
  const Component = wip.type.type;

  if (current !== null) {
    const prevProps = current.memoizedProps;

    // state context
    if (!checkScheduledUpdateOrContext(current, renderLane)) {
      // debugger;

      // 浅比较props
      if (shallowEqual(prevProps, nextProps) && current.ref === wip.ref) {
        didReceiveUpdate = false;
        wip.pendingProps = prevProps;
        // 满足四要素
        wip.lanes = current.lanes;
        return bailoutOnAlreadyFinishedWork(wip, renderLane);
      }
    }
  }
  return updateFunctionComponent(wip, Component, renderLane);
}

function bailoutOnAlreadyFinishedWork(wip: FiberNode, renderLane: Lane) {
  if (!includeSomeLanes(wip.childLanes, renderLane)) {
    if (__DEV__) {
      console.warn("bailout整棵子树", wip);
    }
    return null;
  }

  if (__DEV__) {
    console.warn("bailout一个fiber", wip);
  }
  cloneChildFibers(wip);
  return wip.child;
}

function checkScheduledUpdateOrContext(
  current: FiberNode,
  renderLane: Lane,
): boolean {
  //在执行bailout之前我们必须检查是否有待处理的更新或context
  const updateLanes = current.lanes;

  //每一个update就对应一个优先级，也时间就是对应一个lane,
  //fiber.lanes就保存一个fiberNode所有未执行更新对应的lane
  //判断fiber.lanes是不是等于Nolane，就可以知道当前fiber是否存在未执行的更新，也就是未执行的update
  //fiber.childlanes，保存一个FiberNode子树中，所有未执行更新对应的lane

  if (includeSomeLanes(updateLanes, renderLane)) {
    //存在更新
    return true;
  }
  //不存在更新
  return false;
}

function updateContextProvider(wip: FiberNode, renderLane: Lane) {
  const providerType = wip.type;
  const context = providerType._context;
  const newProps = wip.pendingProps;
  const oldProps = wip.memoizedProps;
  const newValue = newProps.value;
  // debugger;
  pushProvider(context, newValue);
  // debugger;
  if (oldProps !== null) {
    const oldValue = oldProps.value;

    if (
      Object.is(oldValue, newValue) &&
      oldProps.children === newProps.children
    ) {
      // debugger;
      return bailoutOnAlreadyFinishedWork(wip, renderLane);
    } else {
      propagateContextChange(wip, context, renderLane);
    }
  }

  const nextChildren = newProps.children;
  reconcileChildren(wip, nextChildren);
  return wip.child;
}

function updateFragment(wip: FiberNode) {
  const nextChildren = wip.pendingProps;
  reconcileChildren(wip, nextChildren);
  return wip.child;
}

function updateFunctionComponent(
  wip: FiberNode,
  Component: FiberNode["type"],
  renderLane: Lane,
) {
  prepareToReadContext(wip, renderLane);
  // render
  const nextChildren = renderWithHooks(wip, Component, renderLane);
  const current = wip.alternate;
  if (current !== null && !didReceiveUpdate) {
    // debugger;

    bailoutHook(wip, renderLane);
    return bailoutOnAlreadyFinishedWork(wip, renderLane);
  }
  reconcileChildren(wip, nextChildren);
  return wip.child;
}

function updateHostRoot(wip: FiberNode, renderLane: Lane) {
  const baseState = wip.memoizedState;
  const updateQueue = wip.updateQueue as UpdateQueue<Element>;
  const pending = updateQueue.shared.pending;
  updateQueue.shared.pending = null;

  const prevChildren = wip.memoizedState;

  const { memoizedState } = processUpdateQueue(baseState, pending, renderLane);
  wip.memoizedState = memoizedState; //其实就是reactElement

  const current = wip.alternate;
  // 考虑RootDidNotComplete的情况，需要复用memoizedState
  if (current !== null) {
    if (!current.memoizedState) {
      current.memoizedState = memoizedState;
    }
  }

  const nextChildren = wip.memoizedState; //子对应的reactElement
  if (prevChildren === nextChildren) {
    // debugger;
    return bailoutOnAlreadyFinishedWork(wip, renderLane);
  }
  reconcileChildren(wip, nextChildren);
  return wip.child;
}

function updateHostComponent(wip: FiberNode) {
  const nextProps = wip.pendingProps;
  const nextChildren = nextProps.children;
  markRef(wip.alternate, wip);
  reconcileChildren(wip, nextChildren);
  return wip.child;
}

function reconcileChildren(wip: FiberNode, children?: ReactElementType) {
  const current = wip.alternate;

  //在第一次挂载刚开始的时候
  //即使是首屏渲染，hostRootFiber <- -> hostRootFiber wip

  //对于首屏渲染组件树上所有所有元素都会走mount逻辑，
  //对于hostRootFiber都会走update逻辑，这时会插入一个Placement Flag，通过这一个Placement Flag，会执行一次dom插入操作
  if (current !== null) {
    // update
    wip.child = reconcileChildFibers(wip, current?.child, children);
  } else {
    // mount
    wip.child = mountChildFibers(wip, null, children);
  }
}

function markRef(current: FiberNode | null, workInProgress: FiberNode) {
  const ref = workInProgress.ref;
  if (
    (current === null && ref !== null) ||
    (current !== null && current.ref !== ref)
  ) {
    workInProgress.flags |= Ref;
  }
}

function updateOffscreenComponent(workInProgress: FiberNode) {
  const nextProps = workInProgress.pendingProps;
  const nextChildren = nextProps.children;
  reconcileChildren(workInProgress, nextChildren);
  return workInProgress.child;
}

function updateSuspenseComponent(workInProgress: FiberNode) {
  const current = workInProgress.alternate;
  const nextProps = workInProgress.pendingProps;

  let showFallback = false; //是否展示Fallback
  const didSuspend = (workInProgress.flags & DidCapture) !== NoFlags;

  if (didSuspend) {
    showFallback = true;
    workInProgress.flags &= ~DidCapture;
  }
  const nextPrimaryChildren = nextProps.children; //正常dom
  const nextFallbackChildren = nextProps.fallback; //挂起dom
  pushSuspenseHandler(workInProgress);
  // debugger;
  if (current === null) {
    //mount
    if (showFallback) {
      //挂起
      return mountSuspenseFallbackChildren(
        workInProgress,
        nextPrimaryChildren,
        nextFallbackChildren,
      );
    } else {
      //正常
      //TODO:完成
      return mountSuspensePrimaryChildren(workInProgress, nextPrimaryChildren);
    }
  } else {
    //update
    if (showFallback) {
      //挂起
      return updateSuspenseFallbackChildren(
        workInProgress,
        nextPrimaryChildren,
        nextFallbackChildren,
      );
    } else {
      //正常
      return updateSuspensePrimaryChildren(workInProgress, nextPrimaryChildren);
    }
  }
}

function mountSuspensePrimaryChildren(
  workInProgress: FiberNode,
  primaryChildren: any,
) {
  const primaryChildProps: OffscreenProps = {
    mode: "visible",
    children: primaryChildren,
  };
  const primaryChildFragment = createFiberFromOffscreen(primaryChildProps);
  workInProgress.child = primaryChildFragment;
  primaryChildFragment.return = workInProgress;
  return primaryChildFragment;
}

function mountSuspenseFallbackChildren(
  workInProgress: FiberNode,
  primaryChildren: any,
  fallbackChildren: any,
) {
  const primaryChildProps: OffscreenProps = {
    mode: "hidden",
    children: primaryChildren,
  };
  const primaryChildFragment = createFiberFromOffscreen(primaryChildProps);
  const fallbackChildFragment = createFiberFromFragment(fallbackChildren, null);
  // 父组件Suspense已经mount，所以需要fallback标记Placement
  fallbackChildFragment.flags |= Placement;

  primaryChildFragment.return = workInProgress;
  fallbackChildFragment.return = workInProgress;
  primaryChildFragment.sibling = fallbackChildFragment;
  workInProgress.child = primaryChildFragment;

  return fallbackChildFragment;
}

function updateSuspensePrimaryChildren(
  workInProgress: FiberNode,
  primaryChildren: any,
) {
  const current = workInProgress.alternate as FiberNode;
  const currentPrimaryChildFragment = current.child as FiberNode;
  const currentFallbackChildFragment: FiberNode | null =
    currentPrimaryChildFragment.sibling;

  const primaryChildProps: OffscreenProps = {
    mode: "visible",
    children: primaryChildren,
  };

  const primaryChildFragment = createWorkInProgress(
    currentPrimaryChildFragment,
    primaryChildProps,
  );
  primaryChildFragment.return = workInProgress;
  primaryChildFragment.sibling = null;
  workInProgress.child = primaryChildFragment;

  if (currentFallbackChildFragment !== null) {
    const deletions = workInProgress.deletions;
    if (deletions === null) {
      workInProgress.deletions = [currentFallbackChildFragment];
      workInProgress.flags |= ChildDeletion;
    } else {
      deletions.push(currentFallbackChildFragment);
    }
  }

  return primaryChildFragment;
}

function updateSuspenseFallbackChildren(
  workInProgress: FiberNode,
  primaryChildren: any,
  fallbackChildren: any,
) {
  //之前的的fiber
  const current = workInProgress.alternate as FiberNode;
  const currentPrimaryChildFragment = current.child as FiberNode;
  const currentFallbackChildFragment: FiberNode | null =
    currentPrimaryChildFragment.sibling;

  const primaryChildProps: OffscreenProps = {
    mode: "hidden",
    children: primaryChildren,
  };

  const primaryChildFragment = createWorkInProgress(
    currentPrimaryChildFragment,
    primaryChildProps,
  );

  let fallbackChildFragment;

  if (currentFallbackChildFragment !== null) {
    // 可以复用
    fallbackChildFragment = createWorkInProgress(
      currentFallbackChildFragment,
      fallbackChildren,
    );
  } else {
    fallbackChildFragment = createFiberFromFragment(fallbackChildren, null);
    fallbackChildFragment.flags |= Placement;
  }

  fallbackChildFragment.return = workInProgress;
  primaryChildFragment.return = workInProgress;
  primaryChildFragment.sibling = fallbackChildFragment;
  workInProgress.child = primaryChildFragment;

  return fallbackChildFragment;
}
