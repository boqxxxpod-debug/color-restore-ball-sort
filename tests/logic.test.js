const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync('js/game.js','utf8'),context);context.CRGame=context.window.CRGame;vm.runInContext(fs.readFileSync('js/hint.js','utf8'),context);const G=context.window.CRGame,H=context.window.CRHint;

// Every production asset uses one release identifier so a new Pages deploy
// cannot combine stale game logic with a fresh UI (or vice versa).
const html=fs.readFileSync('index.html','utf8');
const productionAssets=['css/style.css','data/stages.js','js/storage.js','js/sound.js','js/game.js','js/hint.js','js/stage.js','js/app.js'];
const versions=productionAssets.map(asset=>{
  const match=html.match(new RegExp(asset.replaceAll('.','\\.')+'\\?v=([^"\\s]+)'));
  assert(match,`${asset}: missing cache-busting version`);
  return match[1];
});
assert.equal(new Set(versions).size,1,'production assets must share one release version');
console.log(`all production assets use cache version ${versions[0]}`);
assert(html.includes('class="level-progress"'),'game header must expose an independent level progress block');
assert(html.includes('LEVEL <span id="stage-number">1</span>'),'current level must remain visible in the game header');
assert(html.includes('<span id="stage-total">30</span>'),'total level count must remain visible in the game header');
assert(!html.includes('user-scalable=no'),'viewport must allow accessibility zoom');

// A legal operation always moves exactly the single top ball, even when a
// same-color run is available or the destination has room for all of it.
let t=[['blue','red','red','red'],[]];assert(G.isLegalMove(t,0,1,4));assert.equal(G.applyMove(t,0,1,4),1);assert.deepEqual(JSON.parse(JSON.stringify(t)),[['blue','red','red'],['red']]);
assert.equal(G.applyMove(t,0,1,4),1);assert.deepEqual(JSON.parse(JSON.stringify(t)),[['blue','red'],['red','red']]);
t=[['red'],['blue']];assert(!G.isLegalMove(t,0,1,4));assert.equal(G.applyMove(t,0,1,4),0);assert.deepEqual(JSON.parse(JSON.stringify(t)),[['red'],['blue']]);
t=[['red'],['red']];assert(G.isLegalMove(t,0,1,4));
t=[['red'],[]];assert(G.isLegalMove(t,0,1,4));
t=[['red'],['blue','yellow','green','purple']];assert(!G.isLegalMove(t,0,1,4));
assert(!G.isLegalMove([['red'],[]],0,0,4));assert(!G.isLegalMove([[],['red']],0,1,4));
assert(G.isCleared([['red','red','red','red'],[]],4));assert(!G.isCleared([['red'],[]],4));assert(H.choose([['red'],['red'],[]],2));
// The immediate check still catches the certain, zero-legal-move case.
assert(!G.isStuck([['red','red'],['blue','blue']],2),'cleared boards are never stuck');
assert(!G.isStuck([['red'],[]],2),'a board with a legal move is not stuck');
assert(G.isStuck([['red','blue'],['blue','red']],2),'a non-cleared board with no legal move is stuck');
function solve(board,cap,options){const search=G.createSolveSearch(board,cap,options),statuses=[];let result;do{result=search.step(3);statuses.push(result);}while(result==='searching');return {result,search,statuses};}
const looping=[['b','c','c','d'],['b','a','a','c'],['d','a','c','b'],['d','b','d','a'],[]];
assert(!G.isStuck(looping,4),'loop-only board still has legal moves');
assert.equal(solve(looping,4).result,'unsolvable','visited-state exhaustion proves the loop-only board stuck');
assert.equal(solve([['red','blue'],[],[]],2).result,'unsolvable','moving a ball between empty tubes cannot manufacture a solution');
assert.equal(solve([['red','blue'],['blue','red'],[]],2).result,'solvable','one clearing route among several moves prevents stuck classification');
assert.equal(solve([['red','blue'],['blue','red'],[]],2,{maxVisited:1}).result,'solvable','definitive results are cached');
assert.equal(solve([['x','y'],[],[]],2,{maxVisited:1}).result,'unknown','a search limit is inconclusive, not unsolvable');
assert.equal(G.stateKey([['red'],[],['blue']],2),G.stateKey([['blue'],['red'],[]],2),'tube permutations normalize to one state');
console.log('single-ball, exhaustive solver, normalization, cache, and cutoff tests passed');

// The UI stores one pre-move snapshot per operation, so one undo restores one
// ball and its corresponding Moves increment.
let state={tubes:[['red','red'],[]],moveCount:0,history:[]};
for(let move=0;move<2;move++){state.history.push({tubes:G.clone(state.tubes),moveCount:state.moveCount});assert.equal(G.applyMove(state.tubes,0,1,4),1);state.moveCount++;}
let prior=state.history.pop();state.tubes=G.clone(prior.tubes);state.moveCount=prior.moveCount;assert.deepEqual(JSON.parse(JSON.stringify(state.tubes)),[['red'],['red']]);assert.equal(state.moveCount,1);
console.log('single-ball undo snapshot test passed');

vm.runInContext(fs.readFileSync('data/stages.js','utf8'),context);const stages=context.window.CR_STAGES;
assert.equal(stages.length,30);
stages.forEach(stage=>{
  assert(!G.isCleared(stage.tubes,4),`stage ${stage.id}: initial board must be uncleared`);
  assert(!G.isStuck(stage.tubes,4),`stage ${stage.id}: initial board must not be stuck`);
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
const hintBoard=stages[0].tubes.map(t=>t.slice());
const legalHint=H.choose(hintBoard,4);
assert(legalHint);assert(G.isLegalMove(hintBoard,legalHint.from,legalHint.to,4));
const destination=hintBoard[legalHint.to];
assert(!destination.length||hintBoard[legalHint.from].at(-1)===destination.at(-1));
console.log('all 30 stages have valid single-ball solution certificates');

// The development analyzer imports production CRGame rather than maintaining
// another rule implementation. Its exhaustive normalized BFS currently fits
// below the documented cap for every published level and proves exact minima.
const analyzer=require('../tools/level-analyzer');
const analysis=analyzer.analyzeAll({stateLimit:5000});
assert.equal(analysis.length,30);
analysis.forEach((result,index)=>{
  assert(result.solvable,`level ${index+1}: analyzer solvability`);
  assert(result.sampleExhausted,`level ${index+1}: complete reachable graph`);
  assert(Number.isInteger(result.shortestMoves)&&result.shortestMoves>0,`level ${index+1}: exact shortest path`);
  assert(result.shortestMoves<=result.solutionMoves,`level ${index+1}: certificate upper bound`);
});
console.log('development analyzer exhausts all 30 normalized reachable graphs');

const pipeline=require('../tools/level-pipeline');
const generatedA=pipeline.randomBoard(4,2,1234), generatedB=pipeline.randomBoard(4,2,1234);
assert.deepEqual(generatedA,generatedB,'candidate seeds must reproduce the board');
assert.equal(pipeline.shapeKey([['a','b'],[],['b','a']]),pipeline.shapeKey([['b','a'],['a','b'],[]]),'candidate dedup ignores tube order');
const found=pipeline.solvePath(G,[['red','blue'],['blue','red'],[]],2,1000);
assert(found.solution&&found.solution.length,'pipeline solver returns a certificate');
let generatedBoard=G.clone([['red','blue'],['blue','red'],[]]); found.solution.forEach(([from,to])=>assert.equal(G.applyMove(generatedBoard,from,to,2),1));
assert(G.isCleared(generatedBoard,2));
console.log('generator reproducibility, canonical dedup, and solver certificate tests passed');


// The accessible stuck dialog provides both recovery actions, and each action
// is wired to the same undo/restart paths that clear the stuck state first.
assert(html.includes('id="stuck-modal"')&&html.includes('id="stuck-title">STUCK!</h2>'));
assert(html.includes('id="stuck-undo-btn"')&&html.includes('id="stuck-restart-btn"'));
const appSource=fs.readFileSync('js/app.js','utf8');
assert(html.includes('この状態からはクリアできません'));
assert(appSource.includes("function undo(){if(state.isAnimating||state.isCleared||!state.history.length)return;cancelWork();hideStuck();"));
assert(appSource.includes("function restart(){if(state.isAnimating)return;cancelWork();hideStuck();"));
assert(appSource.includes("var previous=state.selectedTube;state.selectedTube=null;updateSelection(previous)"));
assert(appSource.includes("toast('HINTを計算できません')"));
assert(appSource.includes('solveTimer=setTimeout(slice,0)'),'solver work must yield between short slices');
assert(appSource.includes("if(result==='unknown'||result==='solvable'||Date.now()-started>=1200)return;"),'limits must leave play running without a false STUCK');
console.log('stuck recovery and hint UI wiring tests passed');
