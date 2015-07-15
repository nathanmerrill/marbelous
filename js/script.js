$(document).ready(function(){
  var base = 36;
  var default_board_width = 5;
  var default_board_height = 5;
  var empty_device = {
    name: "empty",
    hasValue: false,
    range: base,
    deterministic: true,
    hasSideEffects: false,
    processFunction: function(marble){
      return {
        below: [marble]
      };
    },
    initFunction: function(){
      return {};
    }
  }
  var devices = {
    '..': {},
    '  ': {},
    '':{
      name: 'marble',
      hasValue: true,
      range: base*base,
      initFunction: function(marbles, data){
        return {
          below: [data.value]
        }
      }
    },
    '//':{
      name: 'left-deflector',
      processFunction: function(marble){
        return {
          left: marble
        }
      }
    },
    '\\\\':{
      name: 'right-deflector',
      processFunction: function(marble){
        return {
          right: marble
        }
      }
    },
    '@':{
      name: 'portal',
      hasValue: true,
      deterministic: false,
      hasSideEffects: undefined,
      initFunction: function(portals, data){
        this.hasSideEffects = portals.length > 1;
        return {};
      },
      processFunction: function(marble, portals, data){
        if (marble === undefined){
          return {
            below: [data]
          }
        }
        var randomPortal = portals[Math.floor(Math.random()*portals.length)];
        return {
          additionalProcessing: [
            {
              device: randomPortal,
              data: marble
            }
          ]
        }
      }
    },
    '&':{
      name: 'synchronizer',
      hasValue: true,
      deterministic: false,
      processFunction: function(marble, synchronizers){
        if (marble === undefined){
          var returnValue = this.filled;
          this.filled = undefined;
          return {
            below: [returnValue]
          }
        }
        if (this.filled !== undefined){
          this.filled = 0;
        }
        this.filled += marble;
        var allFilled = true;
        $.each(synchronizers, function(i, synchronizer){
          allFilled &= synchronizer.filled !== undefined;
        });
        if (!allFilled){
          return {};
        }
        this.filled = undefined;
        var returnValue =  {
          below: [marble],
          additionalProcessing: []
        };
        $.each(synchronizers, function(i, synchronizer){
          returnValue.additionalProcessing.push({
            device: synchronizer
          });
        });
        return returnValue;
      }
    },
    '=':{
      name: 'equals',
      hasValue: true,
      processFunction: function(marble, devices, data){
        if (marble === data.value){
          return {
            below: [marble]
          }
        } else {
          return {
            right: [marble]
          }
        }
      }
    },
    '>':{
      name: 'greater-than',
      hasValue: true,
      processFunction: function(marble, devices, data){
        if (marble > data.value){
            return {
              below: [marble]
            }
        } else {
          return {
            right: [marble]
          }
        }
      }
    },
    '<':{
      name: 'less-than',
      hasValue: true,
      processFunction: function(marble, devices, data){
        if (marble < data.value){
            return {
              below: [marble]
            }
        } else {
          return {
            right: [marble]
          }
        }
      }
    },
    '+':{
      name: 'add',
      hasValue: true,
      processFunction: function(marble, devices, data){
        return {
          below: [marble+data.value]
        }
      }
    },
    '-':{
      name: 'subtract',
      hasValue: true,
      processFunction: function(marble, devices, data){
        return {
          below: [marble-data.value]
        }
      }
    },
    '++':{
      name: 'increment',
      hasValue: true,
      processFunction: function(marble, devices, data){
        return {
          below: [marble+1]
        }
      }
    },
    '--':{
      name: 'decrement',
      hasValue: true,
      processFunction: function(marble, devices, data){
        return {
          below: [marble-1]
        }
      }
    },
    '^':{
      name: 'bit-check',
      hasValue: true,
      range: 8,
      processFunction: function(marble, devices, data){
        return {
          below: [marble & (1 << data.value)]
        }
      }
    },
    '<<':{
      name: 'bit-shift-left',
      hasValue: false,
      processFunction: function(marble){
        return {
          below: [marble << 1]
        }
      }
    },
    '>>':{
      name: 'bit-shift-right',
      hasValue: false,
      processFunction: function(marble){
        return {
          below: [marble >> 1]
        }
      }
    },
    '~~':{
      name: 'binary-not',
      hasValue: false,
      processFunction: function(marble){
        return {
          below: [~marble]
        }
      }
    },
    ']]':{
      name: 'stdin',
      hasValue: false,
      deterministic: false,
      hasSideEffects: true,
      processFunction: function(marble){
        var nextInput = readSTDIN();
        if (nextInput === undefined){
          return {
            right: [marble]
          }
        } else {
          return {
            below: [nextInput]
          }
        }
      }
    },
    '[[':{
      name: 'stdout',
      hasValue: false,
      deterministic: false,
      hasSideEffects: true,
      processFunction: function(marble){
        writeSTDOUT(marble);
        return {};
      }
    },
    '{':{
      name: 'input',
      hasValue: true,
      initFunction: function(devices, data){
        return {
          below: [data.boardInput[data.value]]
        }
      }
    },
    '}':{
      name: 'output',
      hasValue: true,
      processFunction: function(marble){
        var boardOutput = {};
        boardOutput[data.value] = marble;
        return {
          boardOutput: boardOutput
        };
      }
    },
    '{<':{
      name: 'left-output',
      processFunction: function(marble){
        return {
          boardOutput: {
            left: marble
          }
        }
      }
    },
    '{>':{
      name: 'right-output',
      processFunction: function(marble){
        return {
          boardOutput: {
            right: marble
          }
        }
      }
    },
    '\\/':{
      name: 'trash',
      processFunction: function(){
        return {};
      }
    },
    '/\\':{
      name: 'cloner',
      processFunction: function(marble){
        return {
          left: marble,
          right: marble
        }
      }
    },
    '!!':{
      name: 'terminator',
      processFunction: function(){
        return {
          finish: true,
        }
      }
    },
    '?':{
      name: 'random-range',
      hasValue: true,
      deterministic: false,
      hasSideEffects: true,
      processFunction: function(marble, outputs, data){
        return {
          below: Math.floor(Math.random()*base)
        }
      }
    },
    '??':{
      name: 'random',
      processFunction: function(marble, outputs, data){
        return {
          below: Math.floor(Math.random()*marble)
        }
      }
    },
  };
  var board_template = $('#board_template');
  var row_template = $('#row_template');
  var cell_template = $('#cell_template');
  var device_template = $('#device_template');

  var boards = [];


  function newBoard(name){
    return {
      name: name,
      width: default_board_width,
      height: default_board_height,
      cells:{},
      cellAt: function(x, y){
        var cellKey = x+","+y;
        return cells[cellKey] || newCell(x,y,"..");
      }
    }
  }
  function newCell(x, y, value){
    if (value === undefined){
      value = '..';
    }
    var integerPart = "";
    var device = {};
    $.extend(device, empty_device);
    if (devices[value]){
      $.extend(device, devices[value]);
    } else if (devices[value.slice(0,1)]){
      $.extend(device, devices[value.slice(0,1)]);
      integerPart = parseInt(value.slice(1,2),36);
    } else {
      integerPart = parseInt(value, 36);
    }
    if (device.hasValue){
      if (integerPart === "" || integerPart >= device.range){
        throw new Exception("Cannot parse cell with value:\""+value+"\"");
      }
    }
    var cell = {
      value: value,
      name: device.name,
      initFunction: device.initFunction,
      processFunction: device.processFunction,
      hasSideEffects: device.hasSideEffects,
      deterministic: device.deterministic,
      x: x,
      y: y,
    };
    return cell;
  }

});
