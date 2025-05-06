import { useReducer } from "../../react/index";
export function Component(props) {
  this.props = props;
}

Component.prototype.isReactComponent = {};

export function useReducer1(reducer, initialState) {
  const dispatch = () => {
    console.log("");
  };
  return [initialState, dispatch];
}
