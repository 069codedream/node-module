// 源码中的执行顺序

// 1 Module.prototype.require
// 2 Module._load加载模块
// 3 加载模块时会查看是否有缓存，有的话就直接使用
// 4 如果没有缓存，就直接将模块路径转化为绝对路径 Module.resolveFilename
// 5 根据转化的路径查看是否有缓存，如果没有缓存就看一下是否是原生模块
// 6 new Module 创建模块 id 唯一路径 exports 导出的结果，默认{}
// 7 把模块缓存起来，为了下次使用时可以使用上次缓存的模块
// 8 module.load加载模块
// 9 拿到文件的扩展名Module._extensions 调用对应的模块的解析规则
// 10 读取文件，编译模块
// 11 包装成函数 并让函数执行 模块的this指代的是exports对象
// 12 最终require的返回结果就是module.exports的结果

// function require(exports, require, module, __dirname, __filename) {
//   module.exports = 'a';
//   return module.exports;
// }

const path = require('path');
const fs = require('fs');
const vm = require('vm');

function Module(id) {
  this.id = id;
  this.exports = {};
}

Module.wrap = function (script) {
  const wrapper = [
    '(function (_exports, _require, _module, _filename, _dirname) {',
    '\n})',
  ];

  return wrapper[0] + script + wrapper[1];
};

Module._extensions = {};

Module._extensions['.js'] = function (_module) {
  const content = fs.readFileSync(_module.id, 'utf-8');
  const fnStr = Module.wrap(content); // 函数字符串
  const thisValue = _module._exports;
  const fn = vm.runInThisContext(fnStr);

  const filename = _module.id;
  const dirname = path.dirname(_module.id);
  // this是_exports对象
  // 执行后用户会给module._exports赋值（js文件最后的module._exports=）
  // 传入的其它参数__dirname、__filename让文件能取到这两个变量，能使用require
  fn.call(thisValue, _module._exports, _require, _module, filename, dirname);
};

Module._extensions['.json'] = function (_module) {
  const content = fs.readFileSync(_module.id, 'utf-8');
  _module._exports = JSON.parse(content);
};

Module._resolveFilename = function (filepath) {
  // 根据当前路径实现解析
  const filePath = path.resolve(__dirname, filepath);
  // 判断当前文件是否存在/包括扩展名的完整路径
  const exists = fs.existsSync(filePath);
  // 存在就直接返回路径
  if (exists) return filePath;

  const keys = Object.keys(Module._extensions);

  for (let i = 0; i < keys.length; i++) {
    const currentPath = filePath + keys[i];

    // 尝试添加后缀查找，有就返回，没有就抛错
    if (fs.existsSync(currentPath)) return currentPath;
  }

  throw new Error('模块不存在');
};

Module.prototype.load = function (filename) {
  // 获取文件后缀，进行加载
  const extname = path.extname(filename);
  // 根据后缀名对应的函数，传入当前模块进行加载
  Module._extensions[extname](this);
};

Module._cache = {};

Module._load = function (filepath) {
  // 将路径转换成绝对路径
  const filename = Module._resolveFilename(filepath);

  // 获取路径后先不立即创建模块，先看一下是否能找到以前加载过的模块
  let cache = Module._cache[filename];
  if (cache) {
    return cache._exports; // 如果有就返回上一次require的结果
  }

  // 保证每个模块都是唯一的，需要通过唯一路径进行查找
  const _module = new Module(filename); // id,_exports对应的就是当前模块的结果

  cache = _module; // 没有就先缓存起来

  _module.load(filename);
  return _module._exports;
};

function _require(filepath) {
  // 根据路径加载模块
  return Module._load(filepath);
}

// 简单测试

const a = _require('./a');
_require('./a');
_require('./a');
console.log(a);

const b = _require('./b');
_require('./b');
_require('./b');
console.log(b);

const c = _require('c');
console.log(c);

// module.exports = exports = {};
// exports = 'a' 改变exports属性不会导致module.exports变化
// 最终导出的是module.exports

// exports.a = 'hello' 会通过引用找到添加的属性，导致module.exports发生变化

// 1 require语法是同步的，内部使用的是fs.readFileSync
// 2 最终require返回的是module.exports
// 3 模块的exports和module.exports引用的是同一个变量
// 4 模块是动态加载的，每次require都会获取最新的导出结果，可以将require写到条件中
// 5 更改exports的引用，不会导致module.exports的变化
