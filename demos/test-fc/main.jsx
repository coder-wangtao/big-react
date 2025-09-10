import ReactDOM from "react-dom";
import { useEffect, useState } from "react";
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

function App() {
  const [arr, setArr] = useState(["1", "2"]);

  function handleClick() {
    setArr(["1", "2", "3"]);
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

function App7() {
  const [num, update] = useState(100);
  return (
    <ul onClick={() => update(50)}>
      {new Array(num).fill(0).map((_, i) => {
        return <Child key={i}>{i}</Child>;
      })}
    </ul>
  );
}

function Child({ children }) {
  const now = performance.now();
  while (performance.now() - now < 4) {}
  return <li>{children}</li>;
}

function Child1() {
  useEffect(() => {
    console.log("Child mount");
    return () => console.log("Child unmount");
  }, []);
  return "i am child";
}

function effect1() {
  console.log("uesEffect回调111执行");
  return () => {
    console.log("effect 111 销毁");
  };
}
function effect2() {
  console.log("uesEffect回调222执行");
  return () => {
    console.log("effect 222 销毁");
  };
}

function effect3() {
  console.log("uesEffect回调333执行");
  return () => {
    console.log("effect 333 销毁");
  };
}

function effect4() {
  console.log("uesEffect回调444执行");
  return () => {
    console.log("effect 444 销毁");
  };
}

function Bpp() {
  useEffect(() => {
    console.log("uesEffect回调333执行");
    return () => {
      console.log("effect 333 销毁");
    };
  }, []);
  useEffect(() => {
    console.log("uesEffect回调444执行");
    return () => {
      console.log("effect 444 销毁");
    };
  }, []);
  return <h1>Bpp</h1>;
}

function App1() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("uesEffect回调111执行");
    return () => {
      console.log("effect 111 销毁");
    };
  }, []);
  useEffect(() => {
    console.log("uesEffect回调222执行");
    return () => {
      console.log("effect 222 销毁");
    };
  }, []);

  function handle_click() {
    setCount((count) => {
      return count + 1;
    });
  }
  return (
    <div>
      <h1 onClick={handle_click}>点我新增1{count}</h1>
      <Bpp />
    </div>
  );
}

const A = () => {
  return (
    <div>
      <B />
      <B />
    </div>
  );
};

const B = () => {
  return <div>1</div>;
};
function App10() {
  const [num, setNum] = useState(false);
  return num === true ? (
    <Child2 />
  ) : (
    <span
      onClick={() => {
        setNum(false);
      }}
    >
      FALSE
    </span>
  );
}

function Child2() {
  return <span>TRUE</span>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
