import { Container } from "hostConfig";
import {
  unstable_ImmediatePriority,
  unstable_runWithPriority,
} from "scheduler";
import { ReactElementType } from "shared/ReactTypes";
import { FiberNode, FiberRootNode } from "./fiber";
import { requestUpdateLane } from "./fiberLanes";
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  UpdateQueue,
} from "./updateQueue";
import { scheduleUpdateOnFiber } from "./workLoop";
import { HostRoot } from "./workTags";

export function createContainer(container: Container) {
  const hostRootFiber = new FiberNode(HostRoot, {}, null);
  const root = new FiberRootNode(container, hostRootFiber);
  hostRootFiber.updateQueue = createUpdateQueue();
  return root;
}

export function updateContainer(
  element: ReactElementType | null,
  root: FiberRootNode,
) {
  //默认是同步更新
  unstable_runWithPriority(unstable_ImmediatePriority, () => {
    const hostRootFiber = root.current;
    const lane = requestUpdateLane(); //同步优先级（首屏渲染）
    //首屏渲染 所需要的更新
    const update = createUpdate<ReactElementType | null>(element, lane); //element是首屏渲染的jsx

    enqueueUpdate(
      hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
      update,
      hostRootFiber,
      lane,
    );

    scheduleUpdateOnFiber(hostRootFiber, lane);
  });
  return element;
}
