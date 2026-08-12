const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync('js/game.js','utf8'),context);context.CRGame=context.window.CRGame;vm.runInContext(fs.readFileSync('js/hint.js','utf8'),context);const G=context.window.CRGame,H=context.window.CRHint;
let t=[['red','red'],[]];assert(G.isLegalMove(t,0,1,4));assert.equal(G.applyMove(t,0,1,4),2);assert.deepEqual(JSON.parse(JSON.stringify(t)),[[],['red','red']]);
t=[['red'],['blue']];assert(!G.isLegalMove(t,0,1,4));t=[['red'],['red','red','red','red']];assert(!G.isLegalMove(t,0,1,4));
assert(G.isCleared([['red','red','red','red'],[]],4));assert(!G.isCleared([['red'],[]],4));assert(H.choose([['red'],['red'],[]],4));console.log('logic tests passed');
let state={tubes:[['red'],[]],moveCount:0,history:[]};state.history.push({tubes:G.clone(state.tubes),moveCount:state.moveCount});G.applyMove(state.tubes,0,1,4);state.moveCount++;let prior=state.history.pop();state.tubes=G.clone(prior.tubes);state.moveCount=prior.moveCount;assert.deepEqual(JSON.parse(JSON.stringify(state.tubes)),[['red'],[]]);assert.equal(state.moveCount,0);
console.log('undo snapshot test passed');

// Every published board has exactly four balls of each color and two working
// buffers. This guards the curated, solvable stage format against accidental
// edits that can make a puzzle impossible.
vm.runInContext(fs.readFileSync('data/stages.js','utf8'),context);
const stages=context.window.CR_STAGES;
assert.equal(stages.length,30);
stages.forEach(stage=>{
  assert.equal(stage.tubes.length,stage.colors+2,`stage ${stage.id}: tube count`);
  assert.equal(stage.tubes.filter(t=>t.length===0).length,2,`stage ${stage.id}: buffers`);
  const counts={};stage.tubes.forEach(t=>{assert(t.length<=4);t.forEach(c=>counts[c]=(counts[c]||0)+1);});
  assert.equal(Object.keys(counts).length,stage.colors,`stage ${stage.id}: colors`);
  Object.keys(counts).forEach(c=>assert.equal(counts[c],4,`stage ${stage.id}: ${c} count`));
});

function shortestDistance(start){
  const key=tubes=>JSON.stringify(tubes), queue=[[start.map(t=>t.slice()),0]], seen=new Set([key(start)]);
  for(let head=0;head<queue.length;head++){
    const [tubes,distance]=queue[head];
    if(G.isCleared(tubes,4))return distance;
    for(let from=0;from<tubes.length;from++)for(let to=0;to<tubes.length;to++){
      if(!G.isLegalMove(tubes,from,to,4))continue;
      const next=tubes.map(t=>t.slice());G.applyMove(next,from,to,4);const id=key(next);
      if(!seen.has(id)){seen.add(id);queue.push([next,distance+1]);}
    }
  }
  return Infinity;
}
// The opening world is exhaustively checked. Stage 1 remains approachable for
// the tutorial; subsequent boards deliberately require substantially more
// planning than the original 3–12 move layouts.
stages.slice(0,10).forEach(stage=>assert.equal(shortestDistance(stage.tubes),stage.minimumMoves,`stage ${stage.id}: optimal route`));
const carefulHint=H.choose([['red','red','red','red'],['blue','red'],[],[]],4);
assert.notDeepEqual(carefulHint,{from:0,to:2});
console.log('30 stage invariants and opening-world difficulty tests passed');
