import currentDispatcher, {
  Dispatcher,
  resolveDispatcher,
} from "./src/currentDispatcher";

import { jsx, isValidElement as isValidElementFn, jsxDEV } from "./src/jsx";

export const useState = <State>(initialState: (() => State) | State) => {
  const dispatcher = resolveDispatcher() as Dispatcher;
  return dispatcher.useState<State>(initialState);
};

export const useEffect: Dispatcher["useEffect"] = (create, deps) => {
  const dispatcher = resolveDispatcher();
  return dispatcher?.useEffect(create, deps);
};

export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
  currentDispatcher,
};

// 这里应该根据环境区分jsx/jsxDEV，在测试用例中也要区分，当前ReactElement-test.js中使用的是jsx
export const createElement = jsx;
export const isValidElement = isValidElementFn;

export default {
  version: "0.0.0",
  createElement: jsxDEV,
};
