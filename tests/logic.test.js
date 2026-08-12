const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync('js/game.js','utf8'),context);context.CRGame=context.window.CRGame;vm.runInContext(fs.readFileSync('js/hint.js','utf8'),context);const G=context.window.CRGame,H=context.window.CRHint;
let t=[['red','red'],[]];assert(G.isLegalMove(t,0,1,4));assert.equal(G.applyMove(t,0,1,4),2);assert.deepEqual(JSON.parse(JSON.stringify(t)),[[],['red','red']]);
t=[['red'],['blue']];assert(!G.isLegalMove(t,0,1,4));t=[['red'],['red','red','red','red']];assert(!G.isLegalMove(t,0,1,4));
assert(G.isCleared([['red','red','red','red'],[]],4));assert(!G.isCleared([['red'],[]],4));assert(H.choose([['red'],['red'],[]],4));console.log('logic tests passed');
let state={tubes:[['red'],[]],moveCount:0,history:[]};state.history.push({tubes:G.clone(state.tubes),moveCount:state.moveCount});G.applyMove(state.tubes,0,1,4);state.moveCount++;let prior=state.history.pop();state.tubes=G.clone(prior.tubes);state.moveCount=prior.moveCount;assert.deepEqual(JSON.parse(JSON.stringify(state.tubes)),[['red'],[]]);assert.equal(state.moveCount,0);
console.log('undo snapshot test passed');
