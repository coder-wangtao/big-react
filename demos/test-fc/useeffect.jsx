import { useEffect } from "react";
import { useState } from "react";
import ReactDOM from "react-dom";

export default function Test() {
  const [num, updateNum] = useState(0);

  useEffect(() => {
    console.log("App mount");
  }, []);

  useEffect(() => {
    console.log("num change create", num);
    return () => {
      console.log("num change destroy", num);
    };
  }, [num]);

  function Child() {
    useEffect(() => {
      console.log("Child mount");
      return () => console.log("Child unmount");
    }, []);
    return "i am child";
  }

  return (
    <div onClick={() => updateNum(num + 1)}>
      {num === 0 ? <Child /> : "noop"}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Test />);
