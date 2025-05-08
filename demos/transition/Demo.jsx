import { useState, useTransition } from "react";
import ReactDOM from "react-dom";

//debounce，使得连续输入触发的更新，只在最后一次输入发生时才真正开始处理
// 防抖 - debounce，本质上是延迟了 react 更新操作。该方式存在一些不足：
// 会出现用户输入长时间得不到响应的情况；
// 更新操作正式开始以后，渲染引擎仍然会被长时间阻塞，依旧会存在页面卡死的情况
function debounce(func, wait, immediate) {
  let timer = null;

  return function () {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    const _arguments = arguments;
    if (immediate && !timer) {
      func.apply(_this, _arguments);
    }

    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = null; // 执行后置空
      if (!immediate) func.apply(_this, _arguments);
    }, wait);
  };
}

//func 执行方法
//wait 节流时间
function throttle(func, wait) {
  let timer = null;
  return function () {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    const _arguments = arguments;
    if (!timer) {
      timer = setTimeout(function () {
        func.apply(_this, _arguments);
        timer = null;
      }, wait);
    }
  };
}

//但使用节流 - throttle，依然会存在问题:
//到达指定时间后，更新开始处理，渲染引擎会被长时间阻塞，页面交互会出现卡顿；
//throttle 的最佳时间，一般是根据开发人员所使用的设备来配置的。而这个配置好的时间，针对某些设备比较差的用户来说，并不一定能起作用，无法起到优化的效果。

// 综上，尽管使用防抖、节流，能在一定程度上改善交互效果，但是治标不治本，依旧会出现页面卡顿甚至卡死的情况。
// 究其原因，是因为示例中 react 更新时 fiber tree 协调花费时间过长且不可中断，
// 导致 js 引擎长时间占据浏览器主线程，使得渲染引擎被长时间阻塞。

// 使用 useTransition 时，react 会以 Concurrent 模式来协调 fiber tree。Concurrent 模式下，协调过程是并行可中断的，
// 渲染进程不会长时间被阻塞，使得用户操作可以及时得到响应，极大提升了用户体验。

// 更新协调过程是可中断的，渲染引擎不会长时间被阻塞，用户可以及时得到响应；
// 不需要开发人员去做额外的考虑，整个优化过程交给 react 和浏览器即可；

//当通过 startTransiton(() => setState(xxx)) 的方式触发更新时， react 就会采用 Concurrent 模式来协调 fiber tree。
//setState 触发更新时，react 都会为更新安排一个 task。触发更新的上下文不同，导致生成的 task 的优先级不同，相应的 task 的处理顺序也不相同。
//当通过 startTransition 的方式触发更新时，更新对应的优先级等级为 NormalPriority。而在 NormalPriority 之上，
// 还存在 ImmediatePriority 、UserBlockingPriority 这两种级别更高的更新。通常，高优先级的更新会优先级处理，
// 这就使得尽管 transition 更新先触发，但并不会在第一时间处理，而是处于 pending - 等待状态。
// 只有没有比 transition 更新优先级更高的更新存在时，它才会被处理。
//针对这种情况，我们可以使用 useTransition 返回的 isPending 来展示 transition 更新的状态。
// 当 isPending 为 ture 时，表示 transition 更新还未被处理，此时我们可以显示一个中间状态来优化用户体验；
// 当 isPending 为 false 时, 表示 transition 更新被处理，此时就可以显示实际需要的内容。
// startTransiton 在类组件中用
function Demo() {
  const [value, setValue] = useState("");

  const handleChange = () => {
    startTransition(() => setValue((v) => v + "1"));
  };
  const [isPending, startTransition] = useTransition();

  //   useLayoutEffect(() => {
  // var container = document.getElementsByClassName("container");
  // var list = document.getElementsByClassName("list");
  // if (list.length) {
  //   container[0].removeChild(list[0]);
  // }
  //   });

  return (
    <div className="container">
      <button onClick={handleChange}>{value}</button>
      <>
        {Array(1000)
          .fill("a")
          .map((item) => (
            <div>{value}</div>
          ))}
      </>
      {/* <div className="list">
        {Array(50000)
          .fill("a")
          .map((item) => (
            <div>{value}</div>
          ))}
      </div> */}
    </div>
  );
}

const root = ReactDOM.createRoot(document.querySelector("#root"));

root.render(<Demo />);
