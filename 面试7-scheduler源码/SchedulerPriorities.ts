export type PriorityLevel = 0 | 1 | 2 | 3 | 4 | 5;

// TODO: Use symbols?
//优先级，数字越小优先级越高
export const NoPriority = 0; ///没有优先级
export const ImmediatePriority = 1; //同步，立即执行
export const UserBlockingPriority = 2; //用户优先级，点击事件
export const NormalPriority = 3; //正常优先级

export const LowPriority = 4; //低优先级
export const IdlePriority = 5; //低优先级
