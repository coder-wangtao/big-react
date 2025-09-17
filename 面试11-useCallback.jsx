//虽然Cpn用memo包裹，bailout策略中对于Cpn的props是浅比较，但是由于更新是生成的addOne是一个全新的函数(对象)，即使Cpn的props是浅比较，
//两次比较props也是不一样的，所以无法命中bailout策略
//但是用useCallback缓存这个函数就不一样了，此时两次比较props是一样的，所以可以命中bailout策略

import { useState, memo, useCallback } from "react";
import ReactDOM from "react-dom";

export default function App() {
  const [num, update] = useState(0);
  console.log("App render ", num);

  const addOne = useCallback(() => update((num) => num + 1), []);

  return (
    <div>
      <Cpn onClick={addOne} />
      {num}
    </div>
  );
}

const Cpn = memo(function ({ onClick }) {
  console.log("Cpn render");
  return (
    <div onClick={() => onClick()}>
      <Child />
    </div>
  );
});

function Child() {
  console.log("Child render");
  return <p>i am child</p>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
