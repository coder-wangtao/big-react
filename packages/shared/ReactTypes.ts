export type Ref = any;
export type ElementType = any;
export type Key = string | null;
export type Props = {
  [key: string]: any;
  children?: ReactElementType;
};

export interface ReactElementType {
  $$typeof: symbol | number;
  type: ElementType;
  key: Key;
  props: Props;
  ref: Ref;
  __mark: "KaSong";
}

export type Action<State> = State | ((prevState: State) => State);
