import React, { useEffect } from "react";
import { getData } from "../../api";
export default function Index() {
  useEffect(() => {
    getData().then((res) => {
      console.log(res);
    });
  });
  return (
    <div>
      {/* react 18中是不是别的，react19在组件 jsx 中将文档元数据插到 header 中 */}
      <article>
        <title>456</title>
        <meta name="author" content="Josh" />
        <link rel="author" href="https://twitter.com/joshcstory/" />
        <meta name="keywords" content={789} />
      </article>
      <div>哈喽 </div>
    </div>
  );
}
