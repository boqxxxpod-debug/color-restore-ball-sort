'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={window:{}};vm.createContext(context);
for(const file of ['js/game.js','js/hint.js','data/stages.js','data/advanced-stages.js','data/progression.js','data/flip-stages.js','js/stage.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
  context.CRGame=context.window.CRGame;
}
const G=context.window.CRGame,H=context.window.CRHint,stages=context.window.CR_STAGES,flipStages=stages.slice(60);

assert.equal(stages.length,65,'the complete game has 65 levels');
assert.deepEqual(flipStages.map(stage=>stage.id),[61,62,63,64,65],'FLIP LAB ids are contiguous');
const worlds=context.window.CRStage.worlds(stages.length),flipWorld=worlds.at(-1);
assert.equal(worlds.length,7,'seven world tabs cover all levels');
assert.deepEqual([flipWorld.key,flipWorld.start,flipWorld.end],['flip',61,65],'FLIP LAB owns levels 61-65');

function finish(job){let result;do{result=job.step(5000);}while(result==='searching'||result.status==='searching');return result;}
function applyAction(board,capacity,rules,ruleState,action){return action&&action.type==='flip'?G.applyFlip(board,rules,ruleState):G.applyMove(board,action[0],action[1],capacity,rules,ruleState);}
function inventory(board){const counts={};board.forEach(tube=>tube.forEach(color=>counts[color]=(counts[color]||0)+1));return counts;}

let previousMinimum=0;
flipStages.forEach(stage=>{
  const capacity=stage.capacity||4,rules=stage.rules,initialInventory=inventory(stage.tubes),board=G.clone(stage.tubes),ruleState=G.createRuleState(board,capacity,rules),flipMoves=[];
  assert(stage.minimumMoves>previousMinimum,`level ${stage.id}: exact minimum rises`);previousMinimum=stage.minimumMoves;
  assert.equal(stage.solution.length,stage.verifiedMoves,`level ${stage.id}: certificate length`);
  stage.solution.forEach((action,index)=>{assert.equal(applyAction(board,capacity,rules,ruleState,action),1,`level ${stage.id}: action ${index+1} is legal`);if(action.type==='flip')flipMoves.push(index+1);assert.deepEqual(inventory(board),initialInventory,`level ${stage.id}: action ${index+1} preserves inventory`);board.forEach(tube=>assert(tube.length<=capacity,`level ${stage.id}: capacity remains valid`));});
  assert.deepEqual(flipMoves,Array.from(stage.flipMoves),`level ${stage.id}: declared FLIP timing`);
  assert(G.isCleared(board,capacity,rules),`level ${stage.id}: certificate clears`);
  assert.equal(ruleState.flipsUsed,flipMoves.length,`level ${stage.id}: FLIP use is counted`);

  const exact=finish(H.search(stage.tubes,capacity,{maxVisited:50000,rules,ruleState:G.createRuleState(stage.tubes,capacity,rules)}));
  assert.equal(exact.status,'solved',`level ${stage.id}: production Hint solves initial state`);
  assert.equal(exact.distance,stage.minimumMoves,`level ${stage.id}: production BFS proves exact minimum`);

  const noFlipState=G.createRuleState(stage.tubes,capacity,rules);noFlipState.flipsRemaining=0;
  const noFlip=finish(G.createSolveSearch(stage.tubes,capacity,{maxVisited:50000,rules,ruleState:noFlipState}));
  assert.equal(noFlip,'unsolvable',`level ${stage.id}: FLIP is required`);
});

const level63=flipStages[2];assert.equal(level63.rules.flipLimit,2);assert.equal(level63.solution.filter(action=>action.type==='flip').length,2,'level 63 requires both FLIPs');

const level64=flipStages[3],lockBoard=G.clone(level64.tubes),lockState=G.createRuleState(lockBoard,4,level64.rules);let lockUsed=false,opened=false;
assert(G.isTubeLocked(level64.rules,lockState,0),'level 64 begins with its mixed tube locked');
level64.solution.forEach(action=>{const before=lockState.locksOpen,wasLocked=G.isTubeLocked(level64.rules,lockState,0);assert.equal(applyAction(lockBoard,4,level64.rules,lockState,action),1);if(action.type==='flip')assert.equal(G.isTubeLocked(level64.rules,lockState,0),wasLocked,'FLIP preserves the lock state');if(!before&&lockState.locksOpen)opened=true;if(Array.isArray(action)&&(action[0]===0||action[1]===0))lockUsed=true;});
assert(opened&&lockUsed,'level 64 unlocks and then uses the gated tube');

const level65=flipStages[4],targetBoard=G.clone(level65.tubes),targetState=G.createRuleState(targetBoard,4,level65.rules);
level65.solution.forEach(action=>assert.equal(applyAction(targetBoard,4,level65.rules,targetState,action),1));
assert(targetBoard[0].every(color=>color==='red')&&targetBoard[0].length===4,'level 65 finishes red in its target tube');

const keyBoard=G.clone(flipStages[0].tubes),keyRules=flipStages[0].rules,keyState=G.createRuleState(keyBoard,4,keyRules),otherSide=G.cloneRuleState(keyState),spent=G.cloneRuleState(keyState);
otherSide.isFlipped=true;spent.flipsRemaining=0;
assert.notEqual(G.stateKey(keyBoard,4,keyRules,keyState),G.stateKey(keyBoard,4,keyRules,otherSide),'stateKey distinguishes SIDE A and SIDE B');
assert.notEqual(G.stateKey(keyBoard,4,keyRules,keyState),G.stateKey(keyBoard,4,keyRules,spent),'stateKey distinguishes remaining FLIPs');
const snapshot={tubes:G.clone(keyBoard),ruleState:G.cloneRuleState(keyState)};assert.equal(G.applyFlip(keyBoard,keyRules,keyState),1);keyBoard.splice(0,keyBoard.length,...G.clone(snapshot.tubes));Object.assign(keyState,G.cloneRuleState(snapshot.ruleState));assert.deepEqual(keyBoard,snapshot.tubes);assert.equal(keyState.flipsRemaining,1);assert.equal(keyState.isFlipped,false);assert.equal(keyState.flipsUsed,0,'undo snapshot restores board, count, and orientation');

const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('js/app.js','utf8'),css=fs.readFileSync('css/style.css','utf8');
assert(html.includes('id="flip-btn"')&&html.includes('id="flip-count"'),'FLIP has a dedicated accessible control');
assert(html.includes('data/flip-stages.js?v=20260910-1'),'FLIP stage data is loaded after progression');
assert(app.includes("$('#flip-btn').onclick=flipBoard")&&app.includes("result.move.type==='flip'"),'normal input and Hint expose FLIP');
assert(app.includes('ruleState:CRGame.cloneRuleState(state.ruleState)'),'FLIP history captures the complete rule state');
assert(css.includes('.tube-board.flipping')&&css.includes('@keyframes flipBoard'),'the board has a short FLIP animation');
assert(css.includes('@media(max-width:370px){.flip-control'),'the FLIP control has a 360px layout');

const saved60={unlockedStage:60,clearedStages:Array.from({length:60},(_,i)=>i+1),bestMoves:{'60':41},sound:true,vibration:true,tutorialCompleted:true,progressionVersion:3};
const storageContext={window:{CR_STAGES:stages},localStorage:{getItem:()=>JSON.stringify(saved60),setItem:()=>{}}};vm.createContext(storageContext);vm.runInContext(fs.readFileSync('js/storage.js','utf8'),storageContext,{filename:'js/storage.js'});const migrated=storageContext.window.CRStorage.load();
assert.equal(migrated.unlockedStage,61,'players who cleared level 60 receive level 61');assert.equal(migrated.bestMoves['60'],41,'existing level 60 BEST survives');

console.log('FLIP LAB levels 61-65: exact minima, required flips, lock/target combinations, UI, undo, and save migration passed');
