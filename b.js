const b = 'b';

console.log(_filename, _dirname);

// 通过wrap函数传进来变量，使文件可以继续进行模块操作
const c = _require('./c');

_module._exports = b + c;
