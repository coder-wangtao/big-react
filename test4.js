// !获取堆顶元素
export function peek(heap) {
  return heap.length === 0 ? null : heap[0];
}

// !给堆添加元素
export function push(heap, node) {
  // 1. 把node放到堆的最后
  const index = heap.length;
  heap.push(node);
  // 2. 调整最小堆，从下往上堆化
  siftUp(heap, node, index);
}

// !从下往上堆化
function siftUp(heap, node, i) {
  let index = i;
  while (index > 0) {
    const parentIndex = (index - 1) >>> 1; //x >>> 1表示的就是除以 2 后取整。  //你看父节点的索引值是不是就是 (子节点的索引值 - 1) / 2 后取整。
    const parent = heap[parentIndex];
    if (compare(parent, node) > 0) {
      // node子节点更小，和根节点交换
      heap[parentIndex] = node;
      heap[index] = parent;
      index = parentIndex;
    } else {
      return;
    }
  }
}

// !删除堆顶元素
export function pop(heap) {
  if (heap.length === 0) {
    return null;
  }
  const first = heap[0];
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const last = heap.pop();
  if (first !== last) {
    // 证明heap中有2个或者更多个元素
    heap[0] = last;
    siftDown(heap, last, 0);
  }

  return first;
}

function siftDown(heap, node, i) {
  let index = i;
  const length = heap.length;
  const halfLength = length >>> 1;
  while (index < halfLength) {
    const leftIndex = (index + 1) * 2 - 1;
    const left = heap[leftIndex];
    const rightIndex = leftIndex + 1;
    const right = heap[rightIndex]; // right不一定存在，等下还要判断是否存在
    if (compare(left, node) < 0) {
      // left<node
      if (rightIndex < length && compare(right, left) < 0) {
        // right存在，且right<left
        heap[index] = right;
        heap[rightIndex] = node;
        index = rightIndex;
      } else {
        // left更小或者right不存在
        heap[index] = left;
        heap[leftIndex] = node;
        index = leftIndex;
      }
    } else if (rightIndex < length && compare(right, node) < 0) {
      // left>=node && right<node
      heap[index] = right;
      heap[rightIndex] = node;
      index = rightIndex;
    } else {
      // 根节点最小，不需要调整
      return;
    }
  }
}

function compare(a, b) {
  const diff = a.sortIndex - b.sortIndex;
  return diff !== 0 ? diff : a?.id || 0 - (b?.id || 0);
}

const taskQueue = [
  { sortIndex: 2 },
  { sortIndex: 7 },
  { sortIndex: 5 },
  { sortIndex: 12 },
  { sortIndex: 22 },
  { sortIndex: 17 },
];
push(taskQueue, { sortIndex: 1 });
console.log(JSON.stringify(taskQueue));
