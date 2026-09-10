'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={window:{}};vm.createContext(context);
for(const file of ['js/game.js','js/hint.js','data/stages.js','data/advanced-stages.js','data/progression.js','data/flip-stages.js','data/forge-stages.js','js/stage.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
  context.CRGame=context.window.CRGame;
}
const G=context.window.CRGame,H=context.window.CRHint,stages=context.window.CR_STAGES,forgeStages=stages.slice(65);

assert.equal(stages.length,70,'the complete game has 70 levels');
assert.deepEqual(forgeStages.map(stage=>stage.id),[66,67,68,69,70],'COLOR FORGE ids are contiguous');
const worlds=context.window.CRStage.worlds(stages.length),forgeWorld=worlds.at(-1);
assert.equal(worlds.length,8,'eight world tabs cover all levels');
assert.deepEqual([forgeWorld.key,forgeWorld.start,forgeWorld.end],['forge',66,70],'COLOR FORGE owns levels 66-70');

function finish(job){let result;do{result=job.step(5000);}while(result==='searching'||result.status==='searching');return result;}
function applyAction(board,capacity,rules,ruleState,action){if(action&&action.type==='flip')return G.applyFlip(board,rules,ruleState);if(action&&action.type==='dye')return G.applyDye(board,action.tube,action.color,capacity,rules,ruleState);return G.applyMove(board,action[0],action[1],capacity,rules,ruleState);}
function inventory(board){const counts={};board.forEach(tube=>tube.forEach(color=>counts[color]=(counts[color]||0)+1));return counts;}
function ballCount(board){return board.reduce((sum,tube)=>sum+tube.length,0);}

let previousMinimum=0;
forgeStages.forEach(stage=>{
  const capacity=stage.capacity||4,rules=stage.rules,initialCount=ballCount(stage.tubes),initialInventory=inventory(stage.tubes),board=G.clone(stage.tubes),ruleState=G.createRuleState(board,capacity,rules),dyeMoves=[],flipMoves=[];
  assert(stage.minimumMoves>previousMinimum,`level ${stage.id}: exact minimum rises`);previousMinimum=stage.minimumMoves;
  assert.equal(initialInventory.gray,rules.forgeLimit,`level ${stage.id}: every colorless ball has one forge charge`);
  assert.equal(initialCount,stage.colors*capacity,`level ${stage.id}: total ball count matches completed tubes`);
  Object.keys(rules.dyeGoals).forEach(color=>assert((initialInventory[color]||0)<=rules.dyeGoals[color],`level ${stage.id}: ${color} begins at or below its goal`));
  assert.equal(stage.solution.length,stage.verifiedMoves,`level ${stage.id}: certificate length`);
  stage.solution.forEach((action,index)=>{
    const beforeCount=ballCount(board),beforeGray=inventory(board).gray||0;
    if(action&&action.type==='dye'){
      assert(G.dyeChoices(board,action.tube,rules,ruleState).includes(action.color),`level ${stage.id}: dye ${index+1} is offered before commitment`);
      dyeMoves.push(index+1);
    }
    assert.equal(applyAction(board,capacity,rules,ruleState,action),1,`level ${stage.id}: action ${index+1} is legal`);
    if(action&&action.type==='dye')assert.equal(inventory(board).gray||0,beforeGray-1,`level ${stage.id}: one colorless ball is dyed`);
    if(action&&action.type==='flip')flipMoves.push(index+1);
    assert.equal(ballCount(board),beforeCount,`level ${stage.id}: action ${index+1} preserves ball count`);
    board.forEach(tube=>assert(tube.length<=capacity,`level ${stage.id}: capacity remains valid`));
  });
  assert.deepEqual(dyeMoves,Array.from(stage.dyeMoves),`level ${stage.id}: declared dye timing`);
  if(stage.flipMoves)assert.deepEqual(flipMoves,Array.from(stage.flipMoves),`level ${stage.id}: declared FLIP timing`);
  assert.equal(ruleState.dyesUsed,rules.forgeLimit,`level ${stage.id}: every forge charge is used`);
  assert.equal(ruleState.forgeRemaining,0,`level ${stage.id}: no forge charge remains`);
  assert(G.isCleared(board,capacity,rules),`level ${stage.id}: certificate clears`);
  const finalInventory=inventory(board);delete finalInventory.gray;assert.deepEqual(finalInventory,JSON.parse(JSON.stringify(rules.dyeGoals)),`level ${stage.id}: final inventory matches the displayed needs`);

  const exact=finish(H.search(stage.tubes,capacity,{maxVisited:50000,rules,ruleState:G.createRuleState(stage.tubes,capacity,rules)}));
  assert.equal(exact.status,'solved',`level ${stage.id}: production Hint solves initial state`);
  assert.equal(exact.distance,stage.minimumMoves,`level ${stage.id}: production BFS proves exact minimum`);
  const noForgeState=G.createRuleState(stage.tubes,capacity,rules);noForgeState.forgeRemaining=0;
  assert.equal(finish(G.createSolveSearch(stage.tubes,capacity,{maxVisited:50000,rules,ruleState:noForgeState})),'unsolvable',`level ${stage.id}: COLOR FORGE is required`);
});

const level66=forgeStages[0],introState=G.createRuleState(level66.tubes,4,level66.rules);
assert.deepEqual(G.dyeChoices(level66.tubes,2,level66.rules,introState),['red'],'level 66 introduces one ball and one candidate');
assert.equal(G.applyDye(G.clone(level66.tubes),0,'red',4,level66.rules,G.cloneRuleState(introState)),0,'only a top colorless ball can enter the forge');
assert.equal(G.applyDye(G.clone(level66.tubes),2,'purple',4,level66.rules,G.cloneRuleState(introState)),0,'colors outside pigment stock are rejected');
assert.equal(G.isCleared([['gray','gray','gray','gray'],[]],4,{forgeLimit:4,dyeGoals:{red:4}}),false,'a full colorless tube is never complete');
assert.equal(G.isCleared([['blue','blue','blue','blue'],[]],4,{forgeLimit:1,dyeGoals:{red:4}}),false,'a uniform but incorrectly dyed inventory cannot clear');

const level67=forgeStages[1],choiceState=G.createRuleState(level67.tubes,4,level67.rules);
assert.deepEqual(G.dyeChoices(level67.tubes,1,level67.rules,choiceState),['red','blue'],'level 67 presents two explicit candidates');
const wrongBoard=G.clone(level67.tubes),wrongState=G.cloneRuleState(choiceState);assert.equal(G.applyDye(wrongBoard,1,'blue',4,level67.rules,wrongState),1);
assert.equal(finish(G.createSolveSearch(wrongBoard,4,{maxVisited:50000,rules:level67.rules,ruleState:wrongState})),'unsolvable','level 67 makes the wrong color a recoverable dead end');

const level68=forgeStages[2];assert.equal(level68.rules.forgeLimit,2);assert.equal(new Set(level68.solution.filter(action=>action&&action.type==='dye').map(action=>action.color)).size,2,'level 68 dyes two balls different colors');

const level69=forgeStages[3],orderBoard=G.clone(level69.tubes),orderState=G.createRuleState(orderBoard,4,level69.rules);assert.equal(G.applyMove(orderBoard,0,4,4,level69.rules,orderState),1);
assert.deepEqual(G.dyeChoices(orderBoard,4,level69.rules,orderState),['red','blue'],'level 69 exposes an order-defining choice');assert.equal(G.applyDye(orderBoard,4,'red',4,level69.rules,orderState),1);
assert.equal(finish(G.createSolveSearch(orderBoard,4,{maxVisited:50000,rules:level69.rules,ruleState:orderState})),'unsolvable','level 69 requires blue before the buried red assignment');

const level70=forgeStages[4],noFlipState=G.createRuleState(level70.tubes,4,level70.rules);noFlipState.flipsRemaining=0;
assert.equal(finish(G.createSolveSearch(level70.tubes,4,{maxVisited:50000,rules:level70.rules,ruleState:noFlipState})),'unsolvable','level 70 requires FLIP as well as COLOR FORGE');
assert(level70.solution.some(action=>action&&action.type==='flip')&&level70.solution.filter(action=>action&&action.type==='dye').length===2,'level 70 certificate combines both mechanics');

const keyBoard=G.clone(level68.tubes),keyRules=level68.rules,keyState=G.createRuleState(keyBoard,4,keyRules),spent=G.cloneRuleState(keyState),redUsed=G.cloneRuleState(keyState);spent.forgeRemaining--;redUsed.dyeUsed.red=1;
assert.notEqual(G.stateKey(keyBoard,4,keyRules,keyState),G.stateKey(keyBoard,4,keyRules,spent),'stateKey distinguishes remaining forge charges');
assert.notEqual(G.stateKey(keyBoard,4,keyRules,keyState),G.stateKey(keyBoard,4,keyRules,redUsed),'stateKey distinguishes color-specific pigment use');
const copied=G.cloneRuleState(redUsed);copied.dyeUsed.red=0;assert.equal(redUsed.dyeUsed.red,1,'rule-state cloning keeps pigment history independent');

const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('js/app.js','utf8'),css=fs.readFileSync('css/style.css','utf8');
assert(html.includes('id="forge-btn"')&&html.includes('id="forge-options"'),'COLOR FORGE has a dedicated accessible picker');
assert(html.includes('data/forge-stages.js?v=20260910-2'),'forge stage data is loaded after FLIP LAB');
assert(app.includes("result.move.type==='dye'")&&app.includes('CRGame.applyDye'),'normal input and Hint expose deterministic dye choices');
assert(css.includes('.ball.gray')&&css.includes('@media(max-width:370px){.forge-control'),'colorless balls and the 360px control have explicit styles');

const saved65={unlockedStage:65,clearedStages:Array.from({length:65},(_,i)=>i+1),bestMoves:{'65':18},sound:true,vibration:true,tutorialCompleted:true,progressionVersion:3};
const storageContext={window:{CR_STAGES:stages},localStorage:{getItem:()=>JSON.stringify(saved65),setItem:()=>{}}};vm.createContext(storageContext);vm.runInContext(fs.readFileSync('js/storage.js','utf8'),storageContext,{filename:'js/storage.js'});const migrated=storageContext.window.CRStorage.load();
assert.equal(migrated.unlockedStage,66,'players who cleared level 65 receive level 66');assert.equal(migrated.bestMoves['65'],18,'existing level 65 BEST survives');

console.log('COLOR FORGE levels 66-70: exact minima, choices, required dyes, FLIP combination, UI, undo state, and save migration passed');
