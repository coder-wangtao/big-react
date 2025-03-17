export type Flags = number;
export const NoFlags = 0b0000001;
export const Placement = 0b0000010; //跟结构相关
export const Update = 0b0000100; //跟属性相关
export const ChildDeletion = 0b0001000; //跟结构相关

export const MutationMask = Placement | Update | ChildDeletion;

// React 利用了 | 运算符的特性来存储 flags，如：
// const flags = Placement | Update; //此时 flags = 0b0000110

//React 中会用一个 flags & 某一个 flag，来判断 flags 中是否包含某一个 flag，如：
// const flags = Placement | Update; //此时 flags = 0b0000110
// Boolean(flags & Placement); // true, 说明 flags 中包含 Placement
// Boolean(flags & ChildDeletion); // false, 说明 flags 中不包含 ChildDeletion

//在 React 中，~ 运算符同样是常用操作，如：通过 ~ 运算符与 & 运算符的结合，从 flags 中删除了 Placement 这个 flag。
// let flags = Placement | Update; //此时 flags = 0b0000110
// flags &= ~Placement; //此时 flags = 0b0000100
