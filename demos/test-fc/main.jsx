import { useState } from "react";
import ReactDom from "react-dom/client";

function App() {
  const [num, setNum] = useState(100);
  window.setNum = setNum;
  return num === 3 ? <Child /> : <div>{num}</div>;
}

function Child() {
  return <span>big-react</span>;
}

ReactDom.createRoot(document.getElementById("root")).render(<App />);
