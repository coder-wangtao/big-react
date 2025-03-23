import {
  appendChildToContainer,
  Container,
  commitUpdate,
  removeChild,
  Instance,
  insertChildToContainer,
} from "hostConfig";
import { FiberNode, FiberRootNode } from "./fiber";
import {
  ChildDeletion,
  MutationMask,
  NoFlags,
  Placement,
  Update,
} from "./fiberFlags";
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./workTags";

let nextEffect: FiberNode | null = null;

// commitMutationEffects 函数负责深度优先遍历 Fiber 树，递归地向下寻找子节点是否存在 Mutation 阶段需要执行的 flags，
// 如果遍历到某个节点，其所有子节点都不存在 flags（即 subtreeFlags == NoFlags），则停止向下，
// 调用 commitMutationEffectsOnFiber 处理该节点的 flags，并且开始遍历其兄弟节点和父节点。

// commitMutationEffectsOnFiber 会根据每个节点的 flags 和更新计划中的信息执行相应的 DOM 操作。

// 以 Placement 为例：如果 Fiber 节点的标志中包含 Placement，表示需要在 DOM 中插入新元素，
// 此时就需要取到该 Fiber 节点对应的 DOM，并将其插入对应的父 DOM 节点中。
export const commitMutationEffects = (finishedWork: FiberNode) => {
  nextEffect = finishedWork;

  // 深度优先遍历 Fiber 树，寻找更新 flags
  while (nextEffect !== null) {
    //向下遍历
    const child: FiberNode | null = nextEffect.child;

    if (
      (nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
      child !== null
    ) {
      // 子节点存在 mutation 阶段需要执行的 flags
      nextEffect = child;
    } else {
      //向上遍历DFS
      // 子节点不存在 mutation 阶段需要执行的 flags 或没有子节点
      // 向上遍历

      up: while (nextEffect !== null) {
        // 处理 flags
        commitMutationEffectsOnFiber(nextEffect);
        const sibling: FiberNode | null = nextEffect.sibling;
        // 遍历兄弟节点
        if (sibling !== null) {
          nextEffect = sibling;
          break up;
        }
        // 遍历父节点
        nextEffect = nextEffect.return;
      }
    }
  }
};

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
  const flags = finishedWork.flags;
  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork);
    finishedWork.flags &= ~Placement;
  }
  if ((flags & Update) !== NoFlags) {
    // TODO Update
    commitUpdate(finishedWork);
    finishedWork.flags &= ~Update;
  }
  if ((flags & ChildDeletion) !== NoFlags) {
    const deletions = finishedWork.deletions;
    if (deletions !== null) {
      deletions.forEach((childToDelete) => {
        commitDeletion(childToDelete);
      });
    }
    finishedWork.flags &= ~ChildDeletion;
  }
};

function recordHostChildrenToDelete(
  childrenToDelete: FiberNode[],
  unmountFiber: FiberNode,
) {
  // 1. 找到第一个root host节点
  const lastOne = childrenToDelete[childrenToDelete.length - 1];

  if (!lastOne) {
    childrenToDelete.push(unmountFiber);
  } else {
    let node = lastOne.sibling;
    while (node !== null) {
      if (unmountFiber === node) {
        childrenToDelete.push(unmountFiber);
      }
      node = node.sibling;
    }
  }

  // 2. 每找到一个 host节点，判断下这个节点是不是 1 找到那个节点的兄弟节点
}

function commitDeletion(childToDelete: FiberNode) {
  const rootChildrenToDelete: FiberNode[] = [];

  // 递归子树
  commitNestedComponent(childToDelete, (unmountFiber) => {
    switch (unmountFiber.tag) {
      case HostComponent:
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber);
        // safelyDetachRef(unmountFiber);
        return;
      case HostText:
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber);
        return;
      case FunctionComponent:
        // commitPassiveEffect(unmountFiber, root, "unmount");
        return;
      default:
        if (__DEV__) {
          console.warn("未处理的unmount类型", unmountFiber);
        }
    }
  });

  // 移除rootHostComponent的DOM
  if (rootChildrenToDelete.length) {
    const hostParent = getHostParent(childToDelete);
    if (hostParent !== null) {
      rootChildrenToDelete.forEach((node) => {
        removeChild(node.stateNode, hostParent);
      });
    }
  }
  childToDelete.return = null;
  childToDelete.child = null;
}

function commitNestedComponent(
  root: FiberNode,
  onCommitUnmount: (fiber: FiberNode) => void,
) {
  let node = root;
  while (true) {
    onCommitUnmount(node);

    if (node.child !== null) {
      // 向下遍历
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === root) {
      // 终止条件
      return;
    }
    while (node.sibling === null) {
      if (node.return === null || node.return === root) {
        return;
      }
      // 向上归
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}

// 执行 DOM 插入操作，将 FiberNode 对应的 DOM 插入 parent DOM 中
const commitPlacement = (finishedWork: FiberNode) => {
  if (__DEV__) {
    console.warn("执行Placement操作", finishedWork);
  }
  const hostParent = getHostParent(finishedWork);

  const sibling = getHostSibling(finishedWork);

  if (hostParent !== null) {
    insertOrAppendPlacementNodeIntoContainer(finishedWork, hostParent, sibling);
  }
};

/**
 * 难点在于目标fiber的hostSibling可能并不是他的同级sibling
 * 比如： <A/><B/> 其中：function B() {return <div/>} 所以A的hostSibling实际是B的child
 * 实际情况层级可能更深
 * 同时：一个fiber被标记Placement，那他就是不稳定的（他对应的DOM在本次commit阶段会移动），也不能作为hostSibling
 */
function getHostSibling(fiber: FiberNode) {
  let node: FiberNode = fiber;
  findSibling: while (true) {
    while (node.sibling === null) {
      // 如果当前节点没有sibling，则找他父级sibling
      const parent = node.return;
      if (
        parent === null ||
        parent.tag === HostComponent ||
        parent.tag === HostRoot
      ) {
        // 没找到
        return null;
      }
      node = parent;
    }
    node.sibling.return = node.return;
    // 向同级sibling寻找
    node = node.sibling;

    while (node.tag !== HostText && node.tag !== HostComponent) {
      // 找到一个非Host fiber，向下找，直到找到第一个Host子孙
      if ((node.flags & Placement) !== NoFlags) {
        // 这个fiber不稳定，不能用
        continue findSibling;
      }
      if (node.child === null) {
        continue findSibling;
      } else {
        node.child.return = node;
        node = node.child;
      }
    }

    // 找到最有可能的fiber
    if ((node.flags & Placement) === NoFlags) {
      // 这是稳定的fiber，就他了
      return node.stateNode;
    }
  }
}

// 获取 parent DOM
function getHostParent(fiber: FiberNode): Container | null {
  let parent = fiber.return;
  while (parent) {
    const parentTag = parent.tag;
    // 处理原生 DOM 元素节点

    if (parentTag === HostComponent) {
      return parent.stateNode as Container;
    }

    // 处理 Root 节点
    if (parentTag === HostRoot) {
      return (parent.stateNode as FiberRootNode).container;
    }
    parent = parent.return;
  }
  if (__DEV__) {
    console.warn("未找到host parent");
  }

  return null;
}

function insertOrAppendPlacementNodeIntoContainer(
  finishedWork: FiberNode,
  hostParent: Container,
  before?: Instance,
) {
  // fiber host
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    if (before) {
      insertChildToContainer(finishedWork.stateNode, hostParent, before);
    } else {
      appendChildToContainer(hostParent, finishedWork.stateNode);
    }

    return;
  }
  const child = finishedWork.child;
  if (child !== null) {
    insertOrAppendPlacementNodeIntoContainer(child, hostParent);
    let sibling = child.sibling;

    while (sibling !== null) {
      insertOrAppendPlacementNodeIntoContainer(sibling, hostParent);
      sibling = sibling.sibling;
    }
  }
}
