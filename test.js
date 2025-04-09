// 记录 callback
let scheduledHostCallback;
let isMessageLoopRunning = false;
let getCurrentTime = () => performance.now();
let startTime;

// rIC 更名为 requestHostCallback
function requestHostCallback(callback) {
  scheduledHostCallback = callback;
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    schedulePerformWorkUntilDeadline();
  }
}

const channel = new MessageChannel();
const port = channel.port2; //port2发送消息
channel.port1.onmessage = performWorkUntilDeadline; //port1接受消息

let schedulePerformWorkUntilDeadline = () => {
  port.postMessage(null);
};

function performWorkUntilDeadline() {
  if (scheduledHostCallback !== null) {
    const currentTime = getCurrentTime();
    startTime = currentTime;
    const hasTimeRemaining = true;
    const hasDEe = false;
    let hasMoreWork = true;
    try {
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
    } finally {
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
