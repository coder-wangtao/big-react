function codeGenerator(node) {
  // 我们以节点的种类拆解(语法树)
  switch (node.type) {
    // 如果是Progame,那么就是AST的最根部了，他的body中的每一项就是一个分支，我们需要将每一个分支都放入代码生成器中
    case "Program":
      return node.body.map(codeGenerator).join("\n");
    // 如果是声明语句注意看新的AST结构，那么在声明语句中expression，就是声明的标示，我们以他为参数再次调用codeGenerator
    case "ExpressionStatement":
      return codeGenerator(node.expression) + ";";
    // 如果是调用语句，我们需要打印出调用者的名字加括号，中间放置参数如生成这样"add(2,2)",
    case "CallExpression":
      return (
        codeGenerator(node.callee) +
        "(" +
        node.arguments.map(codeGenerator).join(", ") +
        ")"
      );

    // 如果是识别就直接返回值 如： (add 2 2),在新AST中 add就是那个identifier节点
    case "Identifier":
      return node.name;
    // 如果是数字就直接返回值
    case "NumberLiteral":
      return node.value;
    // 如果是文本就给值加个双引号
    case "StringLiteral":
      return '"' + node.value + '"';
    // 容错处理
    default:
      throw new TypeError(node.type);
  }
}
