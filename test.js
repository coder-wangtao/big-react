// 避免在空闲回调中改变 DOM
// 空闲回调执行的时候，当前帧已经结束绘制了，所有布局的更新和计算也已经完成。如果你做的改变影响了布局，
// 你可能会强制停止浏览器并重新计算，而从另一方面来看，这是不必要的。如果你的回调需要改变 DOM，它应该使用Window.requestAnimationFrame()来调度它。

let taskHandle = null;

const sleep = (delay) => {
  for (let start = Date.now(); Date.now() - start <= delay; ) {}
};

let taskList = [
  () => {
    console.log("task1");
    sleep(50);
  },
  () => {
    console.log("task2");
    sleep(50);
  },
  () => {
    console.log("task3");
    sleep(50);
  },
];

function runTaskQueue(deadline) {
  console.log(`deadline: ${deadline.timeRemaining()}_ ${taskList.length}`);
  if (
    (deadline.timeRemaining() > 0 || deadline.didTimeout) &&
    taskList.length
  ) {
    let task = taskList.shift();
    task();
  }

  if (taskList.length) {
    taskHandle = requestIdleCallback(runTaskQueue, { timeout: 1000 });
  } else {
    taskHandle = 0;
  }
}

requestIdleCallback(runTaskQueue, { timeout: 1000 });
