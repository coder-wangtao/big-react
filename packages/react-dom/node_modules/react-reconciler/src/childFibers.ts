import { Props, ReactElementType } from "shared/ReactTypes";
import {
  createFiberFromElement,
  createWorkInProgress,
  FiberNode,
} from "./fiber";
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbol";
import { HostText } from "./workTags";
import { ChildDeletion, Placement } from "./fiberFlags";

function ChildReconciler(shouldTrackEffects: boolean) {
  function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
    if (!shouldTrackEffects) {
      return;
    }
    const deletions = returnFiber.deletions;
    if (deletions === null) {
      returnFiber.deletions = [childToDelete];
      returnFiber.flags |= ChildDeletion;
    } else {
      deletions.push(childToDelete);
    }
  }
  // 处理单个 Element 节点的情况
  // 对比 currentFiber 与 ReactElement
  // 生成 workInProgress FiberNode
  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    element: ReactElementType,
  ) {
    const key = element.key;
    work: while (currentFiber !== null) {
      // update
      if (currentFiber.key === key) {
        // key相同
        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          if (currentFiber.type === element.type) {
            // let props = element.props;
            // if (element.type === REACT_FRAGMENT_TYPE) {
            //   props = element.props.children;
            // }
            // type相同
            const existing = useFiber(currentFiber, element.props);
            existing.return = returnFiber;
            // // 当前节点可复用，标记剩下的节点删除
            // deleteRemainingChildren(returnFiber, currentFiber.sibling);
            return existing;
          }

          // // key相同，type不同 删掉所有旧的
          // deleteRemainingChildren(returnFiber, currentFiber);
          // break;
          //删掉旧的
          deleteChild(returnFiber, currentFiber);
          break work;
        } else {
          if (__DEV__) {
            console.warn("还未实现的react类型", element);
            break work;
          }
        }
      } else {
        // key不同，删掉旧的
        deleteChild(returnFiber, currentFiber);
        // currentFiber = currentFiber.sibling;
      }
    }

    const fiber = createFiberFromElement(element);
    fiber.return = returnFiber;
    return fiber;
  }

  // 处理文本节点的情况
  // 对比 currentFiber 与 ReactElement
  // 生成 workInProgress FiberNode
  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    content: string | number,
  ) {
    while (currentFiber !== null) {
      // update
      if (currentFiber.tag === HostText) {
        // 类型没变，可以复用
        const existing = useFiber(currentFiber, { content });
        existing.return = returnFiber;
        // deleteRemainingChildren(returnFiber, currentFiber.sibling);
        return existing;
      }
      deleteChild(returnFiber, currentFiber);
      // currentFiber = currentFiber.sibling;
    }
    const fiber = new FiberNode(HostText, { content }, null);
    fiber.return = returnFiber;
    return fiber;
  }

  // 为 Fiber 节点添加更新 flags
  function placeSingleChild(fiber: FiberNode) {
    if (shouldTrackEffects && fiber.alternate === null) {
      // 首屏渲染 且 追踪副作用时，才添加更新 flags
      fiber.flags |= Placement;
    }
    return fiber;
  }

  // 闭包，根据 shouldTrackSideEffects 返回不同 reconcileChildFibers 的实现
  return function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild?: ReactElementType,
  ) {
    // 判断当前 fiber 的类型
    // 单个 Element 节点
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcileSingleElement(returnFiber, currentFiber, newChild),
          );
        default:
          if (__DEV__) {
            console.warn("未实现的reconcile类型", newChild);
          }
          break;
      }
    }
    //多节点的情况
    // 多个 Element 节点
    if (Array.isArray(newChild)) {
      // TODO: 暂时不处理
      if (__DEV__) {
        console.warn("未实现的 reconcile 类型", newChild);
      }
    }

    // 文本节点
    if (typeof newChild === "string" || typeof newChild === "number") {
      return placeSingleChild(
        reconcileSingleTextNode(returnFiber, currentFiber, newChild),
      );
    }

    if (currentFiber !== null) {
      deleteChild(returnFiber, currentFiber);
    }

    if (__DEV__) {
      console.warn("未实现的reconcile类型", newChild);
    }

    return null;
  };
}

function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
  const clone = createWorkInProgress(fiber, pendingProps);
  clone.index = 0;
  clone.sibling = null;
  return clone;
}

// 组件的更新阶段中，追踪副作用
export const reconcileChildFibers = ChildReconciler(true);
// 首屏渲染阶段中不追踪副作用，只对根节点执行一次 DOM 插入操作
export const mountChildFibers = ChildReconciler(false);
