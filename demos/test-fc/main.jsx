import { useState } from "react";
import ReactDom from "react-dom/client";

function App() {
  const [num, setNum] = useState(100);
  window.setNum = setNum;
  return (
    <div>
      <span>{num}</span>
    </div>
  );
}

ReactDom.createRoot(document.getElementById("root")).render(<App />);
