module.exports = {
  NumberOrString: _numberOrString,
  Integer: _integer,
  PossibleInteger: _possibleInteger,
  Float: _float,
  PossibleFloat: _possibleFloat,
  String: _string,
  PossibleString: _possibleString,
  ByteString: _byteString,
  PossibleByteString: _possibleByteString,
}

const assert = require('assert');
const {
  Command,
  Arguments
} = require('./command.js');
const {
  ErrorOrEof,
  Error,
  Eof,
} = require('./error.js');
const { PossibleVariable, Variable } = require('./variable.js');
const { State } = require('./tokens.js');

function _numberOrString(){
  var possibleNumber = _possibleInteger();
  if (possibleNumber){
    return possibleNumber;
  }
  var possibleString = _possibleString();
  if (possibleString){
    return possibleString;
  }
  var possibleVariable = PossibleVariable();
  if (possibleVariable){
    return possibleVariable;
  }
  let name = State.tokens[0];
  State.tokens = State.tokens.slice(1);
  return _error('number-string-variable', name);
}

function _decimal(){
  let possibleNumber = _possibleDecimal();
  if (possibleNumber){
    return possibleNumber;
  }else{
      return ErrorOrEof('decimal');
  }
}

function _possibleDecimal() {
  let possible = _possibleInteger();
  if (possible){ return possible; }
  possible = _possibleFloat();
  if (possible){ return possible; }
  return null;
}

function _integer(){
  let possibleNumber = _possibleInteger();
  if (possibleNumber){
    return possibleNumber;
  }else{
      return ErrorOrEof('integer');
  }
}

function _possibleInteger() {
  if (State.tokens.length === 0){
    return null;
  }else if (!isNaN(State.tokens[0])){
    let value = State.tokens[0];
    State.tokens = State.tokens.slice(1);
    return {
      type: 'literal',
      variant: 'integer',
      name: 'integer',
      value: value
    };
  }else{
    var variable = PossibleVariable();
    if(variable){
      return variable;
    }else{
      return Command('variable');
    }
  }
}

function _float(){
  let possibleNumber = _possibleNumber();
  if (possibleNumber){
    return possibleNumber;
  }else{
      return ErrorOrEof('float');
  }
}

function _possibleFloat() {
  if (State.tokens.length === 0){
    return null;
  }else if (!isNaN(State.tokens[0])){
    let value = State.tokens[0];
    State.tokens = State.tokens.slice(1);
    return {
      type: 'literal',
      variant: 'float',
      name: 'float',
      value: value
    };
  }else{
    var variable = PossibleVariable();
    if(variable){
      return variable;
    }else{
      return Command('variable');
    }
  }
}

function _string() {
  let possibleString = _possibleString();
  if (possibleString){
    return possibleString;
  }else{
    return ErrorOrEof('string');
  }
}

function _possibleString() {
  if (State.tokens.length === 0){
    return null;
  }else if (State.tokens[0][0]==='"'){
    var stringsChunks = [];
    var index = 0;
    State.tokens[0] = State.tokens[0].slice(1);
    while (State.tokens[index][State.tokens[index].length-1]!=='"'){
      stringsChunks.push(State.tokens[index]);
      index++;
    }
    stringsChunks.push(State.tokens[index].substring(0, State.tokens[index].length-1));
    State.tokens = State.tokens.slice(index+1);
    return {type: 'literal', variant: 'string', value: stringsChunks.join(' ')};
  }else{
    var variable = PossibleVariable();
    if(variable){
      return variable;
    }else{
      return Command('string');
    }
  }
}

function _byteString() {
  let possibleString = _possibleByteString();
  if (possibleString){
    return possibleString;
  }else{
    return ErrorOrEof('byte-string');
  }
}

function _possibleByteString() {
  if (State.tokens.length === 0){
    return null;
  }else if (State.tokens[0][0]==='['){
    var byteParticles = [];
    var index = 0;
    State.tokens[0] = State.tokens[0].slice(1);
    while (State.tokens[index][State.tokens[index].length-1]!==']'){
      byteParticles.push(State.tokens[index]);
      index++;
    }
    byteParticles.push(State.tokens[index].substring(0, State.tokens[index].length-1));
    State.tokens = State.tokens.slice(index+1);
    return {
      type: 'literal',
      variant: 'byte-string',
      particles: byteParticles
        .filter(byteParticle => byteParticle !== '')
        .map(byteParticle => {return {type: 'literal', variant: 'byte-string-particle', value: byteParticle}}),
    };
  }else{
    return null;
  }
}
