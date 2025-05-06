import { Dispatcher, resolveDispatcher } from "./src/currentDispatcher";
import currentDispatcher from "./src/currentDispatcher";
import currentBatchConfig from "./src/currentBatchConfig";
import {
  createElement as createElementFn,
  isValidElement as isValidElementFn,
} from "./src/jsx";
export { REACT_FRAGMENT_TYPE as Fragment } from "shared/ReactSymbol";
export { createContext } from "./src/context";
// React

//hook原理(单链表)
//hook在源码里面是一个对象存储的，并且是一个单链表，管理这些hook数据，顺序就是区分这些hook的唯一标识，如果加入条件语句，
//hook的顺序是不固定的，在内存中无法区分（没有key值，只有顺序）,所以要保证hook的顺稳定性
// hook = {
//   memorizedState: null, //state
//   next: null, //下个hook
// };
//const [state1,setState1] = useState(1)
//const [state2,setState2] = useState(2)
//const [state3,setState3] = useState(2)

export const useState: Dispatcher["useState"] = (initialState) => {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
};

export const useEffect: Dispatcher["useEffect"] = (create, deps) => {
  const dispatcher = resolveDispatcher();
  return dispatcher.useEffect(create, deps);
};

export const useTransition: Dispatcher["useTransition"] = () => {
  const dispatcher = resolveDispatcher();
  return dispatcher.useTransition();
};

export const useRef: Dispatcher["useRef"] = (initialValue) => {
  const dispatcher = resolveDispatcher() as Dispatcher;
  return dispatcher.useRef(initialValue);
};

export const useContext: Dispatcher["useContext"] = (context) => {
  const dispatcher = resolveDispatcher() as Dispatcher;
  return dispatcher.useContext(context);
};

export const useReducer: Dispatcher["useReducer"] = (...res) => {
  const dispatcher = resolveDispatcher() as Dispatcher;
  return dispatcher.useReducer(...res);
};

// 内部数据共享层
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
  currentDispatcher,
  currentBatchConfig,
};

export const version = "0.0.0";

// TODO 根据环境区分使用jsx/jsxDEV
export const createElement = createElementFn;
export const isValidElement = isValidElementFn;
