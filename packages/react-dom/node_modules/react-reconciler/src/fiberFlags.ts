export type Flags = number;
export const NoFlags = 0b0000001;
export const Placement = 0b0000010; //跟结构相关
export const Update = 0b0000100; //跟属性相关
export const ChildDeletion = 0b0001000; //跟结构相关


export const MutationMask = Placement | Update | ChildDeletion