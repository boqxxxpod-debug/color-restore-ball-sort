'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={window:{}};vm.createContext(context);
for(const file of ['js/game.js','js/hint.js','data/stages.js','data/advanced-stages.js','data/progression.js','data/flip-stages.js','data/forge-stages.js','data/portal-stages.js','js/stage.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});context.CRGame=context.window.CRGame;
}
const G=context.window.CRGame,H=context.window.CRHint,stages=context.window.CR_STAGES,portalStages=stages.slice(70);

assert.equal(stages.length,75,'the complete game has 75 levels');
assert.deepEqual(portalStages.map(stage=>stage.id),[71,72,73,74,75],'PORTAL TUBES ids are contiguous');
const worlds=context.window.CRStage.worlds(stages.length),portalWorld=worlds.at(-1);
assert.equal(worlds.length,9,'nine world tabs cover all levels');
assert.deepEqual([portalWorld.key,portalWorld.start,portalWorld.end],['portal',71,75],'PORTAL TUBES owns levels 71-75');

function finish(job){let result;do{result=job.step(5000);}while(result==='searching'||result.status==='searching');return result;}
function applyAction(board,capacity,rules,ruleState,action){if(action&&action.type==='flip')return G.applyFlip(board,rules,ruleState);if(action&&action.type==='dye')return G.applyDye(board,action.tube,action.color,capacity,rules,ruleState);return G.applyMove(board,action[0],action[1],capacity,rules,ruleState);}
function ballCount(board){return board.reduce((sum,tube)=>sum+tube.length,0);}
function inventory(board){const counts={};board.forEach(tube=>tube.forEach(color=>counts[color]=(counts[color]||0)+1));return counts;}
function solveWithoutPortal(tubes,capacity,rules,maxVisited){
  const start=G.clone(tubes),startState=G.createRuleState(start,capacity,rules),stack=[{board:start,ruleState:startState}],visited=new Set([G.stateKey(start,capacity,rules,startState)]);
  while(stack.length){
    const node=stack.pop();if(G.isCleared(node.board,capacity,rules))return 'solvable';
    const add=(board,ruleState)=>{const key=G.stateKey(board,capacity,rules,ruleState);if(visited.has(key))return;assert(visited.size<maxVisited,'portal-disabled proof exceeded its state budget');visited.add(key);stack.push({board,ruleState});};
    for(let from=0;from<node.board.length;from++)for(let to=0;to<node.board.length;to++)if(G.portalExit(rules,to)<0&&G.isLegalMove(node.board,from,to,capacity,rules,node.ruleState)){
      const next=G.clone(node.board),nextState=G.cloneRuleState(node.ruleState);G.applyMove(next,from,to,capacity,rules,nextState);add(next,nextState);
    }
    if(G.canFlip(rules,node.ruleState)){const next=G.clone(node.board),nextState=G.cloneRuleState(node.ruleState);G.applyFlip(next,rules,nextState);add(next,nextState);}
    for(let tube=0;tube<node.board.length;tube++)for(const color of G.dyeChoices(node.board,tube,rules,node.ruleState)){const next=G.clone(node.board),nextState=G.cloneRuleState(node.ruleState);G.applyDye(next,tube,color,capacity,rules,nextState);add(next,nextState);}
  }
  return 'unsolvable';
}

let previousMinimum=0;
portalStages.forEach(stage=>{
  const capacity=stage.capacity||4,rules=stage.rules,pairs=G.portalPairs(rules),board=G.clone(stage.tubes),ruleState=G.createRuleState(board,capacity,rules),initialCount=ballCount(board),portalMoves=[],usedEntries=new Set();
  assert(stage.minimumMoves>previousMinimum,`level ${stage.id}: exact minimum rises`);previousMinimum=stage.minimumMoves;
  assert(pairs.length>=1,`level ${stage.id}: at least one portal pair`);
  assert.equal(new Set(pairs.flatMap(pair=>[pair.entry,pair.exit])).size,pairs.length*2,`level ${stage.id}: endpoints are disjoint`);
  assert.equal(new Set(pairs.map(pair=>pair.symbol)).size,pairs.length,`level ${stage.id}: pair symbols are unique`);
  pairs.forEach(pair=>{assert(pair.entry>=0&&pair.entry<board.length&&pair.exit>=0&&pair.exit<board.length,`level ${stage.id}: endpoints are in range`);});
  assert.equal(stage.solution.length,stage.verifiedMoves,`level ${stage.id}: certificate length`);
  stage.solution.forEach((action,index)=>{
    const before=G.clone(board),beforeCount=ballCount(board),exit=Array.isArray(action)?G.portalExit(rules,action[1]):-1;
    assert.equal(applyAction(board,capacity,rules,ruleState,action),1,`level ${stage.id}: action ${index+1} is legal`);
    assert.equal(ballCount(board),beforeCount,`level ${stage.id}: action ${index+1} preserves one-ball inventory`);
    board.forEach(tube=>assert(tube.length<=capacity,`level ${stage.id}: capacity remains valid`));
    if(exit>=0){portalMoves.push(index+1);usedEntries.add(action[1]);assert.equal(board[action[1]].length,before[action[1]].length,`level ${stage.id}: entrance never retains the warped ball`);assert.equal(board[exit].length,before[exit].length+1,`level ${stage.id}: exit receives exactly one ball`);assert.equal(board[action[0]].length,before[action[0]].length-1,`level ${stage.id}: source loses exactly one ball`);}
  });
  assert.deepEqual(portalMoves,Array.from(stage.portalMoves),`level ${stage.id}: declared warp timing`);
  assert(G.isCleared(board,capacity,rules),`level ${stage.id}: certificate clears`);
  const exact=finish(H.search(stage.tubes,capacity,{maxVisited:50000,rules,ruleState:G.createRuleState(stage.tubes,capacity,rules)}));
  assert.equal(exact.status,'solved',`level ${stage.id}: production Hint solves initial state`);assert.equal(exact.distance,stage.minimumMoves,`level ${stage.id}: production BFS proves exact minimum`);
  assert.equal(solveWithoutPortal(stage.tubes,capacity,rules,50000),'unsolvable',`level ${stage.id}: at least one warp is required`);
  if(pairs.length===2)assert.equal(usedEntries.size,2,`level ${stage.id}: both portal pairs are used`);
});

const fullExit=[['red'],[],['blue','blue','blue','blue']],fullRules={portals:[{entry:1,exit:2,symbol:'A'}]},fullState=G.createRuleState(fullExit,4,fullRules);
assert.equal(G.isLegalMove(fullExit,0,1,4,fullRules,fullState),false,'a full exit blocks entry before the move');
assert.equal(G.applyMove(fullExit,0,1,4,fullRules,fullState),0,'a blocked warp changes no tube');
const oneHop=[['red'],[],[],[]],oneHopRules={portals:[{entry:1,exit:2,symbol:'A'},{entry:2,exit:3,symbol:'B'}]},oneHopState=G.createRuleState(oneHop,4,oneHopRules);
assert.equal(G.applyMove(oneHop,0,1,4,oneHopRules,oneHopState),1);assert.deepEqual(oneHop,[[],[],['red'],[]],'an exit that is another entrance does not double-fire');
assert.equal(G.isLegalMove([[],[],['red']],2,1,4,fullRules,G.createRuleState([[],[],['red']],4,fullRules)),false,'moving an exit ball back through its entrance cannot create a no-op loop');

const level71=portalStages[0];assert.equal(level71.rules.portals.length,1);assert.deepEqual(level71.portalMoves,[2],'level 71 introduces one deliberate warp');
const undoBoard=G.clone(level71.tubes),undoState=G.createRuleState(undoBoard,4,level71.rules);G.applyMove(undoBoard,1,3,4,level71.rules,undoState);const snapshot={tubes:G.clone(undoBoard),ruleState:G.cloneRuleState(undoState)};G.applyMove(undoBoard,1,2,4,level71.rules,undoState);undoBoard.splice(0,undoBoard.length,...G.clone(snapshot.tubes));Object.assign(undoState,G.cloneRuleState(snapshot.ruleState));assert.deepEqual(undoBoard,snapshot.tubes,'one undo snapshot restores the pre-entry board');

const level72=portalStages[1],level72Pair=level72.rules.portals[0];assert.equal(level72.tubes[level72Pair.exit].length,4,'level 72 starts with a full exit');assert.equal(level72.solution[0][0],level72Pair.exit,'level 72 frees exit capacity before using its entrance');
const level73=portalStages[2];assert.equal(level73.rules.portals.length,2,'level 73 introduces two named pairs');
const level74=portalStages[3],targetBoard=G.clone(level74.tubes),targetState=G.createRuleState(targetBoard,4,level74.rules);level74.solution.forEach(action=>applyAction(targetBoard,4,level74.rules,targetState,action));assert(targetBoard[0].length===4&&targetBoard[0].every(color=>color==='red'),'level 74 combines a portal with the red target');
const level75=portalStages[4],noFlip=G.createRuleState(level75.tubes,4,level75.rules),noForge=G.createRuleState(level75.tubes,4,level75.rules);noFlip.flipsRemaining=0;noForge.forgeRemaining=0;
assert.equal(finish(G.createSolveSearch(level75.tubes,4,{maxVisited:50000,rules:level75.rules,ruleState:noFlip})),'unsolvable','level 75 requires FLIP');assert.equal(finish(G.createSolveSearch(level75.tubes,4,{maxVisited:50000,rules:level75.rules,ruleState:noForge})),'unsolvable','level 75 requires COLOR FORGE');
assert.equal(level75.solution.filter(action=>action&&action.type==='dye').length,2);assert(level75.solution.some(action=>action&&action.type==='flip'),'level 75 combines portals, FLIP, and two dyes');

const mapBoard=[['red'],[],[],[]],mapState=G.createRuleState(mapBoard,4,{portals:[{entry:1,exit:2}]});assert.notEqual(G.stateKey(mapBoard,4,{portals:[{entry:1,exit:2}]},mapState),G.stateKey(mapBoard,4,{portals:[{entry:1,exit:3}]},mapState),'stateKey includes the directed portal map');

const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('js/app.js','utf8'),css=fs.readFileSync('css/style.css','utf8');
assert(html.includes('id="portal-lines"')&&html.includes('data/portal-stages.js?v=20260913-1'),'portal routes and stage data are loaded');
assert(app.includes("badge.className='portal-badge'")&&app.includes("portalBall.classList.add('warping-ball')"),'paired role badges and warp animation are wired');
assert(app.includes("var portalOut=CRGame.portalExit(state.rules,result.move.to)"),'Hint evaluates and displays the final portal route');
assert(css.includes('.portal-line')&&css.includes('@keyframes portalBall')&&css.includes('@media(max-width:370px){.portal-badge'),'symbols, line, animation, and 360px styles are explicit');

const saved70={unlockedStage:70,clearedStages:Array.from({length:70},(_,i)=>i+1),bestMoves:{'70':20},sound:true,vibration:true,tutorialCompleted:true,progressionVersion:3};
const storageContext={window:{CR_STAGES:stages},localStorage:{getItem:()=>JSON.stringify(saved70),setItem:()=>{}}};vm.createContext(storageContext);vm.runInContext(fs.readFileSync('js/storage.js','utf8'),storageContext,{filename:'js/storage.js'});const migrated=storageContext.window.CRStorage.load();assert.equal(migrated.unlockedStage,71,'players who cleared level 70 receive level 71');assert.equal(migrated.bestMoves['70'],20,'existing level 70 BEST survives');

console.log('PORTAL TUBES levels 71-75: exact minima, atomic warps, required routes, combo mechanics, UI, undo, and save migration passed');
