import { beginWork } from "./beginWork";
import {
  commitHookEffectListCreate,
  commitHookEffectListDestroy,
  commitHookEffectListUnmount,
  commitMutationEffects,
} from "./commitWork";
import { completeWork } from "./completeWork";
import {
  createWorkInProgress,
  FiberNode,
  FiberRootNode,
  PendingPassiveEffects,
} from "./fiber";
import { MutationMask, NoFlags, PassiveMask } from "./fiberFlags";
import {
  getHighestPriorityLane,
  Lane,
  lanesToSchedulerPriority,
  markRootFinished,
  mergeLanes,
  NoLane,
  SyncLane,
} from "./fiberLanes";
import { HookHasEffect, Passive } from "./hookEffectTags";
import {
  flushSyncCallbacks,
  scheduleMicroTask,
  scheduleSyncCallback,
} from "./syncTaskQueue";
import { HostRoot } from "./workTags";
import {
  unstable_scheduleCallback as scheduleCallback,
  unstable_NormalPriority as NormalPriority,
  unstable_shouldYield,
  unstable_cancelCallback,
} from "scheduler";

let workInProgress: FiberNode | null = null;
let wipRootRenderLane: Lane = NoLane;
let rootDoesHasPassiveEffects = false;

type RootExitStatus = number;
// 工作中的状态
const RootInProgress = 0;
// 并发中间状态
const RootInComplete = 1;
// 完成状态
const RootCompleted = 2;
// 未完成状态，不用进入commit阶段
const RootDidNotComplete = 3;
// let workInProgressRootExitStatus: number = RootInProgress;

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

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
  let didFlushPassiveEffect = false;
  pendingPassiveEffects.unmount.forEach((effect) => {
    didFlushPassiveEffect = true;
    commitHookEffectListUnmount(Passive, effect);
  });
  pendingPassiveEffects.unmount = [];

  pendingPassiveEffects.update.forEach((effect) => {
    didFlushPassiveEffect = true;
    commitHookEffectListDestroy(Passive | HookHasEffect, effect);
  });
  pendingPassiveEffects.update.forEach((effect) => {
    didFlushPassiveEffect = true;
    commitHookEffectListCreate(Passive | HookHasEffect, effect);
  });
  pendingPassiveEffects.update = [];
  flushSyncCallbacks();
  return didFlushPassiveEffect;
}

function renderRoot(root: FiberRootNode, lane: Lane, shouldTimeSlice: boolean) {
  if (__DEV__) {
    console.log(`开始${shouldTimeSlice ? "并发" : "同步"}更新`, root);
  }

  if (wipRootRenderLane !== lane) {
    // 初始化
    prepareFreshStack(root, lane);
  }

  do {
    try {
      shouldTimeSlice ? workLoopConcurrent() : workLoopSync();
      break;
    } catch (e) {
      if (__DEV__) {
        console.warn("workLoop发生错误", e);
      }
      workInProgress = null;
    }
  } while (true);

  // 中断执行
  if (shouldTimeSlice && workInProgress !== null) {
    return RootInComplete;
  }
  // render阶段执行完
  if (!shouldTimeSlice && workInProgress !== null && __DEV__) {
    console.error(`render阶段结束时wip不应该不是null`);
  }
  return RootCompleted;
}

//会被执行三次
export function ensureRootIsScheduled(root: FiberRootNode) {
  const updateLane = getHighestPriorityLane(root.pendingLanes);
  const existingCallback = root.callbackNode;

  if (updateLane === NoLane) {
    if (existingCallback !== null) {
      unstable_cancelCallback(existingCallback);
    }
    root.callbackNode = null;
    root.callbackPriority = NoLane;
    return;
  }

  const curPriority = updateLane;
  const prevPriority = root.callbackPriority;

  if (curPriority === prevPriority) {
    return;
  }

  if (existingCallback !== null) {
    unstable_cancelCallback(existingCallback);
  }
  let newCallbackNode = null;

  if (updateLane === SyncLane) {
    if (__DEV__) {
      console.log("在微任务中调度，优先级：", updateLane);
    }
    // 同步优先级 用微任务调度
    // [performSyncWorkOnRoot, performSyncWorkOnRoot, performSyncWorkOnRoot]
    //实际上就是在数组中添回调函数
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
    //
    scheduleMicroTask(flushSyncCallbacks);
  } else {
    // 其他优先级 用宏任务调度
    const schedulerPriority = lanesToSchedulerPriority(updateLane);

    newCallbackNode = scheduleCallback(
      schedulerPriority,
      // @ts-ignore
      performConcurrentWorkOnRoot.bind(null, root),
    );
  }
  root.callbackNode = newCallbackNode;
  root.callbackPriority = curPriority;
}

function performConcurrentWorkOnRoot(
  root: FiberRootNode,
  didTimeout: boolean,
): any {
  // 保证useEffect回调执行
  const curCallback = root.callbackNode;
  const didFlushPassiveEffect = flushPassiveEffects(root.pendingPassiveEffects);
  if (didFlushPassiveEffect) {
    if (root.callbackNode !== curCallback) {
      return null;
    }
  }

  const lane = getHighestPriorityLane(root.pendingLanes);
  const curCallbackNode = root.callbackNode;
  if (lane === NoLane) {
    return null;
  }
  const needSync = lane === SyncLane || didTimeout;
  // render阶段
  const exitStatus = renderRoot(root, lane, !needSync);

  ensureRootIsScheduled(root);

  switch (exitStatus) {
    // 中断
    case RootInComplete:
      if (root.callbackNode !== curCallbackNode) {
        return null;
      }
      return performConcurrentWorkOnRoot.bind(null, root);
    case RootCompleted:
      const finishedWork = root.current.alternate;
      root.finishedWork = finishedWork;
      root.finishedLane = lane;
      wipRootRenderLane = NoLane;
      commitRoot(root);
      break;
    // case RootDidNotComplete:
    // markRootSuspended(root, lane);
    // wipRootRenderLane = NoLane;
    // ensureRootIsScheduled(root);
    // break;
    default:
      if (__DEV__) {
        console.error("还未实现的并发更新结束状态");
      }
  }
}

function performSyncWorkOnRoot(root: FiberRootNode) {
  const nextLane = getHighestPriorityLane(root.pendingLanes);

  if (nextLane !== SyncLane) {
    // 其他比SyncLane低的优先级
    // NoLane
    ensureRootIsScheduled(root);
    return;
  }

  const exitStatus = renderRoot(root, nextLane, false);
  if (exitStatus === RootCompleted) {
    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    root.finishedLane = nextLane;
    wipRootRenderLane = NoLane;
    // commit阶段操作
    commitRoot(root);
  } else if (__DEV__) {
    console.error("还未实现的同步更新状态");
  }
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

  const lane = root.finishedLane;
  if (lane === NoLane && __DEV__) {
    console.error("-----");
  }
  // 重置
  root.finishedWork = null;
  root.finishedLane = NoLane;
  markRootFinished(root, lane);

  if (
    (finishedWork.flags & PassiveMask) !== NoFlags ||
    (finishedWork.subtreeFlags & PassiveMask) !== NoFlags
  ) {
    if (!rootDoesHasPassiveEffects) {
      rootDoesHasPassiveEffects = true;
      // 调度副作用
      scheduleCallback(NormalPriority, () => {
        // 执行副作用
        flushPassiveEffects(root.pendingPassiveEffects);
        return;
      });
    }
  }

  function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
    let didFlushPassiveEffect = false;
    pendingPassiveEffects.unmount.forEach((effect) => {
      didFlushPassiveEffect = true;
      commitHookEffectListUnmount(Passive, effect);
    });
    pendingPassiveEffects.unmount = [];

    pendingPassiveEffects.update.forEach((effect) => {
      didFlushPassiveEffect = true;
      commitHookEffectListDestroy(Passive | HookHasEffect, effect);
    });
    pendingPassiveEffects.update.forEach((effect) => {
      didFlushPassiveEffect = true;
      commitHookEffectListCreate(Passive | HookHasEffect, effect);
    });
    pendingPassiveEffects.update = [];
    flushSyncCallbacks();
    return didFlushPassiveEffect;
  }

  const subtreeHasEffect =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

  if (subtreeHasEffect || rootHasEffect) {
    // 有副作用要执行

    // 阶段1/3:beforeMutation

    // 阶段2/3:Mutation
    commitMutationEffects(finishedWork, root);

    // Fiber Tree切换
    root.current = finishedWork;

    // 阶段3:Layout
  } else {
    // Fiber Tree切换
    root.current = finishedWork;
  }
  rootDoesHasPassiveEffects = false;
  ensureRootIsScheduled(root);
}

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
  if (__DEV__) {
    // console.log("render阶段初始化工作", root);
  }
  root.finishedLane = NoLane;
  root.finishedWork = null;
  workInProgress = createWorkInProgress(root.current, {});
  wipRootRenderLane = lane;
}

function workLoopSync() {
  // debugger;
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

function workLoopConcurrent() {
  while (workInProgress !== null && !unstable_shouldYield()) {
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
