// ReactDOM.createRoot(root).render(<App/>)

import {
  createContainer,
  updateContainer,
} from "react-reconciler/src/fiberReconciler";
import { ReactElementType } from "shared/ReactTypes";
import { Container } from "./hostConfig";
import { initEvent } from "./SyntheticEvent";

/**
 * 创建Fiber根节点并封装为ReactDOMRoot对象的工厂函数
 *
 * @param {HTMLElement} container - React组件需要渲染到的DOM元素
 * @returns {ReactDOMRoot} 封装了Fiber根节点的ReactDOMRoot对象
 *
 * createRoot是一个工厂函数，接收一个DOM元素作为参数，这个DOM元素通常是React应用的根DOM节点。
 * 在函数内部，首先通过调用createContainer函数，传入DOM元素参数，创建一个Fiber根节点。
 * 然后将这个Fiber根节点传入ReactDOMRoot构造函数，创建一个ReactDOMRoot实例对象，并返回。
 */
export function createRoot(container: Container) {
  const root = createContainer(container);
  //FiberRootNode
  return {
    /**
     * render方法，负责更新或渲染React组件树
     * 当调用render方法时，会通过调用updateContainer函数，
     * 将传入的React元素或组件(children参数)更新或渲染到当前的Fiber树中。
     */
    render(element: ReactElementType) {
      initEvent(container, "click");
      return updateContainer(element, root);
    },
  };
}
