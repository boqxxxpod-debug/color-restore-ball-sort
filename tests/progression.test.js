'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={window:{}};vm.createContext(context);
for(const file of ['js/game.js','data/stages.js','data/advanced-stages.js','data/progression.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
  context.CRGame=context.window.CRGame;
}
const G=context.window.CRGame,stages=context.window.CR_STAGES;

assert.equal(stages.length,55,'the game still has 55 levels');
stages.forEach((stage,index)=>{
  assert.equal(stage.id,index+1,`level ${index+1}: id is contiguous`);
  assert.equal(stage.progressionRank,index+1,`level ${index+1}: progression rank is contiguous`);
});
assert.equal(new Set(stages.map(stage=>stage.sourceId)).size,55,'every verified source board is used exactly once');

// Levels 1-30 follow the existing Analyzer curve instead of the old coarse blocks.
let plateau=1,maxPlateau=1;
for(let i=1;i<30;i++){
  const previous=stages[i-1].analyzerDifficultyScore,current=stages[i].analyzerDifficultyScore;
  assert(current>=previous,`level ${i+1}: analyzer score does not fall (${previous} -> ${current})`);
  plateau=current===previous?plateau+1:1;
  maxPlateau=Math.max(maxPlateau,plateau);
}
assert(maxPlateau<=3,'no long flat Analyzer plateau remains in levels 1-30');

function topColorPairCount(stage){
  const counts={};
  stage.tubes.forEach(tube=>{if(tube.length){const top=tube[tube.length-1];counts[top]=(counts[top]||0)+1;}});
  return Object.values(counts).reduce((pairs,count)=>pairs+(count*(count-1)/2),0);
}

// 31-35 were the remaining flat five-stage block. They now rise by verified
// solution length. For the final 46-move tie, fewer already-aligned top-color
// pairs means less immediately favorable structure, so that board comes later.
for(let i=31;i<35;i++){
  const previous=stages[i-1],current=stages[i];
  const longer=current.verifiedMoves>previous.verifiedMoves;
  const harderTie=current.verifiedMoves===previous.verifiedMoves&&topColorPairCount(current)<topColorPairCount(previous);
  assert(longer||harderTie,`level ${i+1}: master difficulty rises from the previous level`);
}

// Existing advanced families already have a real per-stage pressure increase.
for(let i=36;i<40;i++)assert(stages[i].verifiedMoves>stages[i-1].verifiedMoves,`level ${i+1}: tower solution length rises`);
for(let i=41;i<45;i++)assert(stages[i].verifiedMoves>stages[i-1].verifiedMoves,`level ${i+1}: locked solution length rises`);
for(let i=46;i<50;i++){
  const previous=Object.keys(stages[i-1].rules.targets).length,current=Object.keys(stages[i].rules.targets).length;
  assert.equal(current,previous+1,`level ${i+1}: one more target tube is required`);
}
for(let i=51;i<55;i++){
  const previous=stages[i-1],current=stages[i];
  assert(current.minimumMoves>previous.minimumMoves,`level ${i+1}: exact minimum rises`);
  assert(current.moveLimit-current.minimumMoves<previous.moveLimit-previous.minimumMoves,`level ${i+1}: move allowance tightens`);
}

// Boundary stages introduce a new concrete difficulty dimension rather than a
// five-level-only numerical jump.
assert.equal(stages[35].capacity,5,'level 36 introduces five-ball tubes');
assert(stages[40].rules&&stages[40].rules.lockedTubes,'level 41 introduces the lock constraint');
assert(stages[45].rules&&stages[45].rules.targets,'level 46 introduces target placement');
assert(stages[50].moveLimit,'level 51 introduces the exact challenge limit');

// Reordering must not invalidate any of the already verified solutions.
stages.forEach(stage=>{
  const capacity=stage.capacity||4,rules=stage.rules||{},board=G.clone(stage.tubes),ruleState=G.createRuleState(board,capacity,rules);
  assert.equal(stage.solution.length,stage.verifiedMoves,`level ${stage.id}: certificate length remains valid`);
  stage.solution.forEach(([from,to],move)=>assert.equal(G.applyMove(board,from,to,capacity,rules,ruleState),1,`level ${stage.id}: certificate move ${move+1}`));
  assert(G.isCleared(board,capacity,rules),`level ${stage.id}: certificate still clears`);
});

// Existing progress is kept, but stale BEST records for rebalanced levels are
// removed so old puzzle scores are not shown against a different board.
const saved={unlockedStage:40,clearedStages:Array.from({length:39},(_,i)=>i+1),bestMoves:{'10':15,'35':43,'36':36,'40':62},sound:true,vibration:true,tutorialCompleted:true};
const storageContext={window:{CR_STAGES:stages},localStorage:{getItem:()=>JSON.stringify(saved),setItem:()=>{}}};vm.createContext(storageContext);vm.runInContext(fs.readFileSync('js/storage.js','utf8'),storageContext,{filename:'js/storage.js'});
const migrated=storageContext.window.CRStorage.load();
assert.equal(migrated.unlockedStage,40,'unlocked progress is preserved');
assert.equal(migrated.clearedStages.length,39,'cleared progress is preserved');
assert.equal(migrated.bestMoves['10'],undefined,'old BEST for rebalanced level 10 is removed');
assert.equal(migrated.bestMoves['35'],undefined,'old BEST for rebalanced level 35 is removed');
assert.equal(migrated.bestMoves['36'],36,'BEST for unchanged level 36 is preserved');
assert.equal(migrated.bestMoves['40'],62,'BEST for unchanged level 40 is preserved');
assert.equal(migrated.progressionVersion,2,'save is migrated to the new progression version');

console.log('per-stage difficulty progression: 55-level ordering, constraints, certificates, and save migration passed');
