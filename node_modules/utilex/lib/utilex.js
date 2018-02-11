/*
 * Utilex
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

/* jslint node: true */
'use strict';

var fs     = require('fs'),
    path   = require('path'),
    http   = require('http'),
    https  = require('https'),
    crypto = require('crypto');

// Init the module
module.exports = (function() {

  // Returns command line arguments
  var args = function args() {

    if(!process.argv.length) {
      return {};
    }

    var argv  = process.argv,
        argsF = {},
        currentArg,
        currentParam,
        paramFlag,
        posBegin,
        posEnd;

    for(var i = 0, len = argv.length; i < len; i++) {
      currentArg = (''+argv[i]).trim();

      if(currentArg) {
        if(currentArg.indexOf('-') === 0) {
          paramFlag = false;
          posBegin  = (currentArg.indexOf('--') === 0) ? 2 : 1;
          posEnd    = currentArg.length;

          if(posEnd > posBegin) {
            currentParam = currentArg.substring(posBegin, posEnd);
            argsF[currentParam] = '';
            paramFlag = true;
          }
        } else {
          if(paramFlag === true) {
            argsF[currentParam] = currentArg;
            currentParam = null;
            paramFlag = false;
          } else {
            argsF[currentArg] = '';
          }
        }
      }
    }

    return argsF;
  };

  // Clears console
  var consoleClear = function consoleClear() {
    if(typeof console !== 'undefined') console.log('\u001B[2J\u001B[0;0f');
  };

  // Checks whether given directory is writable or not
  var dirIsWritable = function dirIsWritable(dirPath) {
    var fp = dirPath + path.sep + 'file.tmp' ;

    if(!fs.existsSync(dirPath)) {
      return false;
    }

    try {
      fs.writeFileSync(fp);
      try {
        fs.unlinkSync(fp);
        return true;
      } catch(e) {
        return false;
      }
    } catch(e) {
      return false;
    }

    return false;
  };

  // Downloads file
  var download = function download(url, filePath, callback) {

    if(typeof callback !== 'function') {
      throw new Error('Invalid callback function');
    } else if(typeof url !== 'string') {
      return callback(new Error('Invalid url'));
    } else if(typeof filePath !== 'string') {
      return callback(new Error('Invalid file path'));
    }

    var client;

    if(url.indexOf('http://') === 0) {
      client = http;
    } else if(url.indexOf('https://') === 0) {
      client = https;
    } else {
      return callback(new Error('Invalid protocol'));
    }

    // Get and save
    client.get(url, function(res) {
      if(res.statusCode === 200) {
        var ws = res.pipe(fs.createWriteStream(filePath));
        ws.on('finish', function()   { return callback(null, filePath); });
        ws.on('error', function(err) { return callback(err); });
      } else {
        res.destroy();
        return callback(new Error('Bad response (' + res.statusCode + ')'));
      }
    }).on('error', function(err) {
      return callback(err);
    });
  };

  // Loads JSON file
  var jsonLoad = function jsonLoad(filePath) {
    if(typeof filePath === 'string' && fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath));
      } catch(e) {
        return false;
      }
    }

    return false;
  };

  // Returns the length of given string
  var strLen = function strLen(str, isByteLen) {
    if(typeof str !== undefined) {
      if(isByteLen === true) {
        return ~-encodeURI(str).split(/%..|./).length;
      } else {
        return str.length;
      }
    }

    return 0;
  };

  // Returns a tasker
  var tasker = function() {
    var tasks = [];

    // Adds a task
    var add = function add(anything) {
      tasks.push(anything);
    };

    // Runs tasks
    var run = function run(cbEach, cbDone) {
      var callback = function callback() {
        var task = tasks.shift();

        if(!task) {
          return cbDone();
        }
        return cbEach(task, callback);
      };
      callback();
    };

    // Return
    return {
      add: add,
      run: run
    };
  };

  // Returns an unique id
  var uid = function() {
    return crypto.randomBytes(20).toString('hex');
  };

  // Return
  return {
    args:          args,
    consoleClear:  consoleClear,
    dirIsWritable: dirIsWritable,
    download:      download,
    jsonLoad:      jsonLoad,
    strLen:        strLen,
    tasker:        tasker,
    uid:           uid
  };
})();