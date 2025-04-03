import { beginWork } from "./beginWork";
import { commitMutationEffects } from "./commitWork";
import { completeWork } from "./completeWork";
import { createWorkInProgress, FiberNode, FiberRootNode } from "./fiber";
import { MutationMask, NoFlags } from "./fiberFlags";
import {
  getHighestPriorityLane,
  Lane,
  markRootFinished,
  mergeLanes,
  NoLane,
  SyncLane,
} from "./fiberLanes";
import {
  flushSyncCallbacks,
  scheduleMicroTask,
  scheduleSyncCallback,
} from "./syncTaskQueue";
import { HostRoot } from "./workTags";

let workInProgress: FiberNode | null = null;
let wipRootRenderLane: Lane = NoLane;

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
  if (__DEV__) {
    // console.log("开始schedule阶段", fiber);
  }
  // fiberRootNode
  const root = markUpdateLaneFromFiberToRoot(fiber, lane);
  markRootUpdated(root, lane);
  ensureRootIsScheduled(root);
}

export function markUpdateLaneFromFiberToRoot(fiber: FiberNode, lane: Lane) {
  let node = fiber;
  let parent = node.return;
  while (parent !== null) {
    node = parent;
    parent = node.return;
  }
  if (node.tag === HostRoot) {
    return node.stateNode;
  }
  return null;
}

//会被执行三次
export function ensureRootIsScheduled(root: FiberRootNode) {
  const updateLane = getHighestPriorityLane(root.pendingLanes);

  if (updateLane === NoLane) {
    return;
  }

  if (updateLane === SyncLane) {
    // scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));
    // scheduleMicroTask(flushSyncCallbacks);
    if (__DEV__) {
      // console.log("在微任务中调度，优先级：", updateLane);
    }
    // 同步优先级 用微任务调度
    // [performSyncWorkOnRoot, performSyncWorkOnRoot, performSyncWorkOnRoot]
    //实际上就是在数组中添回调函数
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));
    //
    scheduleMicroTask(flushSyncCallbacks);
  } else {
    // 其他优先级 用宏任务调度
    // const schedulerPriority = lanesToSchedulerPriority(updateLane);
    // newCallbackNode = scheduleCallback(
    //   schedulerPriority,
    //   // @ts-ignore
    //   performConcurrentWorkOnRoot.bind(null, root),
    // );
  }
  // root.callbackNode = newCallbackNode;
  // root.callbackPriority = curPriority;
}

function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
  const nextLane = getHighestPriorityLane(root.pendingLanes);

  if (nextLane !== SyncLane) {
    // 其他比SyncLane低的优先级
    // NoLane
    ensureRootIsScheduled(root);
    return;
  }

  if (__DEV__) {
    console.warn("render阶段开始");
  }

  // 初始化操作
  prepareFreshStack(root, lane);
  // render阶段具体操作
  do {
    try {
      workLoop();
      break;
    } catch (e) {
      console.error("workLoop发生错误", e);
      workInProgress = null;
    }
  } while (true);

  if (workInProgress !== null) {
    // console.error("render阶段结束时wip不为null");
  }

  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  root.finishLane = lane;
  wipRootRenderLane = NoLane;
  // commit阶段操作
  commitRoot(root);
}

function commitRoot(root: FiberRootNode) {
  const finishedWork = root.finishedWork;
  // debugger;
  if (finishedWork === null) {
    return;
  }
  if (__DEV__) {
    console.log("开始commit阶段", finishedWork);
  }

  const lane = root.finishLane;
  if (lane === NoLane && __DEV__) {
    console.error("-----");
  }
  // 重置
  root.finishedWork = null;
  root.finishLane = NoLane;
  markRootFinished(root, lane);
  const subtreeHasEffect =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

  if (subtreeHasEffect || rootHasEffect) {
    // 有副作用要执行

    // 阶段1/3:beforeMutation

    // 阶段2/3:Mutation
    commitMutationEffects(finishedWork);

    // Fiber Tree切换
    root.current = finishedWork;

    // 阶段3:Layout
  } else {
    // Fiber Tree切换
    root.current = finishedWork;
  }
}

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
  if (__DEV__) {
    // console.log("render阶段初始化工作", root);
  }
  workInProgress = createWorkInProgress(root.current, {});
  wipRootRenderLane = lane;
}

function workLoop() {
  // debugger;
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(fiber: FiberNode) {
  const next = beginWork(fiber, wipRootRenderLane);
  // 执行完beginWork后，pendingProps 变为 memoizedProps
  fiber.memoizedProps = fiber.pendingProps;
  if (next === null) {
    completeUnitOfWork(fiber);
  } else {
    workInProgress = next;
  }
}

function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber;

  do {
    const next = completeWork(node);

    if (next !== null) {
      workInProgress = next;
      return;
    }

    const sibling = node.sibling;
    if (sibling) {
      workInProgress = sibling;
      return;
    }
    node = node.return;
    workInProgress = node;
  } while (node !== null);
}

export function markRootUpdated(root: FiberRootNode, lane: Lane) {
  root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}
