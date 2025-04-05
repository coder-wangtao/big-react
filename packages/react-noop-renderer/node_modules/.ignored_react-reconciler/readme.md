React 更新流程
React 中的更新流程大致可以分为以下几个阶段：

触发更新（Update Trigger）： 更新可以由组件的状态变化、属性变化、父组件的重新渲染、用户事件等触发，如：
创建 React 应用的根对象 ReactDOM.creatRoot().render()；
类组件 this.setState()；
函数组件 useState useEffect；

调度阶段（Schedule Phase）： 调度器根据更新任务的优先级，将更新任务添加到相应的更新队列中，这个阶段决定了何时以及以何种优先级执行更新任务。

协调阶段（Reconciliation Phase）： 也可称为 Render 阶段， Reconciler 负责构建 Fiber 树，处理新旧虚拟 DOM 树之间的差异，生成更新计划，确定需要进行的操作。

提交阶段（Commit Phase）： 提交阶段将更新同步到实际的 DOM 中，React 执行 DOM 操作，例如创建、更新或删除 DOM 元素，反映组件树的最新状态。

#----------------------------------------------------------------------------------------------------------------
首先，我们通过 createContainer 函数创建了 React 应用的根节点 FiberRootNode，并将其与 DOM 节点（hostFiberRoot）连接起来；

然后，通过 updateContainer 函数创建了一个更新（update），并将其加入到更新队列（updateQueue）中，启动了首屏渲染或后续更新的机制；

接着会调用 scheduleUpdateOnFiber 函数开始调度更新，从触发更新的节点开始向上遍历，直到达到根节点 FiberRootNode；

接着会调用 renderRoot 函数，初始化 workInProgress 变量，生成与 hostRootFiber 对应的 workInProgress hostRootFiber；

接着就开始 Reconciler 的更新流程，即 workLoop 函数，对 Fiber 树进行深度优先遍历（DFS）；

在向下遍历阶段会调用 beginWork 方法，在向上返回阶段会调用 completeWork 方法，这两个方法负责 Fiber 节点的创建、更新和处理，具体实现会在下一节会讲到。

#-----------------------------------------
在 第 4 节 中，我们提到 React 更新流程有四个阶段：

触发更新（Update Trigger）
调度阶段（Schedule Phase）
协调阶段（Reconciliation Phase）
提交阶段（Commit Phase）
之前我们已经实现了协调阶段（Reconciliation Phase）的 beginWork 和 completeWork 函数，接下来我们会实现提交阶段（Commit Phase）
提交阶段的主要任务是将更新同步到实际的 DOM 中，执行 DOM 操作，例如创建、更新或删除 DOM 元素，反映组件树的最新状态，可以分为三个主要的子阶段：
Before Mutation (布局阶段):
主要用于执行 DOM 操作之前的准备工作，包括类似 getSnapshotBeforeUpdate 生命周期函数的处理。在这个阶段会保存当前的布局信息，以便在后续的 DOM 操作中能够进行比较和优化。
Mutation (DOM 操作阶段):
执行实际 DOM 操作的阶段，包括创建、更新或删除 DOM 元素等。使用深度优先遍历的方式，逐个处理 Fiber 树中的节点，根据协调阶段生成的更新计划，执行相应的 DOM 操作。
Layout (布局阶段):
用于处理布局相关的任务，进行一些布局的优化，比如批量更新布局信息，减少浏览器的重排（reflow）次数，提高性能。其目标是最小化浏览器对 DOM 的重新计算布局，从而提高渲染性能。
