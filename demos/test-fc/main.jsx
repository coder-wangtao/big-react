import ReactDOM from "react-dom";
import { useState, useEffect, useReducer } from "react";
import { Component } from "../../packages/react-reconciler/src/Component";
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
  useEffect(effect3);
  useEffect(effect4);
  return <h1>Bpp</h1>;
}

function App() {
  const [count, setCount] = useState(0);

  useEffect(effect1);
  useEffect(effect2);

  function handle_click() {
    setCount((count) => {
      return count + 1;
    });
  }
  return (
    <div>
      <h1 onClick={handle_click}>点我新增111</h1>
      <Bpp />
    </div>
  );
}

function FragmentComponent() {
  return (
    <ul>
      <>
        <li>1</li>
        <li>2</li>
      </>
    </ul>
  );
}

class ClassComponent extends Component {
  state = { count: 0 };
  render() {
    return (
      <div className="class border">
        {this.props.name}
        <button
          onClick={() => {
            this.setState({ count: this.state.count + 1 });
            // this.setState({ count: this.state.count + 2 });
          }}
        >
          {this.state.count}
        </button>
      </div>
    );
  }
}

function FunctionComponent(props) {
  const [state1, setState1] = useState(1);
  function reducer(state, action) {
    switch (action.type) {
      case "increment":
        return { count: state.count + 1 };
      case "decrement":
        return { count: state.count - 1 };
      default:
        throw new Error();
    }
  }
  const [state, dispatch] = useReducer(reducer, { count: 2 });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: "increment" })}>Increment</button>
      <button onClick={() => dispatch({ type: "decrement" })}>Decrement</button>
    </div>
  );
}

function Test() {
  const [state, setState] = useState(1);

  return (
    <div className="box border">
      <h1 className="border">omg</h1>
      <h2 className="border">ooo</h2>
      <button
        onClick={() => {
          setState(2);
        }}
      >
        Increment
      </button>
      {/* <FunctionComponent name="函数组件" />
      <ClassComponent name="class组件" />
      <FragmentComponent /> */}
      {state == 1 ? <TestDelete /> : 1}
    </div>
  );
}

const TestDelete = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("count---------------", count);
    return () => console.log("Child unmount");
  }, [count]);

  return (
    <>
      <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
      {count % 2 ? <div>omg</div> : <span>123</span>}
      <button
        onClick={() => {
          if (count === 0) {
            setCount(4);
          } else {
            setCount(count - 2);
          }
        }}
      >
        {count}
      </button>
      ;
      <ul>
        {[0, 1, 2, 3, 4].map((item) => {
          return count >= item ? <li key={item}>{item}</li> : null;
        })}
      </ul>
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<Test />);
