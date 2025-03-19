import { processUpdateQueue, UpdateQueue } from "./updateQueue";
import { FiberNode } from "./fiber";
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./workTags";
import { ReactElementType } from "shared/ReactTypes";
import { mountChildFibers, reconcileChildFibers } from "./childFibers";
import { renderWithHooks } from "./fiberHooks";

// beginWork 函数在向下遍历阶段执行，根据 Fiber 节点的类型（HostRoot、HostComponent、HostText）
// 分发任务给不同的处理函数，处理具体节点类型的更新逻辑：

// HostRoot
// 表示根节点，即应用的最顶层节点；
// 调用 updateHostRoot 函数，处理根节点的更新，包括协调处理根节点的属性以及子节点的更新逻辑；
// 调用 reconcileChildren 函数，处理根节点的子节点，可能会递归调用其他协调函数；
// 返回 workInProgress.child 表示经过协调后的新的子节点链表；

// HostComponent
// 表示原生 DOM 元素节点，例如 <div>、<span> 等；
// 调用 updateHostComponent 函数，处理原生 DOM 元素节点的更新，负责协调处理属性和子节点的更新逻辑；
// 调用 reconcileChildren 函数，处理原生 DOM 元素的子节点更新；
// 返回 workInProgress.child 表示经过协调后的新的子节点链表；

// HostText
// 表示文本节点，即 DOM 中的文本内容，例如 <p>123</p> 中的 123；
// 调用 updateHostText 函数，协调处理文本节点的内容更新；
// 返回 null 表示已经是叶子节点，没有子节点了；

// <A>
//   <B />
// </A>;
// 当进入A的beginWork时，通过对比B current fiberNode 与 B的reactElement，生成对应B对应的wip fiberNode
//此过程只标记结构相关的变化  Placement（插入、移动） ChildDeletion（删除）

//beginWork性能优化
// <div>
//   <p>练习时长</p>
//   <span>两年半</span>
// </div>
//理论上mount流程完毕后包含的flags:
//两年半 Placement
//span Placement
//练习时长 Placement
//p Placement
//div Placement
//相当于执行5次Placement,我们可以构建好离屏dom树后，对div执行一次Placement操作
export const beginWork = (wip: FiberNode) => {
  // 比较并返回子 FiberNode
  //递归中的递
  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip);
    case HostComponent:
      return updateHostComponent(wip);
    case HostText:
      return null;
    case FunctionComponent:
      return updateFunctionComponent(wip);
    default:
      if (__DEV__) {
        console.warn("beginWork未实现的类型");
      }
      break;
  }
  return null;
};

function updateFunctionComponent(wip: FiberNode) {
  const nextChildren = renderWithHooks(wip);
  reconcileChildren(wip, nextChildren); //子对应的fiberNode和子对应的reactElement比较 生成新的子child fiberNode
  return wip.child;
}

function updateHostRoot(wip: FiberNode) {
  // 根据当前节点和工作中节点的状态进行比较，处理属性等更新逻辑
  const baseState = wip.memoizedState;
  const updateQueue = wip.updateQueue as UpdateQueue<Element>;
  const pending = updateQueue.shared.pending;

  // 清空更新链表
  updateQueue.shared.pending = null;

  // 计算待更新状态的最新值
  const { memoizedState } = processUpdateQueue(baseState, pending);

  wip.memoizedState = memoizedState;

  // 处理子节点的更新逻辑
  const nextChildren = wip.memoizedState; //（子对应的reactElement）

  reconcileChildren(wip, nextChildren); //子对应的fiberNode和子对应的reactElement比较 生成新的子child fiberNode
  // 返回新的子节点
  return wip.child;
}

function updateHostComponent(wip: FiberNode) {
  const nextProps = wip.pendingProps;
  const nextChildren = nextProps.children;
  reconcileChildren(wip, nextChildren); //子对应的fiberNode和子对应的reactElement比较 生成新的子child fiberNode
  return wip.child;
}
// 对比子节点的 current FiberNode 与 子节点的 ReactElement
// 生成子节点对应的 workInProgress FiberNode
function reconcileChildren(wip: FiberNode, children?: ReactElementType) {
  // alternate 指向节点的备份节点，即 current
  const current = wip.alternate;
  if (current !== null) {
    //update
    // 组件的更新阶段
    // reconcileChildFibers 函数作用于组件的更新阶段，即当组件已经存在于 DOM 中，需要进行更新时。
    // 主要任务是协调处理当前组件实例的子节点，对比之前的子节点（current）和新的子节点（workInProgress）之间的变化。
    // 根据子节点的类型和 key 进行对比，决定是复用、更新、插入还是删除子节点，最终形成新的子节点链表。
    wip.child = reconcileChildFibers(wip, current?.child, children);
  } else {
    //mount
    // 首屏渲染阶段
    // mountChildFibers 函数作用于组件的首次渲染阶段，即当组件第一次被渲染到 DOM 中时。
    // 主要任务是协调处理首次渲染时组件实例的子节点。
    // 但此时是首次渲染，没有之前的子节点，所以主要是创建新的子节点链表。
    wip.child = mountChildFibers(wip, null, children);
  }
}
