import { useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [num, updateNum] = useState(0);

  const isOdd = num % 2;

  const before = [
    <li key={1}>1</li>,
    <li key={2}>2</li>,
    <li key={3}>3</li>,
    <li key={4}>4</li>,
    <>
      <li key={111}>111</li>
      <li key={222}>222</li>
    </>,
  ];
  const after = [
    <li key={4}>4</li>,
    <li key={2}>2</li>,
    <li key={3}>3</li>,
    <li key={1}>1</li>,
    <>
      <li key={111}>111</li>
      <li key={222}>222</li>
    </>,
  ];

  const listToUse = isOdd ? before : after;

  return (
    <ul
      onClick={(e) => {
        updateNum(num + 1);
      }}
    >
      {listToUse}
    </ul>
  );
}

function Child() {
  const [num, setNum] = useState(0);

  return (
    <ul
      onClickCapture={() => {
        setNum((num) => num + 1);
        setNum((num) => num + 1);
        setNum((num) => num + 1);
      }}
    >
      {num}
    </ul>
  );
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
createRoot(document.getElementById("root")).render(<Child />);
