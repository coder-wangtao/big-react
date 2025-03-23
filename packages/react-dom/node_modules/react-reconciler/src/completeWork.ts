import {
  appendInitialChild,
  Container,
  createInstance,
  createTextInstance,
} from "hostConfig";
import { FiberNode } from "./fiber";
import {
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./workTags";
import { NoFlags, Update } from "./fiberFlags";
import { updateFiberProps } from "react-dom/src/SyntheticEvent";

function markUpdate(fiber: FiberNode) {
  fiber.flags |= Update;
}

// 生成更新计划，计算和收集更新 flags
export const completeWork = (wip: FiberNode) => {
  //递归中的归
  const newProps = wip.pendingProps;
  const current = wip.alternate;

  switch (wip.tag) {
    // 表示原生 DOM 元素节点；
    // 构建 DOM 节点，并调用 appendAllChildren 函数将 DOM 插入到 DOM 树中；
    // 收集更新 flags，并根据更新 flags 执行不同的 DOM 操作，例如插入新节点、更新节点属性、删除节点等；

    case HostComponent:
      if (current !== null && wip.stateNode) {
        //update
        // TODO: 组件的更新阶段
        updateFiberProps(wip.stateNode, newProps);
      } else {
        // 首屏渲染阶段
        // 构建 DOM
        const instance = createInstance(wip.type, newProps);
        // 将 DOM 插入到 DOM 树中
        appendAllChildren(instance, wip);
        wip.stateNode = instance;
      }
      // 收集更新 flags
      bubbleProperties(wip);
      return null;

    // 表示文本节点；
    // 构建 DOM 节点，并将 DOM 插入到 DOM 树中；
    // 收集更新 flags，根据 flags 的值，更新文本节点的内容；
    case HostText:
      if (current !== null && wip.stateNode) {
        // TODO: 组件的更新阶段
        // update
        const oldText = current.memoizedProps?.content;
        const newText = newProps.content;
        if (oldText !== newText) {
          markUpdate(wip);
        }
      } else {
        // 首屏渲染阶段
        // 构建 DOM
        const instance = createTextInstance(newProps.content);
        wip.stateNode = instance;
      }
      // 收集更新 flags
      bubbleProperties(wip);
      return null;

    // 表示根节点；
    // 会执行一些与根节点相关的最终操作，例如处理根节点的属性，确保整个应用更新完毕；
    case HostRoot:
    case FunctionComponent:
    case Fragment:
      bubbleProperties(wip);
      return null;

    default:
      if (__DEV__) {
        console.warn("未处理completeWork情况", wip);
      }
      break;
  }
};

function appendAllChildren(parent: Container, wip: FiberNode) {
  let node = wip.child;
  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      // 处理原生 DOM 元素节点或文本节点
      appendInitialChild(parent, node?.stateNode);
    } else if (node.child !== null) {
      // 递归处理其他类型的组件节点的子节点
      node.child.return = node;
      node = node.child;
      continue;
    }

    if (node === wip) {
      return;
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === wip) {
        return;
      }
      node = node?.return;
    }
    // 处理下一个兄弟节点
    node.sibling.return = node.return;
    node = node.sibling;
  }
}

// 收集更新 flags，将子 FiberNode 的 flags 冒泡到父 FiberNode 上
function bubbleProperties(wip: FiberNode) {
  let subtreeFlags = NoFlags;
  let child = wip.child;
  while (child !== null) {
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;
    child.return = wip;
    child = child.sibling;
  }
  wip.subtreeFlags |= subtreeFlags;
}
