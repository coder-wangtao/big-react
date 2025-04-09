function flushWork(hasTimeRemaining, initialTime) {
  return workLoop(hasTimeRemaining, initialTime);
}

var currentTask;

function workLoop(hasTimeRemaining, initialTime) {
  currentTask = taskQueue[0];
  while (currentTask != null) {
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
  if (currentTask !== null) {
    return true;
  } else {
    return false;
  }
}

// 默认的时间切片
const frameInterval = 5;

function shouldYieldToHost() {
  const timeElapsed = getCurrentTime() - startTime;
  if (timeElapsed < frameInterval) {
    return false;
  }

  return true;
}
