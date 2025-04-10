// Polyfill requestIdleCallback.
var scheduledRICCallback = null;
var frameDeadline = 0;
// 假设 30fps，一秒就是 33ms
var activeFrameTime = 33;

var frameDeadlineObject = {
  timeRemaining: function () {
    return frameDeadline - performance.now();
  },
};

var idleTick = function (event) {
  scheduledRICCallback(frameDeadlineObject);
};

window.addEventListener("message", idleTick, false);

var animationTick = function (rafTime) {
  frameDeadline = rafTime + activeFrameTime;
  window.postMessage("__reactIdleCallback$1", "*");
};

var rIC = function (callback) {
  scheduledRICCallback = callback;
  requestAnimationFrame(animationTick);
  return 0;
};
