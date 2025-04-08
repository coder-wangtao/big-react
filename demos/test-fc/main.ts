import {
  unstable_ImmediatePriority as ImmediatePriority,
  unstable_UserBlockingPriority as UserBlockingPriority,
  unstable_NormalPriority as NormalPriority,
  unstable_LowPriority as LowPriority,
  unstable_IdlePriority as IdlePriority,
  unstable_scheduleCallback as scheduleCallback,
  unstable_shouldYield as shouldYield,
  CallbackNode,
  unstable_getFirstCallbackNode as getFirstCallbackNode,
  unstable_cancelCallback as cancelCallback,
} from "scheduler";

import "./style.css";
const button = document.querySelector("button");
const root = document.querySelector("#root");

type Priority =
  | typeof IdlePriority
  | typeof LowPriority
  | typeof NormalPriority
  | typeof UserBlockingPriority
  | typeof ImmediatePriority;

interface Work {
  count: number;
  priority: Priority;
}

//任务列表，类比为react中的渲染任务
const workList: Work[] = [];
let prevPriority: Priority = IdlePriority;
let curCallback: CallbackNode | null = null;

[LowPriority, NormalPriority, UserBlockingPriority, ImmediatePriority].forEach(
  (priority) => {
    const btn = document.createElement("button");
    root?.appendChild(btn);
    btn.innerText = [
      "",
      "ImmediatePriority",
      "UserBlockingPriority",
      "NormalPriority",
      "LowPriority",
    ][priority];
    btn.onclick = () => {
      workList.unshift({
        count: 100,
        priority: priority as Priority,
      });
      schedule();
    };
  },
);

function schedule() {
  const cbNode = getFirstCallbackNode();

  //当前的任务，把最高优先级的挑选出来
  const curWork = workList.sort((w1, w2) => w1.priority - w2.priority)[0];

  // 策略逻辑
  if (!curWork) {
    curCallback = null;
    cbNode && cancelCallback(cbNode);
    return;
  }

  const { priority: curPriority } = curWork;
  if (curPriority === prevPriority) {
    return;
  }
  // 更高优先级的work
  cbNode && cancelCallback(cbNode);

  //scheduleCallback就是一个宏任务处理器，可以类比为setTimeout，postMessage
  curCallback = scheduleCallback(curPriority, perform.bind(null, curWork));
}

function perform(work: Work, didTimeout?: boolean) {
  /**
   * 1. work.priority
   * 2. 饥饿问题
   * 3. 时间切片
   */

  //shouldYield代表当前浏览器还有没有空闲时间
  //shouldYield()会在while过程中，不断地去计算，此时我们还有没有剩余时间
  //一轮事件循环，留给任务的处理的时间，大概是7 8ms 
  const needSync = work.priority === ImmediatePriority || didTimeout;
  while ((needSync || !shouldYield()) && work.count) {
    work.count--;
    insertSpan(work.priority + "");
  }

  // 中断执行 || 执行完
  prevPriority = work.priority;

  if (!work.count) {
    const workIndex = workList.indexOf(work);
    workList.splice(workIndex, 1);
    prevPriority = IdlePriority;
  }

  const prevCallback = curCallback;
  schedule();
  const newCallback = curCallback;

  //如果当前任务依然是和上一次的优先级一致则继续执行任务
  if (newCallback && prevCallback === newCallback) {
    return perform.bind(null, work);
  }
}

function insertSpan(content) {
  const span = document.createElement("span");
  span.innerText = content;
  span.className = `pri-${content}`;
  doSomeBuzyWork(10000000);
  root?.appendChild(span);
}

function doSomeBuzyWork(len: number) {
  let result = 0;
  while (len--) {
    result += len;
  }
}
