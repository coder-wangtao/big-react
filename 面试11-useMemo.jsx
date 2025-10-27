import { useState, useContext, createContext, useMemo, memo } from "react";
import ReactDOM from "react-dom";

//无性能优化,父组件更新，子组件也会更新
function App() {
  const [num, update] = useState(0);
  console.log("App render", num);

  return (
    <div title={num}>
      <button onClick={() => update(num + 1)}>+1</button>
      <p>num is: {num}</p>
      <ExpensiveSubtree />
    </div>
  );
}

function ExpensiveSubtree() {
  console.log("Expensive render");
  return <p>i am child</p>;
}

// 方式1：App提取 bailout四要素

function AppOne() {
  console.log("App render");
  return (
    <div>
      <Num />
      <ExpensiveSubtreeOne />
    </div>
  );
}

function ExpensiveSubtreeOne() {
  console.log("Expensive render");
  return <p>i am child</p>;
}

function Num() {
  const [num, update] = useState(0);
  return (
    <>
      <button onClick={() => update(num + 1)}>+1</button>
      <p>num is: {num}</p>
    </>
  );
}

// 方式2：ExpensiveSubtree用memo包裹
function AppTwo() {
  const [num, update] = useState(0);
  console.log("App render", num);

  return (
    <div title={num}>
      <button onClick={() => update(num + 1)}>+1</button>
      <p>num is: {num}</p>
      <ExpensiveSubtreeTwo />
    </div>
  );
}

const ExpensiveSubtreeTwo = memo(() => {
  console.log("Expensive render");
  return <p>i am child</p>;
});

//3.手动bailout ExpensiveSubtreeThree满足了bailout四要素
// const showHeader = useMemo(() => {
//     direction === 'horizontal' && header;
// }, [direction, header]);
function AppThree() {
  const [num, update] = useState(0);
  console.log("App render ", num);

  const Cpn = useMemo(() => <ExpensiveSubtreeThree />, []);

  return (
    <div onClick={() => update((n) => n + 100)}>
      <p>num is: {num}</p>
      {Cpn}
    </div>
  );
}

function ExpensiveSubtreeThree() {
  console.log("ExpensiveSubtree render");
  return <p>i am child</p>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

export default App;
