import {
  FulfilledThenable,
  PendingThenable,
  RejectedThenable,
  Thenable,
} from "shared/ReactTypes";

//打断render
export const SuspenseException = new Error(
  "这不是个真实的错误，而是Suspense工作的一部分。如果你捕获到这个错误，请将它继续抛出去",
);

//对应的Thenable
let suspendedThenable: Thenable<any> | null = null;

export function getSuspenseThenable(): Thenable<any> {
  if (suspendedThenable === null) {
    throw new Error("应该存在suspendedThenable，这是个bug");
  }
  const thenable = suspendedThenable;
  suspendedThenable = null;
  return thenable;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

//接收到Promise,我们接收到Promise转化成Thenable提供内部使用
export function trackUsedThenable<T>(thenable: Thenable<T>) {
  switch (thenable.status) {
    // 需要自己定义
    case "fulfilled":
      return thenable.value;
    // 需要自己定义
    case "rejected":
      throw thenable.reason;

    default:
      if (typeof thenable.status === "string") {
        thenable.then(noop, noop);
      } else {
        // untracked
        const pending = thenable as unknown as PendingThenable<T, void, any>;
        //pending
        pending.status = "pending";

        pending.then(
          (val) => {
            if (pending.status === "pending") {
              // debugger;
              // @ts-ignore
              const fulfilled: FulfilledThenable<T, void, any> = pending;
              fulfilled.status = "fulfilled";
              fulfilled.value = val;
            }
          },
          (err) => {
            if (pending.status === "pending") {
              // @ts-ignore
              const rejected: RejectedThenable<T, void, any> = pending;
              rejected.reason = err;
              rejected.status = "rejected";
            }
          },
        );
      }
  }
  suspendedThenable = thenable;
  throw SuspenseException;
}
