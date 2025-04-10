// 用于模拟代码执行耗费时间
const sleep = (delay) => {
  for (let start = Date.now(); Date.now() - start <= delay; ) {}
};

// performWorkUntilDeadline 的执行时间，也就是一次批量任务执行的开始时间，通过现在的时间 - startTime，来判断是否超过了切片时间
let startTime;

let scheduledHostCallback;
let isMessageLoopRunning = false;
let getCurrentTime = () => performance.now();

const taskQueue = [
  {
    expirationTime: 1000000,
    callback: () => {
      sleep(30);
      console.log(1);
    },
  },
  {
    expirationTime: 1000000,
    callback: () => {
      sleep(30);
      console.log(2);
    },
  },
  {
    expirationTime: 1000000,
    callback: () => {
      sleep(30);
      console.log(3);
    },
  },
];

//----------------------------------------------------------------------------
//requestHostCallback其实就是requestIdleCallback
function requestHostCallback(callback) {
  scheduledHostCallback = callback;
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    schedulePerformWorkUntilDeadline();
  }
}

const channel = new MessageChannel();
const port = channel.port2;

//通知浏览器等忙完自己的事情，再执行 performWorkUntilDeadline。
function performWorkUntilDeadline() {
  if (scheduledHostCallback !== null) {
    const currentTime = getCurrentTime();
    startTime = currentTime;
    const hasTimeRemaining = true;

    let hasMoreWork = true;
    try {
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
    } finally {
      // console.log("hasMoreWork", hasMoreWork);
      if (hasMoreWork) {
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

channel.port1.onmessage = performWorkUntilDeadline;

//它只做了一件事情，就是 postMessage，
let schedulePerformWorkUntilDeadline = () => {
  port.postMessage(null);
};
//----------------------------------------------------------------------------

function flushWork(hasTimeRemaining, initialTime) {
  return workLoop(hasTimeRemaining, initialTime);
}

let currentTask;

function workLoop(hasTimeRemaining, initialTime) {
  //initialTime: postMessage 的消息时执行 performWorkUntilDeadline 函数的时间
  currentTask = taskQueue[0];
  while (currentTask != null) {
    // console.log(currentTask);
    if (
      currentTask.expirationTime > initialTime &&
      (!hasTimeRemaining || shouldYieldToHost())
    ) {
      break;
    }

    const callback = currentTask.callback;
    callback();

    taskQueue.shift();

    currentTask = taskQueue[0];
  }

  if (currentTask != null) {
    return true;
  } else {
    return false;
  }
}

const frameInterval = 5;

function shouldYieldToHost() {
  const timeElapsed = getCurrentTime() - startTime;
  if (timeElapsed < frameInterval) {
    return false;
  }
  return true;
}

requestHostCallback(flushWork);
