import { useState } from "react";
import ReactDom from "react-dom/client";

function App() {
  const [num, setNum] = useState(100);
  return <div onClickCapture={() => setNum(num + 1)}>{num}</div>;
}

function Child() {
  return <span>big-react</span>;
}

ReactDom.createRoot(document.getElementById("root")).render(<App />);
