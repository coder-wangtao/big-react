import { ReactElementType } from "shared/ReactTypes";
import { mountChildFibers, reconcileChildFibers } from "./childFibers";
import { FiberNode } from "./fiber";
import { renderWithHooks } from "./fiberHooks";
import { processUpdateQueue, UpdateQueue } from "./updateQueue";
import {
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./workTags";
import { Lane } from "./fiberLanes";
import { Update } from "./fiberFlags";

export const beginWork = (workInProgress: FiberNode, renderLane: Lane) => {
  if (__DEV__) {
    // console.log("beginWork流程", workInProgress.type);
  }
  switch (workInProgress.tag) {
    case HostRoot:
      return updateHostRoot(workInProgress, renderLane);
    case HostComponent:
      return updateHostComponent(workInProgress);
    case HostText:
      return null;
    case FunctionComponent:
      return updateFunctionComponent(workInProgress, renderLane);
    case Fragment:
      return updateFragment(workInProgress);
    default:
      console.error("beginWork未处理的情况");
      return null;
  }
};

function updateFragment(wip: FiberNode) {
  const nextChildren = wip.pendingProps;
  reconcileChildren(wip, nextChildren as any);
  return wip.child;
}

function updateFunctionComponent(workInProgress: FiberNode, renderLane: Lane) {
  const nextChildren = renderWithHooks(workInProgress, renderLane);
  reconcileChildren(workInProgress, nextChildren);
  return workInProgress.child;
}

function updateHostComponent(workInProgress: FiberNode) {
  // 根据element创建fiberNode
  const nextProps = workInProgress.pendingProps;
  const nextChildren = nextProps.children;
  reconcileChildren(workInProgress, nextChildren);
  return workInProgress.child;
}

function updateHostRoot(workInProgress: FiberNode, renderLane: Lane) {
  const baseState = workInProgress.memoizedState;
  const updateQueue = workInProgress.updateQueue as UpdateQueue<Element>;
  const pending = updateQueue.shared.pending;
  updateQueue.shared.pending = null;
  const { memoizedState } = processUpdateQueue(baseState, pending, renderLane);
  workInProgress.memoizedState = memoizedState;

  const nextChildren = workInProgress.memoizedState;
  reconcileChildren(workInProgress, nextChildren);
  return workInProgress.child;
}

function reconcileChildren(
  workInProgress: FiberNode,
  children?: ReactElementType,
) {
  const current = workInProgress.alternate;

  if (current !== null) {
    // update
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      children,
    );
  } else {
    // mount
    workInProgress.child = mountChildFibers(workInProgress, null, children);
  }
}
