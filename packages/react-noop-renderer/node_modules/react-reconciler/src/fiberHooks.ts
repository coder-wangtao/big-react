import { Dispatcher, Dispatch } from "react/src/currentDispatcher";
import { Action } from "shared/ReactTypes";
import sharedInternals from "shared/internals";
import { FiberNode } from "./fiber";
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  processUpdateQueue,
  Update,
  UpdateQueue,
} from "./updateQueue";
import { scheduleUpdateOnFiber } from "./workLoop";
import { Lane, NoLane, requestUpdateLane } from "./fiberLanes";
import { Flags, NoFlags, PassiveEffect } from "./fiberFlags";
import { HookHasEffect, Passive } from "./hookEffectTags";

let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null; //当前在执行哪个hook
let currentlyRenderingFiber: FiberNode | null = null; //当前在处理哪个函数组件
let renderLane: Lane = NoFlags;

interface Hook {
  memoizedState: any;
  // 对于state，保存update相关数据
  updateQueue: unknown;
  next: Hook | null;
  baseState: any;
  baseQueue: Update<any> | null;
}

type EffectCallback = () => void;
export type HookDeps = any[] | null;

export interface Effect {
  tag: Flags;
  create: EffectCallback | void;
  destroy: EffectCallback | void;
  deps: HookDeps;
  next: Effect | null;
}

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
  lastEffect: Effect | null;
  lastRenderedState: State;
}

const { currentDispatcher } = sharedInternals;

export const renderWithHooks = (workInProgress: FiberNode, lane: Lane) => {
  currentlyRenderingFiber = workInProgress;
  // 重置
  workInProgress.memoizedState = null;
  renderLane = lane;
  workInProgress.updateQueue = null;

  const current = workInProgress.alternate;
  if (current !== null) {
    currentDispatcher.current = HooksDispatcherOnUpdate;
  } else {
    currentDispatcher.current = HooksDispatcherOnMount;
  }
  const Component = workInProgress.type;
  const props = workInProgress.pendingProps;
  const children = Component(props);

  // 重置
  currentlyRenderingFiber = null;
  workInProgressHook = null;
  currentHook = null;
  renderLane = NoLane;
  return children;
};

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
  useEffect: mountEffect,
};

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
  useEffect: updateEffect,
};

function mountState<State>(
  initialState: (() => State) | State,
): [State, Dispatch<State>] {
  const hook = mountWorkInProgressHook();
  let memoizedState: State;
  if (initialState instanceof Function) {
    memoizedState = initialState();
  } else {
    memoizedState = initialState;
  }
  hook.memoizedState = memoizedState;

  const queue = createUpdateQueue<State>();
  hook.updateQueue = queue;
  // @ts-ignore
  const dispatch = (queue.dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    queue,
  ));

  return [memoizedState, dispatch];
}

function updateState<State>(): [State, Dispatch<State>] {
  const hook = updateWorkInProgressHook();
  const queue = hook.updateQueue as UpdateQueue<State>;
  const pending = queue.shared.pending;
  const baseState = hook.baseState;
  const current = currentHook as Hook;
  let baseQueue = current.baseQueue;

  // 缺少render阶段更新的处理逻辑
  // queue.shared.pending = null;
  if (pending !== null) {
    if (baseQueue !== null) {
      // baseQueue b2 -> b0 -> b1 -> b2
      // pendingQueue p2 -> p0 -> p1 -> p2
      // b0
      const baseFirst = baseQueue.next;
      // p0
      const pendingFirst = pending.next;
      // b2 -> p0
      baseQueue.next = pendingFirst;
      // p2 -> b0
      pending.next = baseFirst;
      // p2 -> b0 -> b1 -> b2 -> p0 -> p1 -> p2
    }
    baseQueue = pending;
    // 保存在current中
    current.baseQueue = pending;
    queue.shared.pending = null;

    if (baseQueue !== null) {
      const {
        memoizedState,
        baseQueue: newBaseQueue,
        baseState: newBaseState,
      } = processUpdateQueue(baseState, baseQueue, renderLane);
      hook.memoizedState = memoizedState;
      hook.baseState = newBaseState;
      hook.baseQueue = newBaseQueue;
    }
  }
  return [hook.memoizedState, queue.dispatch as Dispatch<State>];
}

function mountEffect(create: EffectCallback | void, deps: HookDeps | void) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  (currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;

  hook.memoizedState = pushEffect(
    Passive | HookHasEffect,
    create,
    undefined,
    nextDeps,
  );
}

function updateEffect(create: EffectCallback | void, deps: HookDeps | void) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  let destroy: EffectCallback | void;

  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState as Effect;
    destroy = prevEffect.destroy;

    if (nextDeps !== null) {
      // 浅比较依赖
      const prevDeps = prevEffect.deps;
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memoizedState = pushEffect(Passive, create, destroy, nextDeps);
        return;
      }
    }
    // 浅比较 不相等
    (currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
    hook.memoizedState = pushEffect(
      Passive | HookHasEffect,
      create,
      destroy,
      nextDeps,
    );
  }
}

function areHookInputsEqual(nextDeps: HookDeps, prevDeps: HookDeps) {
  if (prevDeps === null || nextDeps === null) {
    return false;
  }
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (Object.is(prevDeps[i], nextDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}

function pushEffect(
  hookFlags: Flags,
  create: EffectCallback | void,
  destroy: EffectCallback | void,
  deps: HookDeps,
): Effect {
  const effect: Effect = {
    tag: hookFlags,
    create,
    destroy,
    deps,
    next: null,
  };
  const fiber = currentlyRenderingFiber as FiberNode;
  const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
  if (updateQueue === null) {
    const updateQueue = createFCUpdateQueue();
    fiber.updateQueue = updateQueue;
    effect.next = effect;
    updateQueue.lastEffect = effect;
  } else {
    // 插入effect
    const lastEffect = updateQueue.lastEffect;
    if (lastEffect === null) {
      effect.next = effect;
      updateQueue.lastEffect = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      updateQueue.lastEffect = effect;
    }
  }
  return effect;
}

function createFCUpdateQueue<State>() {
  const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>;
  updateQueue.lastEffect = null;
  return updateQueue;
}

function dispatchSetState<State>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<State>,
  action: Action<State>,
) {
  const lane = requestUpdateLane();
  const update = createUpdate(action, lane);

  enqueueUpdate(updateQueue, update);

  scheduleUpdateOnFiber(fiber, lane);
}

function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    updateQueue: null,
    next: null,
    baseQueue:null,
    baseState:null
  };
  //当前在处理的Hook
  if (workInProgressHook === null) {
    //mount
    if (currentlyRenderingFiber === null) {
      //在函数式组件中调用hook,怎么保证一定在函数内调用hook
      console.error("mountWorkInprogressHook时currentlyRenderingFiber未定义");
    } else {
      currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
    }
  } else {
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook as Hook;
}

function updateWorkInProgressHook(): Hook {
  // 情况1:交互触发的更新，此时wipHook还不存在，复用 currentHook链表中对应的 hook 克隆 wipHook
  // 情况2:render阶段触发的更新，wipHook已经存在，使用wipHook
  let nextCurrentHook: Hook | null;
  let nextWorkInProgressHook: Hook | null;

  if (currentHook === null) {
    // 情况1 当前组件的第一个hook
    const current = (currentlyRenderingFiber as FiberNode).alternate;
    if (current !== null) {
      nextCurrentHook = current.memoizedState;
    } else {
      nextCurrentHook = null;
    }
  } else {
    nextCurrentHook = currentHook.next;
  }

  if (workInProgressHook === null) {
    // 情况2 当前组件的第一个hook
    nextWorkInProgressHook = (currentlyRenderingFiber as FiberNode)
      .memoizedState;
  } else {
    nextWorkInProgressHook = workInProgressHook.next;
  }

  if (nextWorkInProgressHook !== null) {
    // 针对情况2 nextWorkInProgressHook保存了当前hook的数据
    workInProgressHook = nextWorkInProgressHook;
    currentHook = nextCurrentHook;
  } else {
    // 针对情况1 nextCurrentHook保存了可供克隆的hook数据
    if (nextCurrentHook === null) {
      // 本次render当前组件执行的hook比之前多，举个例子：
      // 之前：hook1 -> hook2 -> hook3
      // 本次：hook1 -> hook2 -> hook3 -> hook4
      // 那到了hook4，nextCurrentHook就为null
      console.error(
        `组件${currentlyRenderingFiber?.type}本次执行的hook比上次多`,
      );
    }
    currentHook = nextCurrentHook as Hook;
    const newHook: Hook = {
      memoizedState: currentHook.memoizedState,
      // 对于state，保存update相关数据
      updateQueue: currentHook.updateQueue,
      next: null,
      baseQueue:currentHook.baseQueue,
      baseState:currentHook.baseState
    };

    if (workInProgressHook === null) {
      (currentlyRenderingFiber as FiberNode).memoizedState =
        workInProgressHook = newHook;
    } else {
      workInProgressHook = workInProgressHook.next = newHook;
    }
  }
  return workInProgressHook as Hook;
}
