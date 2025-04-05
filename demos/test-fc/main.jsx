import ReactDOM from "react-dom";
import React, { useState } from "react";
import { useEffect } from "react";
function App2() {
  const [num, updateNum] = useState(0);

  const isOdd = num % 2;

  const before = [
    <li key={1}>1</li>,
    <li key={2}>2</li>,
    <li key={3}>3</li>,
    <li key={4}>4</li>,
    <>
      <li key={111}>111</li>
      <li key={222}>222</li>
    </>,
  ];
  const after = [
    <li key={4}>4</li>,
    <li key={2}>2</li>,
    <li key={3}>3</li>,
    <li key={1}>1</li>,
    <>
      <li key={111}>111</li>
      <li key={222}>222</li>
    </>,
  ];

  const listToUse = isOdd ? before : after;

  return (
    <ul
      onClick={(e) => {
        updateNum(num + 1);
      }}
    >
      {listToUse}
    </ul>
  );
}

function App1() {
  const [arr, setArr] = useState(["one", "two", "three"]);
  
  function handleClick() {
    setArr(["three", "two", "one"]);
  }

  return (
    <div>
      <h2 onClick={handleClick}>点我改变数组</h2>
      <ul>
        {arr.map((item) => {
          return <li key={item}>{item}</li>;
        })}
      </ul>
    </div>
  );
}

function App3() {
  // const [num, setNum] = useState(0);

  return (
    <div>
      <span>span</span>
      <p>p</p>
      {/* react 不设置key，react源码中会已index做为key */}
      <ul>
        <li>1</li>
        <li>2</li>
        <li>3</li>
      </ul>
    </div>
  );
}

function App4() {
  const [count, setCount] = useState(0);

  function handle_click() {
    // debugger;
    setCount((count) => {
      return count + 1;
    });
    setCount((count) => {
      return count + 1;
    });
    setCount((count) => {
      return count + 1;
    });
  }

  return (
    <div>
      <h1 onClick={handle_click}>点我新增</h1>
      <h2>{count}</h2>
    </div>
  );
}

function App() {
  const [num, setNum] = useState(0);

  useEffect(() => {
    console.log("App mount");
  }, []);

  useEffect(() => {
    console.log("num change create", num);
    return () => {
      console.log("num change destroy", num);
    };
  }, [num]);

  return (
    <div
      onClick={() => {
        setNum(num + 1);
      }}
    >
      {num === 0 ? <Child /> : "noop"}
    </div>
  );
}

function Child() {
  useEffect(() => {
    console.log("Child mount");
    return () => console.log("Child unmount");
  }, []);
  return "i am child";
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
