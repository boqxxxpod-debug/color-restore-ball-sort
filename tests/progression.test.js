'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={window:{}};vm.createContext(context);
for(const file of ['js/game.js','data/stages.js','data/advanced-stages.js','data/progression.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
  context.CRGame=context.window.CRGame;
}
const G=context.window.CRGame,stages=context.window.CR_STAGES;

assert.equal(stages.length,60,'the game has 60 levels');
stages.forEach((stage,index)=>{
  assert.equal(stage.id,index+1,`level ${index+1}: id is contiguous`);
  assert.equal(stage.progressionRank,index+1,`level ${index+1}: progression rank is contiguous`);
});
assert.equal(new Set(stages.map(stage=>stage.sourceId)).size,60,'every verified source slot is used exactly once');

// Levels 1-35 now have a strict measured Analyzer increase. This removes all
// plateaus instead of merely limiting their length.
for(let i=1;i<35;i++){
  const previous=stages[i-1].analyzerDifficultyScore,current=stages[i].analyzerDifficultyScore;
  assert(Number.isFinite(previous)&&Number.isFinite(current),`level ${i+1}: Analyzer scores are present`);
  assert(current>previous,`level ${i+1}: Analyzer score strictly rises (${previous} -> ${current})`);
}

// Level 15 replaces the last 6-color plateau with a verified board between
// the surrounding Analyzer scores.
assert.equal(stages[14].minimumMoves,27,'level 15 exact minimum remains 27 moves');
assert.equal(stages[14].analyzerDifficultyScore,57,'level 15 breaks the old 56.7 plateau');
assert(stages[14].generatedSeed,'level 15 records its generated board seed');

// Levels 26-35 are a continuous 8-color / one-empty run with exact minimum
// distance increasing by one move every level: 34,35,...,43.
for(let level=26;level<=35;level++){
  const stage=stages[level-1];
  assert.equal(stage.colors,8,`level ${level}: eight colors`);
  assert.equal(stage.capacity,4,`level ${level}: standard four-ball capacity`);
  assert.equal(stage.tubes.filter(tube=>!tube.length).length,1,`level ${level}: exactly one empty tube`);
  assert.equal(stage.minimumMoves,level+8,`level ${level}: exact minimum is ${level+8}`);
  assert.equal(stage.verifiedMoves,stage.minimumMoves,`level ${level}: published certificate is shortest`);
  assert(stage.generatedSeed,`level ${level}: generated board seed is recorded`);
}

// Re-run the production Hint BFS for every regenerated board. This proves that
// minimumMoves is the exact shortest distance, not just the certificate length.
[15,26,27,28,29,30,31,32,33,34,35].forEach(level=>{
  const stage=stages[level-1],capacity=stage.capacity||4;
  const search=G.createHintSearch(stage.tubes,capacity,{maxVisited:50000});
  let result;
  do { result=search.step(10000); } while(result.status==='searching');
  assert.equal(result.status,'solved',`level ${level}: shortest-path search completes`);
  assert.equal(result.distance,stage.minimumMoves,`level ${level}: exact minimum is production-BFS verified`);
});

// The remaining transitions each introduce or strengthen one concrete
// gameplay pressure, so every transition 1->2 through 59->60 is covered.
assert.equal(stages[35].capacity,5,'level 36 is harder by introducing five-ball tubes');
for(let i=36;i<40;i++)assert(stages[i].verifiedMoves>stages[i-1].verifiedMoves,`level ${i+1}: tower solution length rises`);

assert(stages[40].rules&&stages[40].rules.lockedTubes,'level 41 is harder by introducing the lock constraint');
for(let i=41;i<45;i++)assert(stages[i].verifiedMoves>stages[i-1].verifiedMoves,`level ${i+1}: locked solution length rises`);

assert(stages[45].rules&&stages[45].rules.targets,'level 46 is harder by introducing target placement');
for(let i=46;i<50;i++){
  const previous=Object.keys(stages[i-1].rules.targets).length,current=Object.keys(stages[i].rules.targets).length;
  assert.equal(current,previous+1,`level ${i+1}: one more target tube is required`);
}

assert(stages[50].moveLimit,'level 51 is harder by introducing the exact challenge limit');
for(let i=51;i<55;i++){
  const previous=stages[i-1],current=stages[i];
  assert(current.minimumMoves>previous.minimumMoves,`level ${i+1}: exact minimum rises`);
  assert(current.moveLimit-current.minimumMoves<previous.moveLimit-previous.minimumMoves,`level ${i+1}: move allowance tightens`);
}

const chainStages=stages.slice(55),expectedDepths=[1,1,2,2,3];
chainStages.forEach((stage,index)=>{
  assert.equal(stage.rules.unlockChain.length,expectedDepths[index],`level ${stage.id}: chain depth progression`);
  const state=G.createRuleState(stage.tubes,4,stage.rules),search=G.createHintSearch(stage.tubes,4,{maxVisited:50000,rules:stage.rules,ruleState:state});
  let result;do{result=search.step(10000);}while(result.status==='searching');
  assert.equal(result.status,'solved',`level ${stage.id}: chain shortest-path search completes`);
  assert.equal(result.distance,stage.minimumMoves,`level ${stage.id}: chain minimum is production-BFS verified`);
});
assert(chainStages[1].minimumMoves>chainStages[0].minimumMoves,'level 57 raises the exact minimum beyond level 56');
assert(chainStages[1].unlockMoves[0]>chainStages[0].unlockMoves[0],'level 57 delays its single unlock beyond level 56');
assert(chainStages[2].chainDepth>chainStages[1].chainDepth,'level 58 adds a second chained unlock');
assert(chainStages[3].minimumMoves>chainStages[2].minimumMoves,'level 59 raises the exact minimum beyond level 58');
assert(chainStages[3].unlockMoves.at(-1)>chainStages[2].unlockMoves.at(-1),'level 59 delays its final unlock beyond level 58');
assert(chainStages[4].chainDepth>chainStages[3].chainDepth,'level 60 adds a third chained unlock');

// Every runtime board, including the replacements, must still replay a legal
// production-rules certificate and clear.
stages.forEach(stage=>{
  const capacity=stage.capacity||4,rules=stage.rules||{},board=G.clone(stage.tubes),ruleState=G.createRuleState(board,capacity,rules);
  assert.equal(stage.solution.length,stage.verifiedMoves,`level ${stage.id}: certificate length remains valid`);
  stage.solution.forEach(([from,to],move)=>assert.equal(G.applyMove(board,from,to,capacity,rules,ruleState),1,`level ${stage.id}: certificate move ${move+1}`));
  assert(G.isCleared(board,capacity,rules),`level ${stage.id}: certificate still clears`);
});

// Progress remains unlocked/cleared, but BEST records are invalidated only
// for boards changed in progression version 3. Unchanged v2 records survive.
function loadStorage(saved){
  const storageContext={window:{CR_STAGES:stages},localStorage:{getItem:()=>JSON.stringify(saved),setItem:()=>{}}};
  vm.createContext(storageContext);vm.runInContext(fs.readFileSync('js/storage.js','utf8'),storageContext,{filename:'js/storage.js'});
  return storageContext.window.CRStorage.load();
}
const savedV2={unlockedStage:40,clearedStages:Array.from({length:39},(_,i)=>i+1),bestMoves:{'10':15,'15':29,'25':37,'26':37,'35':46,'36':36,'40':62},sound:true,vibration:true,tutorialCompleted:true,progressionVersion:2};
const migratedV2=loadStorage(savedV2);
assert.equal(migratedV2.unlockedStage,40,'unlocked progress is preserved');
assert.equal(migratedV2.clearedStages.length,39,'cleared progress is preserved');
assert.equal(migratedV2.bestMoves['10'],15,'unchanged level 10 BEST is preserved');
assert.equal(migratedV2.bestMoves['25'],37,'unchanged level 25 BEST is preserved');
assert.equal(migratedV2.bestMoves['15'],undefined,'changed level 15 BEST is removed');
assert.equal(migratedV2.bestMoves['26'],undefined,'changed level 26 BEST is removed');
assert.equal(migratedV2.bestMoves['35'],undefined,'changed level 35 BEST is removed');
assert.equal(migratedV2.bestMoves['36'],36,'unchanged level 36 BEST is preserved');
assert.equal(migratedV2.bestMoves['40'],62,'unchanged level 40 BEST is preserved');
assert.equal(migratedV2.progressionVersion,3,'save is migrated to progression version 3');

const savedLegacy={unlockedStage:40,clearedStages:[1,2,3],bestMoves:{'10':15,'35':46,'36':36},progressionVersion:1};
const migratedLegacy=loadStorage(savedLegacy);
assert.equal(migratedLegacy.bestMoves['10'],undefined,'pre-v2 BEST inside the original rebalance is removed');
assert.equal(migratedLegacy.bestMoves['35'],undefined,'pre-v2 BEST through level 35 is removed');
assert.equal(migratedLegacy.bestMoves['36'],36,'pre-v2 BEST above level 35 is preserved');

console.log('strict per-stage progression: all 60 levels, certificates, chain difficulty, and save migration passed');
