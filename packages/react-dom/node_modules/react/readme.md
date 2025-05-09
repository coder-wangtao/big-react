rollup 原生支持 es module 打包 入口在 module

原来 react 17 之前

<div id="1" key="1">1234</div> -> bebel -> /*#__PURE__*/React.createElement("div", {
                                                            id: "1",
                                                            key: "1"
                                                        }, "1234");

现在 react17 后

<div id="1" key="1">1234</div> -> bebel ->  import { jsx as _jsx } from "react/jsx-runtime";
                                            /*#__PURE__*/_jsx("div", {
                                                id: "1",
                                                children: "1234"
                                            }, "1");
包括两部分
1.编译时 babel实现
2.运行时 jsx或者React.createElement 是由我们实现的
 
描述ui的的方法     ->       运行时核心模块                         
  jsx：react               reconcile:react         ->调用->        宿主环境API      ->显示->  真实ui
模版语法：vue               renderer:vue 
vue的模版语法是有编译优化的，react是没有的，react消费jsx，react是一个纯运行时的框架

fiberNode = VNode
jsx -> reactELement -> FiberNode -> Dom Element

react 内部有三个阶段
schedule 阶段
render 阶段 (beginWork completeWork)
commit 阶段 (commitWork)
commit 有三个子阶段：
beforeMutation 阶段
mutation 阶段
layout 阶段
