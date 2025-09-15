// 引入最小堆封装代码
import { push, pop, peek } from "./SchedulerMinHeap";

// 浏览器提供的 API，获取从 time origin（当前文档生命周期的开始节点时间） 之后到当前调用时经过的时间，
// 它以一个恒定的速率慢慢增加的，不会受到系统时间的影响，具体参考：https://juejin.cn/post/7171633315336683528
const getCurrentTime = () => performance.now();

// Scheduler 优先级划分，数字越小优先级越高，0 表示没有优先级
export const NoPriority = 0;
export const ImmediatePriority = 1;
export const UserBlockingPriority = 2;
export const NormalPriority = 3;
export const LowPriority = 4;
export const IdlePriority = 5;

// Scheduler 根据优先级设置的对应 timeout 时间，越小越紧急
// 在 React 中，任务是可以被打断的，但是任务不能一直被打断，所以要设置一个超时时间，过了这个时间就必须立刻执行
// timeout 就表示超时时间
const IMMEDIATE_PRIORITY_TIMEOUT = -1; //ms
const USER_BLOCKING_PRIORITY_TIMEOUT = 250; //ms
const NORMAL_PRIORITY_TIMEOUT = 5000; //ms
const LOW_PRIORITY_TIMEOUT = 10000; //ms
// 为什么是 1073741823，查看：https://juejin.cn/post/7171633315336683528
const IDLE_PRIORITY_TIMEOUT = 1073741823;

// 普通任务队列，它是一个最小堆结构，最小堆查看：https://juejin.cn/post/7168283003037155359
const taskQueue = [] as any[];

// 延时任务队列，它同样是一个最小堆结构
const timerQueue = [] as any[];

// taskId
let taskIdCounter = 1;

// 任务队列是否正在被遍历执行，workLoop 执行前为 true，执行完成后改为 false
let isPerformingWork = false;
// 是否有正在执行的 requestHostCallback，它会在 requestHostCallback 调用前设为 true，workLoop 执行前改为 false
let isHostCallbackScheduled = false;
// 是否有正在执行的 requestHostTimeout，它会在 requestHostTimeout 执行前设为 true，cancenlHostTimeout 和 handleTimeout 中设为 false
let isHostTimeoutScheduled = false;
// message loop 是否正在执行，它会在 schedulePerformWorkUntilDeadline 前设为 true，在任务队列执行完毕后设为 false
let isMessageLoopRunning = false;

// 记录 requestHostCallback 执行时传入的 callback 函数，也就是 flushWork
let scheduledHostCallback = null as any;

// 用于 cancelHostTimeout 取消 requestHostTimeout
let taskTimeoutID = -1;

// 记录当前正在执行的任务
let currentTask = null;
let currentPriorityLevel = NormalPriority;

// 这里是调度的开始
//scheduleCallback
export function unstable_scheduleCallback(
  priorityLevel: any,
  callback: any,
  options: any,
) {
  const currentTime = getCurrentTime();

  // 任务被安排调度的时间，相当于去银行时的点击排号机器的那个时间
  let startTime;
  if (typeof options === "object" && options !== null) {
    const delay = options.delay;
    if (typeof delay === "number" && delay > 0) {
      startTime = currentTime + delay;
    } else {
      startTime = currentTime;
    }
  } else {
    startTime = currentTime;
  }

  // 任务不能一直被打断，timeout 表示这个任务的超时时间
  let timeout;
  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT;
      break;
    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
      break;
    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT;
      break;
    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT;
      break;
    case NormalPriority:
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT;
      break;
  }

  // 任务的过期时间 = 开始调度的时间 + 超时时间  （这个值越小，说明越快过期，任务越紧急，越要优先执行。）
  const expirationTime = startTime + timeout;

  // 这就是储存在任务队列（taskQueue 和 timerQueue）中的任务对象

  const newTask = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1, //它的 sortIndex，它就是任务排序的 key 值，这个值越小，在排序中就会越靠前。
  };

  // 那判断大小的依据是什么呢？就是根据 newTask 的 sortIndex 字段，它的初始值是 -1，
  // 在这段代码里，如果是普通任务，使用 expirationTime 作为 sortIndex 字段，如果是延时任务
  // ，则使用 startTime 作为 sortIndex 字段。这个很好理解，任务都已经排上了，那就用过期时间，过期时间越小，
  // 说明离现在越近，任务优先级越高，而延时任务，表示任务还没有排上，那就用排上的时间作为排序字段，等排上了，
  // React 其实会将任务从 timerQueue 中移到 taskQueue 中。

  // 如果 startTime > currentTime，说明是延时任务，将其放到 timerQueue
  if (startTime > currentTime) {
    newTask.sortIndex = startTime;
    // 这个 push 是封装的最小堆 push 方法，将元素追加到数组后，它会再进行一个排序，保证最小值在数组的第一个
    push(timerQueue, newTask);
    // peek(taskQueue) 获取 taskQueue 的第一个任务，因为是最小堆结构，获取的是最紧急的任务
    // 这个逻辑是在 taskQueue 为空的情况下才会调用，这是因为 taskQueue 不为空的情况下，它会在每个任务执行的时候都会遍历一下 timerQueue，
    // 将到期的任务移到 taskQueue
    // newTask === peek(timerQueue) 表示新创建的任务就是最早的要安排调度的延时任务
    //忽略
    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      // //如果 taskQueue 没有任务，并且创建的这个任务就是最早的延时任务，那就执行 cancelHostTimeout
      // // 保证最多只有一个 requestHostTimeout 在执行
      if (isHostTimeoutScheduled) {
        cancelHostTimeout();
      } else {
        isHostTimeoutScheduled = true;
      }
      // // requestHostTimeout 本质是一个 setTimeout，时间到后，执行 handleTimeout
      requestHostTimeout(handleTimeout, startTime - currentTime);
    }
  }
  // 如果是正常任务，将其放到 taskQueue
  else {
    newTask.sortIndex = expirationTime;
    push(taskQueue, newTask);
    // 如果没有正在执行的 requestHostCallback 并且任务队列也没有被执行
    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      //requestIdleCallback
      requestHostCallback(flushWork);
    }
  }

  return newTask;
}

//------------------------------------------------------------------------------------------
// 你可以把这个函数理解为 requestIdleCallback，都实现了空闲时期执行代码
function requestHostCallback(callback: any) {
  // 将 callback 函数存为全局变量，传入的是 flushWork 这个函数
  scheduledHostCallback = callback;
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    schedulePerformWorkUntilDeadline();
  }
}

const channel = new MessageChannel();
const port = channel.port2;
channel.port1.onmessage = performWorkUntilDeadline;
//让出线程，告诉浏览器登空闲了再执行任务队列
function schedulePerformWorkUntilDeadline() {
  port.postMessage(null);
}

// 批量任务的开始时间
// React 并不是每一个任务执行完都执行 schedulePerformWorkUntilDeadline 让出线程的，而是执行完一个任务，
// 看看过了多久，如果时间不超过 5ms，那就再执行一个任务，等做完一个任务，发现过了 5ms，
// 这才让出线程，所以 React 是一批一批任务执行的，startTime 记录的是这一批任务的开始时间，而不是单个任务的开始时间。
let startTime = -1;
////通知浏览器等忙完自己的事情，再执行 performWorkUntilDeadline。
function performWorkUntilDeadline() {
  // scheduledHostCallback 就是 flushWork 这个函数
  if (scheduledHostCallback !== null) {
    const currentTime = getCurrentTime();
    startTime = currentTime;
    const hasTimeRemaining = true;
    let hasMoreWork = true;
    try {
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
    } finally {
      if (hasMoreWork) {
        //让出线程，告诉浏览器登空闲了再执行任务队列
        schedulePerformWorkUntilDeadline();
      } else {
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      }
    }
  } else {
    isMessageLoopRunning = false;
  }
}
//------------------------------------------------------------------------------------------

function flushWork(hasTimeRemaining: any, initialTime: any) {
  isHostCallbackScheduled = false;

  // 定时器的目的表面上是为了保证最早的延时任务准时安排调度，实际上是为了保证 timerQueue 中的任务都能被执行。
  // 定时器到期后，我们会执行 advanceTimers 和 flushWork，flushWork 中会执行 workLoop，
  // workLoop 中会将 taskQueue 中的任务不断执行，当 taskQueue 执行完毕后，
  // workLoop 会选择 timerQueue 中的最早的任务重新设置一个定时器。所以如果 flushWork 执行了，定时器也就没有必要了，所以可以取消了。
  if (isHostTimeoutScheduled) {
    isHostTimeoutScheduled = false;
    cancelHostTimeout();
  }

  isPerformingWork = true;
  const previousPriorityLevel = currentPriorityLevel;
  try {
    return workLoop(hasTimeRemaining, initialTime);
  } finally {
    currentTask = null;
    currentPriorityLevel = previousPriorityLevel;
    isPerformingWork = false;
  }
}

// 遍历 taskQueue，执行任务
function workLoop(hasTimeRemaining: any, initialTime: any) {
  let currentTime = initialTime;
  // 检查 timerQueue 中的任务，将到期的任务转到 taskQueue 中
  advanceTimers(currentTime);
  currentTask = peek(taskQueue);

  while (currentTask !== null) {
    // 如果任务还没有到过期时间并且 shouldYieldToHost 返回 true
    if (currentTask.expirationTime > currentTime && shouldYieldToHost()) {
      break;
    }
    // 获取任务执行函数
    const callback = currentTask.callback;
    if (typeof callback === "function") {
      currentTask.callback = null;
      currentPriorityLevel = currentTask.priorityLevel;
      // 该任务执行的时候是否已经过期
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime; //已过期
      // 任务函数执行
      //如果回调函数返回的是一个新的函数（即continuationCallback）继续执行任务
      const continuationCallback = callback(didUserCallbackTimeout);
      currentTime = getCurrentTime();
      //继续执行任务
      if (typeof continuationCallback === "function") {
        currentTask.callback = continuationCallback;
      }
      // 这个任务执行完毕
      else {
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue);
        }
      }
      // 检查任务队列
      advanceTimers(currentTime);
    }
    // 说明任务执行完毕
    else {
      pop(taskQueue);
    }
    // 执行下一个任务
    currentTask = peek(taskQueue);
  }

  //任务已经过期了（下一次就要执行这个任务） 或者  让出线程（时间超过5秒）

  if (currentTask !== null) {
    return true;
  } else {
    //我们执行完任务，如果 taskQueue 为空，并且 timerQueue 中还有任务，那我们就再创建一个定时器。
    const firstTimer = peek(timerQueue);
    if (firstTimer !== null) {
      requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
    }
    return false;
  }
}

// 检查 timerQueue 中的任务，将到期的任务转到 taskQueue 中
function advanceTimers(currentTime: any) {
  let timer = peek(timerQueue);
  while (timer !== null) {
    // 任务被取消了
    if (timer.callback === null) {
      pop(timerQueue);
    }
    // //任务到期就转到 taskQueue 中
    else if (timer.startTime <= currentTime) {
      pop(timerQueue);
      timer.sortIndex = timer.expirationTime;
      push(taskQueue, timer);
    } else {
      return;
    }
    timer = peek(timerQueue);
  }
}

export function getFirstCallbackNode() {
  return peek(taskQueue);
}

// 默认时间切片为 5ms
const frameInterval = 5;

// 判断是否让出线程，主要看这批任务自开始过了多久，超过了切片时间，就让出线程
export function shouldYieldToHost() {
  const timeElapsed = getCurrentTime() - startTime;
  if (timeElapsed < frameInterval) {
    return false;
  }

  return true;
}

// requestHostTimeout 就是一个 setTimeout 的封装，所谓延时任务，就是一个延时安排调度的任务，
// 怎么保证在延时时间达到后立刻安排调度呢?React 就用了 setTimeout，计算 startTime - currentTime 来实现，
// 我们也可以想出，handleTimeout 的作用就是安排调度。
function requestHostTimeout(callback: any, ms: any) {
  taskTimeoutID = setTimeout(() => {
    callback(getCurrentTime());
  }, ms);
}

function cancelHostTimeout() {
  clearTimeout(taskTimeoutID);
  taskTimeoutID = -1;
}

export function cancelCallback(task: any) {
  task.callback = null;
}

function handleTimeout(currentTime: any) {
  isHostTimeoutScheduled = false;
  advanceTimers(currentTime);

  if (!isHostCallbackScheduled) {
    if (peek(taskQueue) !== null) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
    // 延时任务可能被取消了
    else {
      const firstTimer = peek(timerQueue);
      if (firstTimer !== null) {
        requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
      }
    }
  }
}

//普通任务
// 当创建一个调度任务的时候（unstable_scheduleCallback），会传入优先级（priorityLevel）、执行函数（callback），可选项（options），
// React 会根据任务优先级创建 task 对象，并根据可选项中的 delay 参数判断是将任务放到普通任务队列（taskQueue），还是延时任务队列（timerQueue）。
// 当放到普通任务队列后，便会执行 requestHostCallback(flushWork)，requestHostCallback 的作用是借助 Message Channel 将线程让出来，
// 让浏览器可以处理动画或者用户输入，当浏览器空闲的时候，便会执行 flushWork 函数，flushWork 的作用是执行任务队列里的任务，它会执行 advanceTimers，
// 不断地将 timerQueue 中到期的任务添加到 taskQueue，它会执行 taskQueue 中优先级最高的任务，当任务函数执行完毕之后，它会判断过了多久，
// 如果时间还没有到一个切片时间（5ms），便会执行队列里的下个优先级最高的任务，一直到超出切片时间，当超出时间之后，React 会让出线程，
// 等待浏览器下次继续执行 flushWork，也就是再次遍历执行任务队列，直到任务队列中的任务全部完成。

//延时任务
// 在 Scheduler 中，最多只有一个定时器在执行（requestHostTimeout），时间为所有延时任务中延时时间最小的那个，如果创建的新任务是最小的那个，
// 那就取消掉之前的，使用新任务的延时时间再创建一个定时器，定时器到期后，我们会将该任务安排调度（handleTimeout）
// 但这个逻辑只在 taskQueue 没有任务的时候，如果 taskQueue 有任务呢？
// 如果 taskQueue 有任务，在每个任务完成的时候，React 都会调用 advanceTimers ，检查 timerQueue 中到期的延时任务，将其转移到 taskQueue 中，
// 所以没有必要再检查一遍了。
// 总结一下：如果 taskQueue 为空，我们的延时任务会创建最多一个定时器，在定时器到期后，将该任务安排调度（将任务添加到 taskQueue 中）。
// 如果 taskQueue 列表不为空，我们在每个普通任务执行完后都会检查是否有任务到期了，然后将到期的任务添加到 taskQueue 中。
// 但这个逻辑里有一个漏洞：
// 我们新添加一个普通任务，假设该任务执行时间为 5ms，再添加一个延时任务，delay 为 10ms。
// 因为创建延时任务的时候 taskQueue 中有值，所以不会创建定时器，当普通任务执行完毕后，我们执行 advanceTimers，因为延时任务没有到期，
// 所以也不会添加到 taskQueue 中，那么这个延时任务就不会有定时器让它准时进入调度。如果没有新的任务出现，它永远都不会执行。
