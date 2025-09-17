//父组件render会触发子组件render
import { useState } from "react";
import "./App.css";
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

export default App;
