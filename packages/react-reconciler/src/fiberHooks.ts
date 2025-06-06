import { Dispatch } from "react/src/currentDispatcher";
import { Dispatcher } from "react/src/currentDispatcher";
import internals from "shared/internals";
import { Action, ReactContext, Thenable, Usable } from "shared/ReactTypes";
import { FiberNode } from "./fiber";
import { Flags, PassiveEffect } from "./fiberFlags";
import {
  Lane,
  NoLane,
  NoLanes,
  SyncLane,
  mergeLanes,
  removeLanes,
  requestUpdateLane,
} from "./fiberLanes";
import { HookHasEffect, Passive } from "./hookEffectTags";
import {
  basicStateReducer,
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  processUpdateQueue,
  Update,
  UpdateQueue,
} from "./updateQueue";
import {
  markUpdateLaneFromFiberToRoot,
  scheduleUpdateOnFiber,
} from "./workLoop";
import { trackUsedThenable } from "./thenable";
import { REACT_CONTEXT_TYPE } from "shared/ReactSymbol";
import { markWipReceivedUpdate } from "./beginWork";
import { readContext as readContextOrigin } from "./fiberContext";

let currentlyRenderingFiber: FiberNode | null = null; //当前正在render的fiber
let workInProgressHook: Hook | null = null; //当前正在处理的hook
let currentHook: Hook | null = null;
let renderLane: Lane = NoLane;

const { currentDispatcher, currentBatchConfig } = internals;

//useContext 也不能再条件语句中使用，如果想在条件语句中使用，可以用use
function readContext<Value>(context: ReactContext<Value>): Value {
  const consumer = currentlyRenderingFiber as FiberNode;
  return readContextOrigin(consumer, context);
}
interface Hook {
  memoizedState: any;
  updateQueue: unknown;
  next: Hook | null;
  baseState: any;
  baseQueue: Update<any> | null;
}

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

type EffectCallback = () => void;
export type HookDeps = any[] | null;

export function renderWithHooks(
  wip: FiberNode,
  Component: FiberNode["type"],
  lane: Lane,
) {
  // 赋值操作
  currentlyRenderingFiber = wip;
  // 重置 hooks链表
  wip.memoizedState = null;
  // 重置 effect链表
  wip.updateQueue = null;
  renderLane = lane;

  const current = wip.alternate;

  if (current !== null) {
    // update
    currentDispatcher.current = HooksDispatcherOnUpdate;
  } else {
    // mount
    currentDispatcher.current = HooksDispatcherOnMount;
  }

  const props = wip.pendingProps;
  // FC render
  const children = Component(props);

  // 重置操作
  currentlyRenderingFiber = null;
  workInProgressHook = null;
  currentHook = null;
  renderLane = NoLane;
  return children;
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
  useEffect: mountEffect,
  useTransition: mountTransition,
  useRef: mountRef,
  ///useContext 也不能再条件语句中使用，如果想在条件语句中使用，可以用use
  useContext: readContext,
  use,
  useMemo: mountMemo,
  useCallback: mountCallback,
  useSyncExternalStore: mountSyncExternalStore,
};

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
  useEffect: updateEffect,
  useTransition: updateTransition,
  useRef: updateRef,
  //useContext 也不能再条件语句中使用，如果想在条件语句中使用，可以用use
  useContext: readContext,
  use,
  useMemo: updateMemo,
  useCallback: updateCallback,
  useSyncExternalStore: updateSyncExternalStore,
};

// 为了便于理解，这里不讨论传入服务端渲染调用方法的情况
function mountSyncExternalStore(subscribe: any, getSnapshot: any) {
  // 创建Hook对象，构建Hook单链表
  const hook = mountWorkInProgressHook();
  // 监听subscribe函数，在DOM更新阶段调用subscribe方法
  mountEffect(
    subscribeToStore.bind(null, currentlyRenderingFiber, hook, subscribe),
    [subscribe],
  );
  // 调用getSnapshot方法获取初始值
  const nextSnapshot = getSnapshot();
  hook.memoizedState = [nextSnapshot, getSnapshot];
  return nextSnapshot;
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

function forceStoreRerender(fiber: any) {
  // 获取FiberRootNode对象
  const root = markUpdateLaneFromFiberToRoot(fiber, SyncLane);
  // 修改FiberNode节点优先级
  fiber.lanes |= SyncLane;
  if (fiber.alternate !== null) fiber.alternate.lanes |= SyncLane;
  // 触发更新渲染
  scheduleUpdateOnFiber(root, SyncLane);
}

// 调用subscribe方法，并获取返回的destroy方法
function subscribeToStore(fiber: any, hook: any, subscribe: any) {
  // 当触发监听事件时，会调用callback方法
  const callback = () => {
    const [prevSnapshot, getSnapshot] = hook.memoizedState;
    const nextSnapshot = getSnapshot();
    // 比对新旧值是否相同，如果不相同更新Hook对象memoizedState属性，触发更新渲染
    if (nextSnapshot !== prevSnapshot) {
      hook.memoizedState[0] = nextSnapshot;
      forceStoreRerender(fiber);
    }
  };
  return subscribe(callback);
}

// 为了便于理解，这里不讨论传入服务端渲染调用方法的情况
function updateSyncExternalStore(subscribe: any, getSnapshot: any) {
  // 创建Hook对象，复制旧Hook对象属性值，构建Hook链表
  const hook = updateWorkInProgressHook();
  // 由于getSnapshot方法可能发生变更，所以需要重新赋值确保调用最新的getSnapshot方法
  hook.memoizedState[1] = getSnapshot;
  // 监听subscribe方法，如果发生变更，会在DOM更新阶段重新执行subscribe方法
  updateEffect(
    subscribeToStore.bind(null, currentlyRenderingFiber, hook, subscribe),
    [subscribe],
  );
  return hook.memoizedState[0];
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
      // 它旨在提供比 === 更精确的相等性判断，尤其在处理特殊值时。
      // 与 === 的区别：
      // 处理 NaN：Object.is(NaN, NaN) 返回 true，而 NaN === NaN 是 false。
      // 处理 0 和 -0：Object.is(0, -0) 返回 false，而 0 === -0 是 true。
      // 其他情况与 === 一致。
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

function updateState<State>(): [State, Dispatch<State>] {
  // 找到当前useState对应的hook数据
  const hook = updateWorkInProgressHook();

  // 计算新state的逻辑
  const queue = hook.updateQueue as FCUpdateQueue<State>;
  const baseState = hook.baseState;

  const pending = queue.shared.pending;
  const current = currentHook as Hook;
  let baseQueue = current.baseQueue;

  if (pending !== null) {
    // pending baseQueue update保存在current中
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
  }

  if (baseQueue !== null) {
    const prevState = hook.memoizedState;
    const {
      memoizedState,
      baseQueue: newBaseQueue,
      baseState: newBaseState,
    } = processUpdateQueue(baseState, baseQueue, renderLane, (update) => {
      const skippedLane = update.lane;
      const fiber = currentlyRenderingFiber as FiberNode;

      // NoLanes
      fiber.lanes = mergeLanes(fiber.lanes, skippedLane);
    });

    // NaN === NaN // false
    // Object.is true

    // +0 === -0 // true
    // Object.is false
    if (!Object.is(prevState, memoizedState)) {
      markWipReceivedUpdate();
    }

    hook.memoizedState = memoizedState;
    hook.baseState = newBaseState;
    hook.baseQueue = newBaseQueue;

    queue.lastRenderedState = memoizedState;
  }

  return [hook.memoizedState, queue.dispatch as Dispatch<State>];
}

function updateWorkInProgressHook(): Hook {
  // 找到当前useState对应的hook数据
  // TODO render阶段触发的更新
  let nextCurrentHook: Hook | null;

  //mount useState1 useState2 useState3
  //update useState1 useState2 useState3 useState4
  //if(ture){
  //useState4
  //}

  if (currentHook === null) {
    // 这是这个FC update时的第一个hook
    const current = (currentlyRenderingFiber as FiberNode).alternate;
    if (current !== null) {
      nextCurrentHook = current.memoizedState;
    } else {
      // mount
      nextCurrentHook = null;
    }
  } else {
    // 这个FC update时 后续的hook
    nextCurrentHook = currentHook.next;
  }

  if (nextCurrentHook === null) {
    // mount/update u1 u2 u3
    // update       u1 u2 u3 u4
    throw new Error(
      `组件 ${currentlyRenderingFiber?.type.name} 本次执行时的Hook比上次执行时多`,
    );
  }

  currentHook = nextCurrentHook as Hook;

  const newHook: Hook = {
    memoizedState: currentHook.memoizedState,
    updateQueue: currentHook.updateQueue,
    next: null,
    baseQueue: currentHook.baseQueue,
    baseState: currentHook.baseState,
  };
  if (workInProgressHook === null) {
    // mount时 第一个hook
    if (currentlyRenderingFiber === null) {
      throw new Error("请在函数组件内调用hook");
    } else {
      workInProgressHook = newHook;
      currentlyRenderingFiber.memoizedState = workInProgressHook;
    }
  } else {
    // mount时 后续的hook
    workInProgressHook.next = newHook;
    workInProgressHook = newHook;
  }
  return workInProgressHook;
}

function mountState<State>(
  initialState: (() => State) | State,
): [State, Dispatch<State>] {
  // 找到当前useState对应的hook数据
  const hook = mountWorkInProgressHook();
  let memoizedState;
  if (initialState instanceof Function) {
    memoizedState = initialState();
  } else {
    memoizedState = initialState;
  }
  //创建一个Update
  const queue = createFCUpdateQueue<State>();
  hook.updateQueue = queue;
  hook.memoizedState = memoizedState;
  hook.baseState = memoizedState;

  // @ts-ignore
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
  queue.dispatch = dispatch;
  queue.lastRenderedState = memoizedState;
  return [memoizedState, dispatch];
}

function mountTransition(): [boolean, (callback: () => void) => void] {
  const [isPending, setPending] = mountState(false);
  const hook = mountWorkInProgressHook();
  const start = startTransition.bind(null, setPending);
  hook.memoizedState = start;
  return [isPending, start];
}

function updateTransition(): [boolean, (callback: () => void) => void] {
  const [isPending] = updateState();
  const hook = updateWorkInProgressHook();
  const start = hook.memoizedState;
  return [isPending as boolean, start];
}

//res = useRef(null)
function mountRef<T>(initialValue: T): { current: T } {
  const hook = mountWorkInProgressHook();
  const ref = { current: initialValue };
  hook.memoizedState = ref;
  return ref;
}

function updateRef<T>(initialValue: T): { current: T } {
  const hook = updateWorkInProgressHook();
  // debugger;
  return hook.memoizedState;
}

function startTransition(setPending: Dispatch<boolean>, callback: () => void) {
  setPending(true);
  const prevTransition = currentBatchConfig.transition;
  currentBatchConfig.transition = 1;

  callback();
  setPending(false);

  currentBatchConfig.transition = prevTransition;
}

function dispatchSetState<State>(
  fiber: FiberNode,
  updateQueue: FCUpdateQueue<State>,
  action: Action<State>,
) {
  //譬如：setState在一个onclick事件触发，或者是在useEffect回调触发的,根据触发的不同，返回不同的优先级
  //并发更新的基础
  const lane = requestUpdateLane();
  const update = createUpdate(action, lane);
  // debugger;
  // eager策略
  const current = fiber.alternate;
  if (
    fiber.lanes === NoLanes &&
    (current === null || current.lanes === NoLanes)
  ) {
    // 当前产生的update是这个fiber的第一个update
    // 1. 更新前的状态 2.计算状态的方法
    const currentState = updateQueue.lastRenderedState;
    const eagerState = basicStateReducer(currentState, action);
    update.hasEagerState = true;
    update.eagerState = eagerState;

    if (Object.is(currentState, eagerState)) {
      // debugger;
      enqueueUpdate(updateQueue, update, fiber, NoLane);
      // 命中eagerState
      if (__DEV__) {
        console.warn("命中eagerState", fiber);
      }
      return;
    }
  }

  enqueueUpdate(updateQueue, update, fiber, lane);

  scheduleUpdateOnFiber(fiber, lane);
}

function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    updateQueue: null,
    next: null,
    baseQueue: null,
    baseState: null,
  };
  if (workInProgressHook === null) {
    // mount时 第一个hook
    if (currentlyRenderingFiber === null) {
      throw new Error("请在函数组件内调用hook");
    } else {
      workInProgressHook = hook;
      currentlyRenderingFiber.memoizedState = workInProgressHook;
    }
  } else {
    // mount时 后续的hook
    workInProgressHook.next = hook;
    workInProgressHook = hook;
  }
  return workInProgressHook;
}

function use<T>(usable: Usable<T>): T {
  //useable其实是一个Promise
  //use接收到Promise,我们接收到Promise转化成Thenable提供内部使用

  //Thenable
  //untracked
  //pending
  //fulfilled -> resolve
  //rejected -> reject

  // debugger;
  if (usable !== null && typeof usable === "object") {
    if (typeof (usable as Thenable<T>).then === "function") {
      const thenable = usable as Thenable<T>;
      return trackUsedThenable(thenable);
    } else if ((usable as ReactContext<T>).$$typeof === REACT_CONTEXT_TYPE) {
      const context = usable as ReactContext<T>;
      return readContext(context);
    }
  }
  throw new Error("不支持的use参数 " + usable);
}

export function resetHooksOnUnwind(wip: FiberNode) {
  currentlyRenderingFiber = null;
  currentHook = null;
  workInProgressHook = null;
}

export function bailoutHook(wip: FiberNode, renderLane: Lane) {
  const current = wip.alternate as FiberNode;
  wip.updateQueue = current.updateQueue;
  wip.flags &= ~PassiveEffect;

  current.lanes = removeLanes(current.lanes, renderLane);
}

function mountCallback<T>(callback: T, deps: HookDeps | undefined) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  hook.memoizedState = [callback, nextDeps];
  return callback;
}

function updateCallback<T>(callback: T, deps: HookDeps | undefined) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;

  if (nextDeps !== null) {
    const prevDeps = prevState[1];
    if (areHookInputsEqual(nextDeps, prevDeps)) {
      return prevState[0];
    }
  }
  hook.memoizedState = [callback, nextDeps];
  return callback;
}

function mountMemo<T>(nextCreate: () => T, deps: HookDeps | undefined) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

function updateMemo<T>(nextCreate: () => T, deps: HookDeps | undefined) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;

  if (nextDeps !== null) {
    const prevDeps = prevState[1];
    if (areHookInputsEqual(nextDeps, prevDeps)) {
      return prevState[0];
    }
  }
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}
