import { Container } from "hostConfig";
import { FiberNode, FiberRootNode } from "./fiber";
import { HostRoot } from "./workTags";
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  UpdateQueue,
} from "./updateQueue";
import { ReactElementType } from "shared/ReactTypes";
import { scheduleUpdateOnFiber } from "./workLoop";

// createContainer 函数: 用于创建一个新的容器（container），该容器包含了 React 应用的根节点以及与之相关的一些配置信息。
// createContainer 函数会创建一个新的 Root 对象，该对象用于管理整个 React 应用的状态和更新。
export function createContainer(container: Container) {
  const hostRootFiber = new FiberNode(HostRoot, {}, null); //根节点FiberNode
  const root = new FiberRootNode(container, hostRootFiber); //根元素、根节点FiberNode
  hostRootFiber.updateQueue = createUpdateQueue();
  return root;
}

// updateContainer 函数: 用于更新已经存在的容器中的内容。在内部，updateContainer
// 函数会调用 scheduleUpdateOnFiber 等方法，通过 Fiber 架构中的协调更新过程，
// 将新的 React 元素（element）渲染到容器中，并更新整个应用的状态。

export function updateContainer(
  element: ReactElementType | null,
  root: FiberRootNode,
) {
  const hostRootFiber = root.current;
  const update = createUpdate<ReactElementType | null>(element);

  //入队
  enqueueUpdate(
    hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
    update,
  );

  scheduleUpdateOnFiber(hostRootFiber);
  return element;
}
