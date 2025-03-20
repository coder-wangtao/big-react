import { useState } from "react";
import ReactDom from "react-dom/client";

function App() {
  const [num, setNum] = useState(100);
  return <div onClickCapture={() => setNum(num + 1)}>{num}</div>;
}

function Child() {
  return <span>big-react</span>;
}

function App1() {
  return (
    <h1>
      <h2>
        <h3>222</h3>
      </h2>
    </h1>
  );
}
debugger;
ReactDom.createRoot(document.getElementById("root")).render(<App />);
