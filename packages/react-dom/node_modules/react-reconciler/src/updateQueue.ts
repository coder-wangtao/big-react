import { Update } from "./fiberFlags";
import { Action } from "shared/ReactTypes";

// 定义 Update 数据结构
export interface Update<State> {
  action: Action<State>;
}

// 定义 UpdateQueue 数据结构
export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null;
  };
}

// 创建 Update 实例的方法
export const createUpdate = <State>(action: Action<State>): Update<State> => {
  return {
    action,
  };
};

// 创建 UpdateQueue 实例的方法
export const createUpdateQueue = <State>() => {
  return {
    shared: {
      pending: null,
    },
  } as UpdateQueue<State>;
};

// Update（更新）
// Update 表示对组件状态的一次更新操作。
// 当组件状态发生变化时（例如由 setState 触发），React 会创建一个 Update 对象，其中包含了新的状态或者状态的更新部分。
// Update 对象描述了如何修改组件的状态，如添加新的状态、更新现有的状态、删除状态等，以及与此更新相关的一些元数据，如优先级等。
// Update 对象记录了组件状态的变化，但实际的状态更新并不会立即执行，而是会被添加到更新队列中等待处理。

// UpdateQueue（更新队列）
// UpdateQueue 是一个队列数据结构，用于存储组件的更新操作。
// 当组件的状态发生变化时，会生成一个新的 Update 对象，并将其添加到组件的 UpdateQueue 中。
// UpdateQueue 管理着组件的状态更新顺序，确保更新操作能够按照正确的顺序和优先级被应用到组件上。
// 更新队列通常是以链表的形式实现的，每个 Update 对象都链接到下一个更新对象，形成一个更新链表。
// 在 React 的更新过程中，会遍历更新队列，并根据其中的更新操作来更新组件的状态以及更新 DOM。

// 将 Update 添加到 UpdateQueue 中的方法
export const enqueueUpdate = <State>(
  updateQueue: UpdateQueue<State>,
  update: Update<State>,
) => {
  updateQueue.shared.pending = update;
};

// 从 UpdateQueue 中消费 Update 的方法
export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State> | null,
): { memoizedState: State } => {
  const result: ReturnType<typeof processUpdateQueue<State>> = {
    memoizedState: baseState,
  };
  if (pendingUpdate !== null) {
    const action = pendingUpdate.action;
    if (action instanceof Function) {
      //baseState 1 update (x) => 4x -> memoizedState 4
      result.memoizedState = action(baseState);
    } else {
      //baseState 1 update 2 -> memoizedState 2
      result.memoizedState = action;
    }
  }
  return result;
};
