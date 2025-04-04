import { HookDeps } from "react-reconciler/src/fiberHooks";
import { Action } from "shared/ReactTypes";

export type Dispatcher = {
  useState: <T>(initialState: (() => T) | T) => [T, Dispatch<T>];
  useEffect: (callback: () => void | void, deps: HookDeps | undefined) => void;
};

export type Dispatch<State> = (action: Action<State>) => void;

const currentDispatcher: { current: null | Dispatcher } = {
  current: null,
};

export const resolveDispatcher = () => {
  const dispatcher = currentDispatcher.current;

  if (dispatcher === null) {
    console.error("resolve dispatcher时dispatcher不存在");
  }
  return dispatcher;
};

export default currentDispatcher;
