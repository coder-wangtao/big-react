export type Flags = number;

export const NoFlags = 0b0000000;
export const Placement = 0b0000001; //插入
export const Update = 0b0000010;
export const ChildDeletion = 0b0000100;

export const PassiveEffect = 0b0001000; //当前fiber更新时需要触发effect
//对于fiber来说，新增PassiveEffect，代表当前fiber本次更新存在副作用
export const Ref = 0b0010000;

export const Visibility = 0b0100000;

// 捕获到 something
export const DidCapture = 0b1000000;

// unwind应该捕获、还未捕获到
export const ShouldCapture = 0b1000000000000;

export const MutationMask =
  Placement | Update | ChildDeletion | Ref | Visibility;
export const LayoutMask = Ref;

export const PassiveMask = PassiveEffect | ChildDeletion; //当前fiber更新时需要触发effect

export const HostEffectMask =
  MutationMask | LayoutMask | PassiveMask | DidCapture;
