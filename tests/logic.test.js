const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync('js/game.js','utf8'),context);context.CRGame=context.window.CRGame;vm.runInContext(fs.readFileSync('js/hint.js','utf8'),context);const G=context.window.CRGame,H=context.window.CRHint;

// A legal operation always moves exactly the single top ball, even when a
// same-color run is available or the destination has room for all of it.
let t=[['blue','red','red','red'],[]];assert(G.isLegalMove(t,0,1,4));assert.equal(G.applyMove(t,0,1,4),1);assert.deepEqual(JSON.parse(JSON.stringify(t)),[['blue','red','red'],['red']]);
assert.equal(G.applyMove(t,0,1,4),1);assert.deepEqual(JSON.parse(JSON.stringify(t)),[['blue','red'],['red','red']]);
t=[['red'],['blue']];assert(G.isLegalMove(t,0,1,4));assert.equal(G.applyMove(t,0,1,4),1);assert.deepEqual(JSON.parse(JSON.stringify(t)),[[],['blue','red']]);
t=[['red'],['red']];assert(G.isLegalMove(t,0,1,4));
t=[['red'],[]];assert(G.isLegalMove(t,0,1,4));
t=[['red'],['blue','yellow','green','purple']];assert(!G.isLegalMove(t,0,1,4));
assert(!G.isLegalMove([['red'],[]],0,0,4));assert(!G.isLegalMove([[],['red']],0,1,4));
assert(G.isCleared([['red','red','red','red'],[]],4));assert(!G.isCleared([['red'],[]],4));assert(H.choose([['red'],['red'],[]],4));console.log('single-ball logic tests passed');

// The UI stores one pre-move snapshot per operation, so one undo restores one
// ball and its corresponding Moves increment.
let state={tubes:[['red','red'],[]],moveCount:0,history:[]};
for(let move=0;move<2;move++){state.history.push({tubes:G.clone(state.tubes),moveCount:state.moveCount});assert.equal(G.applyMove(state.tubes,0,1,4),1);state.moveCount++;}
let prior=state.history.pop();state.tubes=G.clone(prior.tubes);state.moveCount=prior.moveCount;assert.deepEqual(JSON.parse(JSON.stringify(state.tubes)),[['red'],['red']]);assert.equal(state.moveCount,1);
console.log('single-ball undo snapshot test passed');

vm.runInContext(fs.readFileSync('data/stages.js','utf8'),context);const stages=context.window.CR_STAGES;
assert.equal(stages.length,30);
stages.forEach(stage=>{
  const buffers=stage.id<14?2:1;
  assert.equal(stage.tubes.length,stage.colors+buffers,`stage ${stage.id}: tube count`);
  assert.equal(stage.tubes.filter(t=>t.length===0).length,buffers,`stage ${stage.id}: buffers`);
  const counts={};stage.tubes.forEach(tube=>{assert(tube.length<=4);tube.forEach(color=>counts[color]=(counts[color]||0)+1);});
  assert.equal(Object.keys(counts).length,stage.colors,`stage ${stage.id}: colors`);
  Object.keys(counts).forEach(color=>assert.equal(counts[color],4,`stage ${stage.id}: ${color} count`));

  // Replay every development solver certificate under the production move
  // implementation. This proves all 30 published boards are solvable with
  // single-ball operations only.
  const board=stage.tubes.map(t=>t.slice());
  assert.equal(stage.solution.length,stage.verifiedMoves,`stage ${stage.id}: verified move count`);
  stage.solution.forEach(([from,to],move)=>assert.equal(G.applyMove(board,from,to,4),1,`stage ${stage.id}: solution move ${move+1}`));
  assert(G.isCleared(board,4),`stage ${stage.id}: solver certificate`);
});
const carefulHint=H.choose([['red','red','red','red'],['blue','red'],[],[]],4);
assert.notDeepEqual(carefulHint,{from:0,to:2});
const mixedBoard=[['red'],['blue','blue','blue'],['yellow','yellow','yellow','yellow']];
const mixedOnlyHint=H.choose(mixedBoard,4);
assert(G.isLegalMove(mixedBoard,mixedOnlyHint.from,mixedOnlyHint.to,4));
assert.notEqual(mixedBoard[mixedOnlyHint.from].at(-1),mixedBoard[mixedOnlyHint.to].at(-1));
console.log('all 30 stages have valid single-ball solution certificates');
