export type Flags = number;
export const NoFlags = 0b0000000;
export const Placement = 0b0000001; //跟结构相关
export const Update = 0b0000010; //跟属性相关
export const ChildDeletion = 0b0000100; //跟结构相关
// react 会为每个节点打上不同的标记。例如，如果节点需要更新，可能会打上更新标记（Update Tag）；
// 如果节点是新创建的，可能会打上插入标记（Placement Tag）；如果节点被移除，可能会打上删除标记（Deletion Tag）
export const MutationMask = Placement | Update | ChildDeletion;

// React 利用了 | 运算符的特性来存储 flags，如：
// const flags = Placement | Update; //此时 flags = 0b0000011

//React 中会用一个 flags & 某一个 flag，来判断 flags 中是否包含某一个 flag，如：
// const flags = Placement | Update; //此时 flags = 0b0000011
// Boolean(flags & Placement); // true, 说明 flags 中包含 Placement
// Boolean(flags & ChildDeletion); // false, 说明 flags 中不包含 ChildDeletion

//在 React 中，~ 运算符同样是常用操作，如：通过 ~ 运算符与 & 运算符的结合，从 flags 中删除了 Placement 这个 flag。
// let flags = Placement | Update; //此时 flags = 0b0000011
// flags &= ~Placement; //此时 flags = 0b0000010

// 0b1111110
// 0b0000011

// | 添加, &判断是否存在, & ~ 删除
