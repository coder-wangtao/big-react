import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";

function App() {
  const [isDel, del] = useState(false);
  const divRef = useRef(null);
  const numRef = useRef(1);
  console.warn("render divRef", divRef.current);
  console.log(numRef.current, "------------");
  useEffect(() => {
    console.warn("useEffect divRef", divRef.current);
  }, []);

  return (
    <div ref={divRef} onClick={() => del(true)}>
      {isDel ? null : <Child />}
    </div>
  );
}

function Child() {
  return <p ref={(dom) => console.warn("dom is:", dom)}>Child</p>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
