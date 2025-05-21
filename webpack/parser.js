function parser(tokens) {
  let current = 0; //访问tokens的下标

  //walk函数辅助我们遍历整个tokens
  function walk() {
    let token = tokens[current];
    // 现在就是遍历出每一个token，根据其类型生成对应的节点
    if (token.type === "number") {
      current++;
      return {
        type: "NumberLiteral",
        value: token.value,
      };
    }
    if (token.type === "string") {
      current++;
      return {
        type: "StringLiteral",
        value: token.value,
      };
    }
    //这里处理调用语句
    if (token.type === "paren" && token.value === "(") {
      token = tokens[++current];
      //这里以一个例子解释(add 2 3) 这样的代码 "(" 就是 paren token ，而接下来的node其实就是那个 name 类型的token "add"
      let node = {
        type: "CallExpression",
        value: token.value,
        params: [],
      };
      //获取name后我们需要继续获取接下来调用语句中的参数，直到我们遇到了")",这里会存在嵌套的现象如下
      // (add 2 (subtract 4 2))
      /*
        [                                        
          { type: 'paren', value: '(' },       
          { type: 'name', value: 'add' },      
          { type: 'number', value: '2' },      
          { type: 'paren', value: '(' },       
          { type: 'name', value: 'subtract' }, 
          { type: 'number', value: '4' },      
          { type: 'number', value: '2' },      
          { type: 'paren', value: ')' },       
          { type: 'paren', value: ')' },       
        ]
      */
      token = tokens[++current];
      //这里我们通过递归调用不断的读取参数
      while (
        token.type !== "paren" ||
        (token.type === "paren" && token.value !== ")")
      ) {
        node.params.push(walk());
        token = tokens[current]; //因为参数的if判断里会让 current++ 实际上就是持续向后遍历了tokens,然后将参数推入params
      }
      // 当while中断后就说明参数读取完了，现在下一个应该是")"，所以我们++越过
      current++;
      return node; // 最终将CallExpression节点返回了
    }
    //当然这里做了容错处理，如果没有匹配到预计的类型，就说明出现了，parse无法识别的token
    throw new TypeError(token.type);
  }
  // 现在我们创建AST，树的最根层就是Program
  let ast = {
    type: "Program",
    body: [],
  };
  //然后我们通过调用walk遍历tokens将tokens内的对象，转化为AST的节点，完成AST的构建
  while (current < tokens.length) {
    ast.body.push(walk());
  }
  return ast;
}
  