export type WorkTag =
  | typeof FunctionComponent
  | typeof HostRoot
  | typeof HostComponent
  | typeof HostText
  | typeof Fragment;

export const FunctionComponent = 0;
export const HostRoot = 3; //根节点

export const HostComponent = 5; //<div></div>
export const HostText = 6; //<div>123</div> 下的123
export const Fragment = 7;
