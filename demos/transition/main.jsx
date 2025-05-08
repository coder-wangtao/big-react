import ReactDOM from "react-dom";

import { useState, useTransition } from "react";
import TabButton from "./TabButton";
import AboutTab from "./AboutTab";
import PostsTab from "./PostsTab";
import ContactTab from "./ContactTab";
import "./style.css";
//useTransition 是 React 18 引入的新 Hook，用于标记非紧急的状态更新。
// 在React的并发模式下，允许我们中断或延后某些状态更新，以便于能够在长时间的计算或数据拉取时保持UI的响应性。

function App() {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState("about");
  console.log("hello");
  function selectTab(nextTab) {
    //他的更新 fiber dom 比较慢
    startTransition(() => {
      setTab(nextTab);
    });
  }

  return (
    <>
      <TabButton isActive={tab === "about"} onClick={() => selectTab("about")}>
        首页
      </TabButton>useTransition 
      <TabButton isActive={tab === "posts"} onClick={() => selectTab("posts")}>
        博客 (render慢)
      </TabButton>
      <TabButton
        isActive={tab === "contact"}
        onClick={() => selectTab("contact")}
      >
        联系我
      </TabButton>
      <hr />
      {tab === "about" && <AboutTab />}
      {tab === "posts" && <PostsTab />}
      {tab === "contact" && <ContactTab />}
    </>
  );
}

const root = ReactDOM.createRoot(document.querySelector("#root"));

root.render(<App />);
