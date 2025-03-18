import { beginWork } from "./beginWork";
import { commitMutationEffects } from "./commitWork";
import { completeWork } from "./completeWork";
import { createWorkInProgress, FiberNode, FiberRootNode } from "./fiber";
import { MutationMask, NoFlags } from "./fiberFlags";
import { HostRoot } from "./workTags";
let workInProgress: FiberNode | null;   //workInProgress在global作用域，类似链表的指针，标记当前处理元素的位置

// 初始化 workInProgress 变量
function prepareFreshStack(root: FiberRootNode) {
  workInProgress = createWorkInProgress(root.current, {});
}

function renderRoot(root: FiberRootNode) {
  // 初始化 workInProgress 变量
  prepareFreshStack(root);

  do {
    try {
      // 深度优先遍历
      workLoop();
      break;
    } catch (e) {
      if (__DEV__) {
        console.warn("workLoop发生错误", e);
      }
      workInProgress = null;
    }
  } while (true);
  // 创建根 Fiber 树的 Root Fiber
  const finishedWork = root.current.alternate;
  // 提交阶段的入口函数
  root.finishedWork = finishedWork;
  console.log("finishedWork", finishedWork); // wip fiberNode的树，以及树中flags
  commitRoot(root);
}

function commitRoot(root: FiberRootNode) {
  const finishedWork = root.finishedWork;
  if (finishedWork === null) {
    return;
  }

  if (__DEV__) {
    console.warn("commit阶段开始", finishedWork);
  }

  //重置
  root.finishedWork = null;

  //判断三个子阶段需要执行的操作
  //root flags root subtreeFlags
  const subtreeHasEffect =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

  if (subtreeHasEffect || rootHasEffect) {
    // TODO: BeforeMutation

    //mutation Placement
    commitMutationEffects(finishedWork);
    // Fiber 树切换，workInProgress 变成 current
    root.current = finishedWork;
    // TODO: Layout
  } else {
    root.current = finishedWork;
  }
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
  //调度功能
  //fiberRootNode
  const root: FiberRootNode = markUpdateFromFiberToRoot(fiber);

  renderRoot(root);
}

// 从触发更新的节点向上遍历到 FiberRootNode
function markUpdateFromFiberToRoot(fiber: FiberNode) {
  let node = fiber;
  let parent = node.return;
  while (parent !== null) {
    node = parent;
    parent = node.return;
  }
  if (node.tag === HostRoot) {
    return node.stateNode;
  }
  return null;
}

// 深度优先遍历，向下递归子节点
function workLoop() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(fiber: FiberNode) {
  // 比较并返回子 FiberNode
  const next = beginWork(fiber);

  fiber.memoizedProps = fiber.pendingProps;
  if (next === null) {
    // 没有子节点，则遍历兄弟节点或父节点
    completeUnitOfWork(fiber);
  } else {
    // 有子节点，继续向下深度遍历
    workInProgress = next;
  }
}

// 深度优先遍历兄弟节点或父节点
function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber;
  do {
    // 生成更新计划
    completeWork(node);
    // 有兄弟节点，则遍历兄弟节点
    const sibling = node.sibling;
    if (sibling !== null) {
      workInProgress = sibling;
      return;
    }
    // 否则向上返回，遍历父节点
    node = node.return;
    workInProgress = node;
  } while (node !== null);
}

// 其中 reconcileChildren 函数的作用是，通过对比子节点的 current FiberNode 与 子节点的 ReactElement，来生成子节点对应的 workInProgress FiberNode。
// （current 是与视图中真实 UI 对应的 Fiber 树，workInProgress 是触发更新后正在 Reconciler 中计算的 Fiber 树。）
