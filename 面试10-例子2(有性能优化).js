//App满足性能优化策略以后，它的子组件也就是 Wrapper props = ExpensiveSubtree,props = ExpensiveSubtree就不需要render了,所以Expensive render就不会打印了
//App render也没有打印是因为App组件的父组件HostRoot也满足了性能优化的策略，所以App组件也就不需要render了

import { useState } from "react";
import "./App.css";
function App() {
  console.log("App render");
  return (
    <Wrapper>
      <ExpensiveSubtree />
    </Wrapper>
  );
}

function Wrapper({ children }) {
  const [num, update] = useState(0);
  return (
    <div title={num}>
      <button onClick={() => update(num + 1)}>+1</button>
      <p>num is: {num}</p>
      {children}
    </div>
  );
}

function ExpensiveSubtree() {
  console.log("Expensive render");
  return <p>i am child</p>;
}

export default App;
