'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={window:{}};vm.createContext(context);
for(const file of ['js/game.js','js/hint.js','data/stages.js','data/advanced-stages.js','js/stage.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
  context.CRGame=context.window.CRGame;
}
const G=context.window.CRGame,H=context.window.CRHint,stages=context.window.CR_STAGES,advanced=stages.slice(30);

assert.equal(stages.length,55,'the complete game has 55 levels');
assert.equal(advanced.length,25,'levels 31-55 are present');
advanced.forEach((stage,index)=>assert.equal(stage.id,index+31,'advanced level ids stay contiguous'));
const worlds=context.window.CRStage.worlds(stages.length);assert.equal(worlds.length,6,'six world tabs cover all levels');assert.deepEqual([worlds.at(-1).start,worlds.at(-1).end],[51,55]);

function finishSearch(job){let result;do{result=job.step(5000);}while(result==='searching'||result.status==='searching');return result;}
function replay(stage){
  const cap=stage.capacity||4,rules=stage.rules||{},board=G.clone(stage.tubes),ruleState=G.createRuleState(board,cap,rules);
  assert.equal(stage.solution.length,stage.verifiedMoves,`level ${stage.id}: certificate length`);
  stage.solution.forEach(([from,to],move)=>assert.equal(G.applyMove(board,from,to,cap,rules,ruleState),1,`level ${stage.id}: certificate move ${move+1}`));
  assert(G.isCleared(board,cap,rules),`level ${stage.id}: certificate clears under production rules`);
  return {board,ruleState};
}
function validateInventory(stage){
  const cap=stage.capacity||4,counts={};
  stage.tubes.forEach(tube=>{assert(tube.length<=cap,`level ${stage.id}: capacity`);tube.forEach(color=>counts[color]=(counts[color]||0)+1);});
  assert.equal(Object.keys(counts).length,stage.colors,`level ${stage.id}: color count`);
  Object.keys(counts).forEach(color=>assert.equal(counts[color],cap,`level ${stage.id}: ${color} inventory`));
}

advanced.forEach(stage=>{validateInventory(stage);replay(stage);const rules=stage.rules||{},ruleState=G.createRuleState(stage.tubes,stage.capacity||4,rules);const result=finishSearch(H.search(stage.tubes,stage.capacity||4,{maxVisited:50000,rules,ruleState}));assert.equal(result.status,'solved',`level ${stage.id}: production Hint can solve initial state`);assert(result.move&&Number.isInteger(result.distance),`level ${stage.id}: Hint supplies a move and distance`);assert(result.distance<=stage.verifiedMoves,`level ${stage.id}: Hint is no longer than certificate`);});

for(const stage of stages.slice(30,35)){
  assert.equal(stage.capacity,4);assert.equal(stage.tubes.filter(t=>!t.length).length,1,`level ${stage.id}: one empty tube`);
}
for(const stage of stages.slice(35,40)){
  assert.equal(stage.capacity,5,`level ${stage.id}: five-ball capacity`);assert.equal(stage.tubes.filter(t=>!t.length).length,1);
}
for(const stage of stages.slice(40,45)){
  const rules=stage.rules,board=G.clone(stage.tubes),ruleState=G.createRuleState(board,4,rules);assert.deepEqual(Array.from(rules.lockedTubes),[9]);assert(!ruleState.locksOpen,`level ${stage.id}: lock begins closed`);assert(!G.isLegalMove(board,0,9,4,rules,ruleState),`level ${stage.id}: locked tube rejects moves`);
  let openedAt=0,usedLock=false;stage.solution.forEach(([from,to],move)=>{const before=ruleState.locksOpen;assert.equal(G.applyMove(board,from,to,4,rules,ruleState),1);if(!before&&ruleState.locksOpen)openedAt=move+1;if(from===9||to===9){assert(ruleState.locksOpen);usedLock=true;}});assert(openedAt>0&&usedLock,`level ${stage.id}: solution unlocks and uses the tube`);
  const oneEmpty=stage.tubes.slice(0,9),search=G.createSolveSearch(oneEmpty,4,{maxVisited:50000});assert.equal(finishSearch(search),'unsolvable',`level ${stage.id}: unlocked tube is required`);
}
for(const stage of stages.slice(45,50)){
  const targetCount=Object.keys(stage.rules.targets).length;assert.equal(targetCount,stage.id-45,`level ${stage.id}: targets increase one by one`);const solved=replay(stage).board,targetIndex=+Object.keys(stage.rules.targets)[0],other=solved.findIndex((tube,i)=>i!==targetIndex&&tube.length),wrong=G.clone(solved);[wrong[targetIndex],wrong[other]]=[wrong[other],wrong[targetIndex]];assert(!G.isCleared(wrong,4,stage.rules),`level ${stage.id}: wrong target placement is not clear`);
}
let priorMinimum=0;
for(const stage of stages.slice(50)){
  assert(stage.minimumMoves>priorMinimum,`level ${stage.id}: exact minimum rises`);priorMinimum=stage.minimumMoves;assert.equal(stage.solution.length,stage.minimumMoves,`level ${stage.id}: certificate is shortest`);assert.equal(stage.moveLimit-stage.minimumMoves,56-stage.id,`level ${stage.id}: move allowance tightens`);const exact=finishSearch(H.search(stage.tubes,4,{maxVisited:50000}));assert.equal(exact.distance,stage.minimumMoves,`level ${stage.id}: production BFS proves the minimum`);
}

const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('js/app.js','utf8'),css=fs.readFileSync('css/style.css','utf8');
assert(html.includes('id="rule-chip"')&&html.includes('id="limit-count"'),'advanced rule status is visible');
assert(html.includes('id="limit-modal"')&&html.includes('id="limit-undo-btn"')&&html.includes('id="limit-restart-btn"'),'move-limit recovery is accessible');
assert(app.includes("CRGame.isTubeLocked(state.rules,state.ruleState,i)"),'normal input checks locks');
assert(app.includes("state.moveLimit&&state.moveCount>=state.moveLimit"),'normal input enforces the move limit');
assert(app.includes("state.rules.targets&&state.rules.targets[i]"),'normal rendering exposes target tubes');
assert(css.includes('.tube.capacity-5')&&css.includes('.tube.locked-tube')&&css.includes('.tube.target-tube'),'all advanced tube states have styles');

const saved={unlockedStage:30,clearedStages:Array.from({length:30},(_,i)=>i+1),bestMoves:{},sound:true,vibration:true,tutorialCompleted:true};
const storageContext={window:{CR_STAGES:Array(55)},localStorage:{getItem:()=>JSON.stringify(saved),setItem:()=>{}}};vm.createContext(storageContext);vm.runInContext(fs.readFileSync('js/storage.js','utf8'),storageContext);assert.equal(storageContext.window.CRStorage.load().unlockedStage,31,'existing players who cleared level 30 receive level 31');

console.log('advanced levels 31-55: inventory, certificates, rules, hints, UI wiring, and save migration passed');
