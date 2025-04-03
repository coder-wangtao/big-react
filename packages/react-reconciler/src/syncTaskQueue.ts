let syncQueue: ((...args: any) => void)[] | null = null;

let isFlushingSyncQueue = false;

export function scheduleSyncCallback(callback: (...args: any) => void) {
  if (syncQueue === null) {
    syncQueue = [callback];
  } else {
    syncQueue.push(callback);
  }
}

//开启 一个微任务
// queueMicrotask(() => {
//   console.log('微任务 2');
// });
export const scheduleMicroTask =
  typeof queueMicrotask === "function"
    ? queueMicrotask
    : typeof Promise === "function"
    ? (callback: (...args: any) => void) => Promise.resolve(null).then(callback)
    : setTimeout;

export function flushSyncCallbacks() {
  if (!isFlushingSyncQueue && syncQueue) {
    isFlushingSyncQueue = true;
    try {
      //实际上就是执行render函数
      syncQueue.forEach((callback) => callback());
    } catch (e) {
      if (__DEV__) {
        console.error("flushSyncCallbacks报错", e);
      }
    } finally {
      isFlushingSyncQueue = false;
      syncQueue = null;
    }
  }
}
