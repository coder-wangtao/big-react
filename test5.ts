import { Heap } from "./packages/scheduler/SchedulerMinHeap";
export type Heap<T extends Node> = Array<T>;

export type Node = {
  id: number;
  sortIndex: number;
};

export function peek<T extends Node>(heap: Heap<T>): Node | null {
  if (heap?.length > 0) {
    return heap[0];
  } else {
    return null;
  }
}

export function push<T extends Node>(heap: Heap<T>, node: T): void {
  // 1. 把node放到堆的最后
  const index = heap.length;
  heap.push(node);
  // 2. 调整最小堆，从下往上堆化
  siftUp(heap, node, index);
}

function siftUp<T extends Node>(heap: Heap<T>, node: T, i: number): void {
  let index = i;
  while (i > 0) {
    //node与根节点相比，看谁小，谁小就在上面（根节点）
    const parentIndex = (index - 1) >>> 1;
    const parent = heap[parentIndex];
    if (compare(parent, node) > 0) {
      //node更小
      heap[parentIndex] = node;
      heap[index] = parent;
      index = parentIndex;
    } else {
      return;
    }
  }
}

export function pop<T extends Node>(heap: Heap<T>): T | null {
  if (heap.length === 0) {
    return null;
  }
  const first = heap[0];
  const last = heap.pop()!; //最后一个元素删掉，删完拿到
  if (first !== last) {
    heap[0] = last; //删除堆顶元素，并赋值为最后一个元素
    //多个元素，向下调整堆
    siftDown(heap, last, 0);
  }
  return first;
}

function siftDown<T extends Node>(heap: Heap<T>, node: T, i: number): void {
  let index = i;
  const length = heap.length;
  const halfLength = length >>> 1;
  while (index < halfLength) {
    const leftIndex = (index + 1) * 2 - 1;
    const left = heap[leftIndex];
    const rightIndex = leftIndex + 1;
    const right = heap[rightIndex]; // right 不一定存在
    if (compare(left, node) < 0) {
      //left小
      if (rightIndex < length && compare(right, left) < 0) {
        //right存在，且 right < left,right小
        heap[index] = right;
        heap[rightIndex] = node;
        index = rightIndex;
      } else {
        //left更小，或者right不存在
        heap[index] = left;
        heap[leftIndex] = node;
        index = leftIndex;
      }
    } else if (rightIndex < length && compare(right, left) < 0) {
      //left >= node && right < node
      //right最小
      heap[index] = right;
      heap[rightIndex] = node;
      index = rightIndex;
    } else {
      //根节点最小,终止循环
      return;
    }
  }
}

function compare(a: Node, b: Node) {
  const diff = a.sortIndex - b.sortIndex;
  return diff !== 0 ? diff : a.id - b.id;
}

const taskQueue = [
  { id: 1, sortIndex: 2 },
  { id: 2, sortIndex: 7 },
  { id: 3, sortIndex: 5 },
  { id: 4, sortIndex: 12 },
  { id: 5, sortIndex: 22 },
  { id: 6, sortIndex: 17 },
];

push(taskQueue, { sortIndex: 1, id: 9 });
