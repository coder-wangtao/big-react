import { Dispatcher, resolveDispatcher } from "./src/currentDispatcher";
export { jsxDEV, jsx, isValidElement, createElement } from "./src/jsx";
import currentDispatcher from "./src/currentDispatcher";

export const useState: Dispatcher["useState"] = (initialState) => {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
};

// 内部数据共享层
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
  currentDispatcher,
};

export const version = "0.0.0";
