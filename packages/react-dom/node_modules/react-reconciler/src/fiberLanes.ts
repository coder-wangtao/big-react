import ReactCurrentBatchConfig from "react/src/currentBatchConfig";
import {
  unstable_getCurrentPriorityLevel,
  unstable_IdlePriority,
  unstable_ImmediatePriority,
  unstable_NormalPriority,
  unstable_UserBlockingPriority,
} from "scheduler";
import { FiberRootNode } from "./fiber";

export type Lane = number;
export type Lanes = number;

//lane 是一个 32 位的二进制数，每个二进制位表示 1 种优先级，优先级最高的 SyncLane 为 1，其次为 2、4、8 等
export const SyncLane = 0b00001; //1  同步优先级
export const NoLane = 0b00000; //0
export const NoLanes = 0b00000; //0
export const InputContinuousLane = 0b00010; //2
export const DefaultLane = 0b00100; //4
export const TransitionLane = 0b01000; //8
export const IdleLane = 0b10000; //16

export function requestUpdateLane() {
  const isTransition = ReactCurrentBatchConfig.transition !== null;
  if (isTransition) {
    return TransitionLane;
  }

  // 从上下文环境中获取Scheduler优先级
  const currentSchedulerPriority = unstable_getCurrentPriorityLevel();
  const lane = schedulerPriorityToLane(currentSchedulerPriority);
  return lane;
}

//在 React 中，lane 是用来标识更新优先级的位掩码，它可以在频繁运算的时候占用内存少，计算速度快。
// 每个 lane 代表一种优先级级别，React 可以同时处理多个 lane，通过这种方式来管理不同优先级的任务。
//从 lanes 中找出最高优先级的 lane
export function getHighestPriorityLane(lanes: Lanes): Lane {
  return lanes & -lanes;
}

0b0000000011111111111111110000000;

//lane | lane：用于将多个 lane 合并为一个 lanes（取并集）
//lane & lane  用来判断是不是同一个 lane（是否有相同的位为 1，取交集）
//lanes | lane：用来判断 lanes 中是否有 lane（是否有相同的位为 1，取交集）
//lanes & ~lane：用来从 lanes 中删除 lane(取差集)
//lane | lane:用于将多个 lane 合并为一个 lanes(取并集)
//lanes & -lanes   //从 lanes 中找出最高优先级的 lane
//lane *= 2 和 lane <<= 1  都是将 lane 左移一位
//lanes2 |= lanes1 & lane 用于将 lanes1 中的 lane 合并到 lanes2 中(先取交集，再取并集)

// 判断两个 lanes 集合是否是父子集的关系
export function isSubsetOfLanes(set: Lanes, subset: Lane) {
  return (set & subset) === subset;
}

// 合并两个 lanes 集合

export function mergeLanes(laneA: Lane, laneB: Lane): Lanes {
  return laneA | laneB;
}

export function markRootFinished(root: FiberRootNode, lane: Lane) {
  root.pendingLanes &= ~lane;
  root.suspendedLanes = NoLanes;
  root.pingedLanes = NoLanes;
}

export function lanesToSchedulerPriority(lanes: Lanes) {
  const lane = getHighestPriorityLane(lanes);

  if (lane === SyncLane) {
    return unstable_ImmediatePriority;
  }
  if (lane === InputContinuousLane) {
    return unstable_UserBlockingPriority;
  }
  if (lane === DefaultLane) {
    return unstable_NormalPriority;
  }
  return unstable_IdlePriority;
}

export function schedulerPriorityToLane(schedulerPriority: number): Lane {
  if (schedulerPriority === unstable_ImmediatePriority) {
    return SyncLane;
  }
  if (schedulerPriority === unstable_UserBlockingPriority) {
    return InputContinuousLane;
  }
  if (schedulerPriority === unstable_NormalPriority) {
    return DefaultLane;
  }
  return NoLane;
}

export function markRootPinged(root: FiberRootNode, pingedLane: Lane) {
  root.pingedLanes |= root.suspendedLanes & pingedLane;
}

export function markRootSuspended(root: FiberRootNode, suspendedLane: Lane) {
  root.suspendedLanes |= suspendedLane;
  root.pingedLanes &= ~suspendedLane;
}

export function getNextLane(root: FiberRootNode): Lane {
  const pendingLanes = root.pendingLanes;

  if (pendingLanes === NoLanes) {
    return NoLane;
  }
  let nextLane = NoLane;

  // 排除掉挂起的lane
  const suspendedLanes = pendingLanes & ~root.suspendedLanes;
  if (suspendedLanes !== NoLanes) {
    nextLane = getHighestPriorityLane(suspendedLanes);
  } else {
    const pingedLanes = pendingLanes & root.pingedLanes;
    if (pingedLanes !== NoLanes) {
      nextLane = getHighestPriorityLane(pingedLanes);
    }
  }
  return nextLane;
}

export function includeSomeLanes(set: Lanes, subset: Lane | Lanes): boolean {
  return (set & subset) !== NoLanes;
}

export function removeLanes(set: Lanes, subet: Lanes | Lane): Lanes {
  return set & ~subet;
}
