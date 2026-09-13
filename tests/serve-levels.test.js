'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={window:{}};vm.createContext(context);
for(const file of ['js/game.js','js/hint.js','data/stages.js','data/advanced-stages.js','data/progression.js','data/flip-stages.js','data/forge-stages.js','data/portal-stages.js','data/serve-stages.js','js/stage.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});context.CRGame=context.window.CRGame;
}
const G=context.window.CRGame,H=context.window.CRHint,stages=context.window.CR_STAGES,serveStages=stages.slice(75);
const plain=value=>JSON.parse(JSON.stringify(value));

assert.equal(stages.length,80,'the complete game has 80 levels');
assert.deepEqual(serveStages.map(stage=>stage.id),[76,77,78,79,80],'SORT & SERVE ids are contiguous');
const worlds=context.window.CRStage.worlds(stages.length),serveWorld=worlds.at(-1);
assert.equal(worlds.length,10,'ten world tabs cover all levels');
assert.deepEqual([serveWorld.key,serveWorld.start,serveWorld.end],['serve',76,80],'SORT & SERVE owns levels 76-80');

function finish(job){let result;do{result=job.step(5000);}while(result==='searching'||result.status==='searching');return result;}
function applyAction(board,capacity,rules,ruleState,action){if(action&&action.type==='flip')return G.applyFlip(board,rules,ruleState);if(action&&action.type==='dye')return G.applyDye(board,action.tube,action.color,capacity,rules,ruleState);return G.applyMove(board,action[0],action[1],capacity,rules,ruleState);}
function ballCount(board){return board.reduce((sum,tube)=>sum+tube.length,0);}
function replay(stage,solution=stage.solution){
  const capacity=stage.capacity||4,rules=stage.rules,lanes=G.serveLanes(rules),board=G.clone(stage.tubes),ruleState=G.createRuleState(board,capacity,rules),shipmentMoves=[],shipmentOrder=[];
  solution.forEach((action,index)=>{
    const beforeProgress=ruleState.serveProgress.slice(),beforeCount=ballCount(board);
    assert.equal(applyAction(board,capacity,rules,ruleState,action),1,`level ${stage.id}: action ${index+1} is legal`);
    let expectedDelta=0;
    ruleState.serveProgress.forEach((progress,laneIndex)=>{
      const lane=lanes[laneIndex],batches=[lane.initial].concat(lane.queue||[]);
      for(let served=beforeProgress[laneIndex]||0;served<progress;served++){
        const next=batches[served+1]||null;shipmentMoves.push(index+1);shipmentOrder.push((lane.symbol||String.fromCharCode(65+laneIndex))+':'+batches[served].target);expectedDelta+=(next?next.balls.length:0)-capacity;
        assert.deepEqual(plain(board[lane.tube]),plain(next?next.balls:[]),`level ${stage.id}: announced batch arrives at dock ${lane.symbol}`);
      }
    });
    assert.equal(ballCount(board)-beforeCount,expectedDelta,`level ${stage.id}: shipped balls leave inventory exactly once at action ${index+1}`);
    board.forEach(tube=>assert(tube.length<=capacity,`level ${stage.id}: capacity remains valid`));
  });
  return {board,ruleState,shipmentMoves,shipmentOrder};
}

let previousMinimum=0;
serveStages.forEach(stage=>{
  const capacity=stage.capacity||4,rules=stage.rules,lanes=G.serveLanes(rules),initialBoard=G.clone(stage.tubes),initialState=G.createRuleState(initialBoard,capacity,rules);
  assert.equal(stage.moveLimit,null,`level ${stage.id}: delivery play has no time or move limit`);
  assert(stage.minimumMoves>previousMinimum,`level ${stage.id}: exact minimum rises`);previousMinimum=stage.minimumMoves;
  assert(lanes.length>=1,`level ${stage.id}: at least one delivery lane`);
  assert.equal(new Set(lanes.map(lane=>lane.tube)).size,lanes.length,`level ${stage.id}: delivery docks are unique`);
  assert.equal(G.servedCount(rules,initialState),0,`level ${stage.id}: no order starts pre-shipped`);
  lanes.forEach((lane,laneIndex)=>{
    const batches=[lane.initial].concat(lane.queue||[]);assert(batches.length>=1,`level ${stage.id}: lane ${laneIndex} has an initial batch`);
    assert(lane.tube>=0&&lane.tube<stage.tubes.length,`level ${stage.id}: dock is in range`);
    assert.deepEqual(plain(stage.tubes[lane.tube]),plain(lane.initial.balls),`level ${stage.id}: initial announced batch matches the board`);
    batches.forEach((batch,batchIndex)=>{assert(typeof batch.target==='string'&&batch.target,`level ${stage.id}: batch target is explicit`);assert(Array.isArray(batch.balls)&&batch.balls.length<=capacity,`level ${stage.id}: batch ${batchIndex} content is deterministic and fits`);});
  });
  assert.equal(stage.solution.length,stage.verifiedMoves,`level ${stage.id}: certificate length`);
  const played=replay(stage);assert.deepEqual(played.shipmentMoves,Array.from(stage.shipmentMoves),`level ${stage.id}: declared shipment timing`);assert.deepEqual(played.shipmentOrder,Array.from(stage.shipmentOrder),`level ${stage.id}: declared shipment order`);
  assert.equal(G.servedCount(rules,played.ruleState),G.serveTotal(rules),`level ${stage.id}: every order ships`);assert(G.isCleared(played.board,capacity,rules,played.ruleState),`level ${stage.id}: all shipped orders clear the stage`);
  const stableProgress=played.ruleState.serveProgress.slice(),stableBoard=G.clone(played.board);assert.deepEqual(plain(G.processServe(played.board,capacity,rules,played.ruleState)),[],`level ${stage.id}: shipped orders cannot be counted twice`);assert.deepEqual(plain(played.ruleState.serveProgress),plain(stableProgress),`level ${stage.id}: completed progress is stable`);assert.deepEqual(plain(played.board),plain(stableBoard),`level ${stage.id}: duplicate processing changes no ball`);
  const exact=finish(H.search(stage.tubes,capacity,{maxVisited:50000,rules,ruleState:G.createRuleState(stage.tubes,capacity,rules)}));assert.equal(exact.status,'solved',`level ${stage.id}: production Hint solves initial state`);assert.equal(exact.distance,stage.minimumMoves,`level ${stage.id}: production BFS proves exact minimum`);
});

const level76=serveStages[0],played76=replay(level76);assert.equal(G.serveTotal(level76.rules),1,'level 76 introduces one shipment');assert(ballCount(played76.board)>0,'all orders, rather than ordinary full-board sorting, define clear');
const level77=serveStages[1],board77=G.clone(level77.tubes),state77=G.createRuleState(board77,4,level77.rules);level77.solution.slice(0,3).forEach(action=>applyAction(board77,4,level77.rules,state77,action));const undoSnapshot={tubes:G.clone(board77),ruleState:G.cloneRuleState(state77)};applyAction(board77,4,level77.rules,state77,level77.solution[3]);assert.deepEqual(plain(board77[3]),['blue','blue'],'the previewed blue batch arrives after red ships');board77.splice(0,board77.length,...G.clone(undoSnapshot.tubes));Object.assign(state77,G.cloneRuleState(undoSnapshot.ruleState));assert.deepEqual(plain(board77),plain(undoSnapshot.tubes),'one undo restores the pre-shipment board');assert.deepEqual(plain(state77.serveProgress),[0],'one undo restores shipment and queue progress');assert.equal(G.serveStatus(level77.rules,state77,0).current.target,'red','undo restores the current order');

const level78=serveStages[2],alternate78=replay(level78,level78.alternateSolution);assert.deepEqual(alternate78.shipmentOrder,Array.from(level78.alternateShipmentOrder),'level 78 permits the opposite shipment order');assert.notDeepEqual(alternate78.shipmentOrder,Array.from(level78.shipmentOrder),'level 78 makes order a player choice');
const level79=serveStages[3];assert.equal(G.serveLanes(level79.rules).length,2,'level 79 has multiple delivery lanes');G.serveLanes(level79.rules).forEach(lane=>assert(lane.queue.length>=1,'each level 79 dock has its own waiting queue'));
const level80=serveStages[4],noFlip=G.createRuleState(level80.tubes,4,level80.rules);noFlip.flipsRemaining=0;assert.equal(finish(G.createSolveSearch(level80.tubes,4,{maxVisited:50000,rules:level80.rules,ruleState:noFlip})),'unsolvable','level 80 requires FLIP');assert(level80.solution.some(action=>action&&action.type==='flip'),'level 80 combines a delivery queue with FLIP');

const keyBoard=[['red'],[]],keyRules={serveLanes:[{tube:1,initial:{target:'red',balls:[]},queue:[{target:'blue',balls:['blue']}] }]},keyState=G.createRuleState(keyBoard,2,keyRules),progressed=G.cloneRuleState(keyState);progressed.serveProgress[0]=1;assert.notEqual(G.stateKey(keyBoard,2,keyRules,keyState),G.stateKey(keyBoard,2,keyRules,progressed),'stateKey keeps shipment progress distinct');const otherQueue={serveLanes:[{tube:1,initial:{target:'red',balls:[]},queue:[{target:'yellow',balls:['yellow']}] }]};assert.notEqual(G.stateKey(keyBoard,2,keyRules,keyState),G.stateKey(keyBoard,2,otherQueue,G.createRuleState(keyBoard,2,otherQueue)),'stateKey includes announced arrival content');

const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('js/app.js','utf8'),css=fs.readFileSync('css/style.css','utf8'),generator=fs.readFileSync('tools/find-serve-levels.js','utf8');
assert(html.includes('id="serve-area"')&&html.includes('data/serve-stages.js?v=20260913-2'),'the queue surface and stage data are loaded');assert(html.includes('<span id="stage-total">85</span>'),'the header announces all 85 levels');
assert(app.includes("serveBadge.className='serve-badge'")&&app.includes("tube.classList.add('serve-arriving')"),'dock badges and shipment-arrival animation are wired');assert(app.includes("serveCard.classList.add('hint-serve')")&&app.includes('CRGame.applyMove(hintBoard'),'Hint previews the post-shipment state');assert(app.includes('state.ruleState=CRGame.cloneRuleState(state.initialRuleState)'),'Restart restores shipment and queue progress');assert(css.includes('.serve-flow')&&css.includes('@keyframes serveDock')&&css.includes('@media(max-width:370px){.serve .tube-board'),'queue, animation, and 360px styles are explicit');assert(!fs.readFileSync('data/serve-stages.js','utf8').includes('Math.random'),'arrival order contains no hidden randomness');assert(generator.includes("noFlip.status!=='unsolvable'")&&generator.includes('shipmentTimeline'),'the deterministic generator proves combo necessity and shipment timing');

const saved75={unlockedStage:75,clearedStages:Array.from({length:75},(_,i)=>i+1),bestMoves:{'75':24},sound:true,vibration:true,tutorialCompleted:true,progressionVersion:3};const storageContext={window:{CR_STAGES:stages},localStorage:{getItem:()=>JSON.stringify(saved75),setItem:()=>{}}};vm.createContext(storageContext);vm.runInContext(fs.readFileSync('js/storage.js','utf8'),storageContext,{filename:'js/storage.js'});const migrated=storageContext.window.CRStorage.load();assert.equal(migrated.unlockedStage,76,'players who cleared level 75 receive level 76');assert.equal(migrated.bestMoves['75'],24,'existing level 75 BEST survives');

console.log('SORT & SERVE levels 76-80: exact minima, deterministic queues, atomic shipment/arrival, order choice, FLIP combo, UI, undo, and save migration passed');
