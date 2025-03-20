import { Dispatch, Dispatcher } from "react/src/currentDispatcher";
import { FiberNode } from "./fiber";
import internals from "shared/internals";
import { Action } from "shared/ReactTypes";
import { scheduleUpdateOnFiber } from "./workLoop";
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  processUpdateQueue,
  UpdateQueue,
} from "./updateQueue";

let currentlyRenderingFiber: FiberNode | null = null; //当前在处理哪个函数式组件
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null; //当前在执行哪个hook

const { currentDispatcher } = internals;

interface Hook {
  memoizedState: any;
  updateQueue: unknown;
  next: Hook | null;
}

export function renderWithHooks(wip: FiberNode) {
  //赋值操作
  currentlyRenderingFiber = wip;
  //重置hooks链表
  wip.memoizedState = null;

  const current = wip.alternate;

  if (current !== null) {
    // update
    // currentDispatcher.current = HooksDispatcherOnUpdate;
    currentDispatcher.current = HooksDispatcherOnUpdate;
  } else {
    // mount
    currentDispatcher.current = HooksDispatcherOnMount;
  }

  const Component = wip.type;
  const props = wip.pendingProps;
  const children = Component(props);

  //重置操作
  currentlyRenderingFiber = null;
  return children;
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
};

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
};

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
  const queue = createUpdateQueue<State>();
  hook.updateQueue = queue;
  hook.memoizedState = memoizedState;
  // function App() {
  //   const [x, dispatch] = useState();
  //   window.dispatch = dispatch;
  // }
  // dispatch(1111);

  // @ts-ignore
  //参数预置
  // function add(a, b) {
  //   return a + b;
  // }

  // const addFive = add.bind(null, 5);
  // console.log(addFive(10)); // 输出: 15

  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
  queue.dispatch = dispatch;
  // queue.lastRenderedState = memoizedState;
  return [memoizedState, dispatch];
}

function updateState<State>(): [State, Dispatch<State>] {
  // 找到当前useState对应的hook数据
  const hook = updateWorkInProgressHook();

  // 计算新state的逻辑
  const queue = hook.updateQueue as UpdateQueue<State>;
  const pending = queue.shared.pending;

  if (pending !== null) {
    const { memoizedState } = processUpdateQueue(hook.memoizedState, pending);
    hook.memoizedState = memoizedState;
  }

  return [hook.memoizedState, queue.dispatch as Dispatch<State>];
}

function updateWorkInProgressHook(): Hook {
  // TODO render阶段触发的更新
  let nextCurrentHook: Hook | null;

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

function dispatchSetState<State>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<State>,
  action: Action<State>,
) {
  const update = createUpdate(action);
  enqueueUpdate(updateQueue, update);
  scheduleUpdateOnFiber(fiber);
}

function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    updateQueue: null,
    next: null,
  };
  //当前在处理的Hook
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
