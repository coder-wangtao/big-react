import { Dispatch } from "react/src/currentDispatcher";
import { Action } from "shared/ReactTypes";
import { FiberNode } from "./fiber";
import { isSubsetOfLanes, Lane, NoLane } from "./fiberLanes";

export interface Update<State> {
  action: Action<State>;
  lane: Lane;
  next: Update<State> | null;
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null;
  };
  dispatch: Dispatch<State> | null;
}

// 创建
export const createUpdate = <State>(action: Action<State>, lane: Lane) => {
  if (__DEV__) {
    // console.log("创建update：", action);
  }
  return {
    action,
    lane,
    next: null,
  };
};

// 插入
export const enqueueUpdate = <Action>(
  updateQueue: UpdateQueue<Action>,
  update: Update<Action>,
) => {
  if (__DEV__) {
    // console.log("将update插入更新队列：", update);
  }
  const pending = updateQueue.shared.pending;
  if (pending === null) {
    update.next = update; //先不管
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  updateQueue.shared.pending = update;
};

// 初始化
export const createUpdateQueue = <Action>() => {
  const updateQueue: UpdateQueue<Action> = {
    shared: {
      pending: null,
    },
    dispatch: null,
  };
  return updateQueue;
};

// 消费
export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<any> | null,
  renderLane: Lane,
  onSkipUpdate?: <State>(update: Update<State>) => void,
): {
  memoizedState: State;
  baseState: State;
  baseQueue: Update<State> | null;
} => {
  const result: ReturnType<typeof processUpdateQueue<State>> = {
    memoizedState: baseState,
    baseState,
    baseQueue: null,
  };

  if (pendingUpdate !== null) {
    // 第一个update
    const first = pendingUpdate.next;
    let pending = pendingUpdate.next as Update<any>;

    let newBaseState = baseState;
    let newBaseQueueFirst: Update<State> | null = null;
    let newBaseQueueLast: Update<State> | null = null;
    const newState = baseState;

    do {
      const updateLane = pending.lane;
      if (!isSubsetOfLanes(renderLane, updateLane)) {
        //优先级不够 被跳过
        const clone = createUpdate(pending.action, pending.lane);

        // onSkipUpdate?.(clone);

        // 是不是第一个被跳过的
        if (newBaseQueueFirst === null) {
          // first u0 last = u0
          newBaseQueueFirst = clone;
          newBaseQueueLast = clone;
          newBaseState = newState;
        } else {
          // first u0 -> u1 -> u2
          // last u2
          (newBaseQueueLast as Update<State>).next = clone;
          newBaseQueueLast = clone;
        }
      } else {
        //优先级足够
        if (newBaseQueueLast !== null) {
          const clone = createUpdate(pending.action, NoLane);
          newBaseQueueLast.next = clone;
          newBaseQueueLast = clone;
        }
        const action = pending.action;
        if (action instanceof Function) {
          baseState = action(baseState);
        } else {
          baseState = action;
        }
      }
      pending = pending.next as Update<any>;
    } while (pending !== first);

    if (newBaseQueueLast === null) {
			// 本次计算没有update被跳过
			newBaseState = newState;
		} else {
			newBaseQueueLast.next = newBaseQueueFirst;
		}
		result.memoizedState = newState;
		result.baseState = newBaseState;
		result.baseQueue = newBaseQueueLast;
  }

  return result;
};
