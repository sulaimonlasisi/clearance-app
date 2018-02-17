# Utilex

[![NPM][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage][coverage-image]][coverage-url]

Utilex is a module that provides extra functions.

## Installation

```bash
npm install utilex
```

## Usage

```javascript
var utilex = require('utilex');
```

### args

Returns command line arguments

```javascript
// command: node app.js --arg1 arg1Val --arg2 -arg3 arg3Val arg4 arg5 -c test/data-simple.json
utilex.args();
// {
//   "arg1": "arg1Val",
//   "arg2": "",
//   "arg3": "arg3Val",
//   "arg4": "",
//   "arg5": "",
//   "c": "test/data-simple.json"
// }
```

### consoleClear

Clears console

```javascript
node -e 'require("./lib/utilex").consoleClear()'
```

### dirIsWritable

Checks whether given directory is writable or not

```javascript
utilex.dirIsWritable(__dirname); // true
```

### download

Downloads file

```javascript
utilex.download('http://www.google.com/images/srpr/logo11w.png', './google-logo.png', function(err, fp) {
  if(err) console.log(err);
  console.log(fp + ' is downloaded.');
});
// ./google-logo.png is downloaded.
```

### jsonLoad

Loads JSON file

```javascript
utilex.jsonLoad('test/data-simple.json'); // { hello: 'world' }
```

### strLen

Returns the length of given string

```javascript
utilex.strLen('Hello 世界');       // 8
utilex.strLen('Hello 世界', true); // 12
```

### tasker

Returns a tasker

#### tasker - simple

```javascript
var tasker = utilex.tasker();

tasker.results = [];                     // array for results
tasker.add({counter: 0});                // add a task

tasker.run(function(task, next) {        // run tasker
  tasker.results.push(++task.counter);   // push counter value to results

  if(task.counter < 5) {
    tasker.add({counter: task.counter}); // add more tasks if < 5
  }

  return next();                         // call next task
}, function() {
  console.log(tasker.results);           // done
});
// [ 1, 2, 3, 4, 5 ]
```

#### tasker - async

```javascript
var tasker = utilex.tasker();

var asyncFunc = function asyncFunc(input, callback) {
  setTimeout(function() { return callback(input); }, 0);
};

tasker.add('hello');
tasker.add('world');

tasker.run(function(task, next) {
  asyncFunc(task, function(res) {
    console.log(res);
    if(res === 'world') tasker.add('hello world');
    return next();
  });
}, function() {
  console.log('done!');
});

// hello
// world
// hello world
// done!
```

### uid

Returns an unique id

```javascript
utilex.uid(); // '43cdacfded3a47298b32bfa47269fdd2b55b33d6'
```

## License

Licensed under The MIT License (MIT)  
For the full copyright and license information, please view the LICENSE.txt file.

[npm-url]: http://npmjs.org/package/utilex
[npm-image]: https://badge.fury.io/js/utilex.svg

[travis-url]: https://travis-ci.org/devfacet/utilex
[travis-image]: https://travis-ci.org/devfacet/utilex.svg?branch=master

[coverage-url]: https://coveralls.io/github/devfacet/utilex?branch=master
[coverage-image]: https://coveralls.io/repos/devfacet/utilex/badge.svg?branch=master&service=github
