'use strict';

const fs=require('fs'),vm=require('vm');
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync('js/game.js','utf8'),context,{filename:'js/game.js'});
const G=context.window.CRGame;
const requested=(process.argv.find(arg=>arg.indexOf('--level=')===0)||'').split('=')[1];

function solve(tubes,capacity,rules,maxVisited,disabled,initialRuleState){
  const off=disabled||{},board=G.clone(tubes),ruleState=G.cloneRuleState(initialRuleState||G.createRuleState(board,capacity,rules));if(off.flip)ruleState.flipsRemaining=0;if(off.flow){ruleState.flowReady=false;G.breakCombo(rules,ruleState);}
  const queue=[{board,ruleState,parent:-1,action:null,depth:0}],visited=new Map([[G.stateKey(board,capacity,rules,ruleState),0]]);let cursor=0;
  while(cursor<queue.length){
    const node=queue[cursor],nodeIndex=cursor++;
    if(G.isCleared(node.board,capacity,rules,node.ruleState)){
      const solution=[];let at=nodeIndex;while(queue[at].parent>=0){solution.push(queue[at].action);at=queue[at].parent;}solution.reverse();return {status:'solved',distance:node.depth,solution,visited:visited.size};
    }
    const add=(next,nextState,action)=>{const key=G.stateKey(next,capacity,rules,nextState);if(visited.has(key))return true;if(visited.size>=maxVisited)return false;visited.set(key,queue.length);queue.push({board:next,ruleState:nextState,parent:nodeIndex,action,depth:node.depth+1});return true;};
    const equivalent=new Set();
    for(let from=0;from<node.board.length;from++)for(let to=0;to<node.board.length;to++)if(G.isLegalMove(node.board,from,to,capacity,rules,node.ruleState)){
      const signature=node.board[from].join(',')+'>'+node.board[to].join(',');if(equivalent.has(signature))continue;equivalent.add(signature);
      const next=G.clone(node.board),nextState=G.cloneRuleState(node.ruleState);if(off.flow){nextState.flowReady=false;G.breakCombo(rules,nextState);}G.applyMove(next,from,to,capacity,rules,nextState);if(off.flow){nextState.flowReady=false;G.breakCombo(rules,nextState);}if(!add(next,nextState,[from,to]))return {status:'unknown',visited:visited.size};
    }
    if(G.canFlip(rules,node.ruleState)){
      const next=G.clone(node.board),nextState=G.cloneRuleState(node.ruleState);G.applyFlip(next,rules,nextState);if(!add(next,nextState,{type:'flip'}))return {status:'unknown',visited:visited.size};
    }
  }
  return {status:'unsolvable',visited:visited.size};
}
function replay(tubes,capacity,rules,solution){
  const board=G.clone(tubes),ruleState=G.createRuleState(board,capacity,rules),flowMoves=[],flowCounts=[],earnedMoves=[],comboRuns=[];let run=[];
  solution.forEach((action,index)=>{
    if(action&&action.type==='flip'){if(!G.applyFlip(board,rules,ruleState))throw new Error('invalid FLIP '+(index+1));run=[];return;}
    const info=G.comboMoveInfo(board,action[0],action[1],capacity,rules,ruleState);if(!info)throw new Error('invalid move '+(index+1));const moved=G.applyMove(board,action[0],action[1],capacity,rules,ruleState);
    if(info.usesFlow){flowMoves.push(index+1);flowCounts.push(moved);run=[];}else if(info.qualifies){run=info.sameChain?run.concat(index+1):[index+1];if(info.earnsFlow){earnedMoves.push(index+1);comboRuns.push({color:info.color,moves:run.slice()});}}else run=[];
    if(board.some(tube=>tube.length>capacity))throw new Error('capacity exceeded at '+(index+1));
  });
  if(!G.isCleared(board,capacity,rules,ruleState))throw new Error('certificate did not clear');return {board,ruleState,flowMoves,flowCounts,earnedMoves,comboRuns};
}
function after(tubes,capacity,rules,actions){const board=G.clone(tubes),ruleState=G.createRuleState(board,capacity,rules);actions.forEach(action=>{if(action&&action.type==='flip')G.applyFlip(board,rules,ruleState);else G.applyMove(board,action[0],action[1],capacity,rules,ruleState);});return {board,ruleState};}

const specs=[
  {id:81,colors:3,tubes:[['red'],['blue','red'],['yellow','red'],['yellow','red','blue','blue'],['blue'],['yellow','yellow']],rules:{comboThreshold:2,requiredFlows:1},minimumMoves:7,seed:8100000},
  {id:82,colors:4,tubes:[['red'],['blue','red'],['yellow','red'],['yellow','red','blue','blue'],['blue'],['yellow','yellow'],['green','green'],['green'],['green']],rules:{comboThreshold:2,requiredFlows:1},minimumMoves:9,seed:8200000,choice:{prefix:[[1,0],[1,4],[2,0],[2,5],[7,6],[8,6]],optimal:[3,4],decoy:[0,1],penalty:2}},
  {id:83,colors:3,tubes:[['red','blue','red','red'],['blue','yellow','yellow','blue'],['blue','red','yellow','yellow'],[],[]],rules:{comboThreshold:3,requiredFlows:1},minimumMoves:11,seed:8300004,breakCheck:{prefix:[[0,3],[0,3],[1,0],[1,4],[1,4],[2,4]],move:[1,0],penalty:2}},
  {id:84,colors:3,tubes:[['yellow','red','yellow','blue'],['blue','red','red','blue'],['red','yellow','blue','yellow'],[]],rules:{comboThreshold:2,requiredFlows:2},minimumMoves:13,seed:8400006},
  {id:85,colors:4,tubes:[['yellow','yellow','blue','yellow'],['yellow','green','green','red'],['red','blue','blue','green'],['red','red','green','blue'],[]],rules:{flipLimit:1,targets:{0:'red'},comboThreshold:3,requiredFlows:1},minimumMoves:15,seed:8500006,requireFlip:true}
];

const results=[];
for(const spec of specs){
  if(requested&&String(spec.id)!==requested)continue;
  const solved=solve(spec.tubes,4,spec.rules,50000,{});if(solved.status!=='solved'||solved.distance!==spec.minimumMoves)throw new Error('minimum changed for level '+spec.id+': '+solved.status+' '+solved.distance);
  const played=replay(spec.tubes,4,spec.rules,solved.solution);if(played.flowMoves.length!==spec.rules.requiredFlows||played.flowCounts.some(count=>count<2))throw new Error('meaningful FLOW use changed for level '+spec.id);
  const noFlow=solve(spec.tubes,4,spec.rules,50000,{flow:true});if(noFlow.status!=='unsolvable')throw new Error('FLOW is not required for level '+spec.id);
  const result={id:spec.id,sourceId:spec.id,progressionRank:spec.id,colors:spec.colors,capacity:4,tubes:spec.tubes,difficulty:'combo',minimumMoves:solved.distance,comboRuns:played.comboRuns,flowEarnedMoves:played.earnedMoves,flowMoves:played.flowMoves,flowCounts:played.flowCounts,rules:spec.rules,solution:solved.solution,verifiedMoves:solved.distance,generatedSeed:spec.seed};
  if(spec.choice){const ready=after(spec.tubes,4,spec.rules,spec.choice.prefix),optimalInfo=G.comboMoveInfo(ready.board,spec.choice.optimal[0],spec.choice.optimal[1],4,spec.rules,ready.ruleState),decoyInfo=G.comboMoveInfo(ready.board,spec.choice.decoy[0],spec.choice.decoy[1],4,spec.rules,ready.ruleState);if(!ready.ruleState.flowReady||!optimalInfo||!decoyInfo||!optimalInfo.usesFlow||!decoyInfo.usesFlow)throw new Error('level 82 choice preview changed');const optimal=after(ready.board,4,spec.rules,[]),decoy=after(ready.board,4,spec.rules,[]);optimal.ruleState=G.cloneRuleState(ready.ruleState);decoy.ruleState=G.cloneRuleState(ready.ruleState);G.applyMove(optimal.board,spec.choice.optimal[0],spec.choice.optimal[1],4,spec.rules,optimal.ruleState);G.applyMove(decoy.board,spec.choice.decoy[0],spec.choice.decoy[1],4,spec.rules,decoy.ruleState);const optimalTail=solve(optimal.board,4,spec.rules,50000,{},optimal.ruleState),decoyTail=solve(decoy.board,4,spec.rules,50000,{},decoy.ruleState);if(optimalTail.status!=='solved'||decoyTail.status!=='solved'||decoyTail.distance-optimalTail.distance!==spec.choice.penalty)throw new Error('level 82 choice penalty changed');result.choicePrefix=spec.choice.prefix;result.optimalFlowMove=spec.choice.optimal;result.decoyFlowMove=spec.choice.decoy;result.decoyPenalty=spec.choice.penalty;}
  if(spec.breakCheck){const charged=after(spec.tubes,4,spec.rules,spec.breakCheck.prefix),info=G.comboMoveInfo(charged.board,spec.breakCheck.move[0],spec.breakCheck.move[1],4,spec.rules,charged.ruleState);if(!info||info.breakReason!=='color')throw new Error('level 83 color-switch preview changed');const brokenBoard=G.clone(charged.board),brokenState=G.cloneRuleState(charged.ruleState);G.applyMove(brokenBoard,spec.breakCheck.move[0],spec.breakCheck.move[1],4,spec.rules,brokenState);const tail=solve(brokenBoard,4,spec.rules,50000,{},brokenState),planned=spec.minimumMoves-spec.breakCheck.prefix.length;if(tail.status!=='solved'||1+tail.distance-planned!==spec.breakCheck.penalty)throw new Error('level 83 break penalty changed');result.breakPrefix=spec.breakCheck.prefix;result.breakMove=spec.breakCheck.move;result.breakPenalty=spec.breakCheck.penalty;}
  if(spec.requireFlip){const noFlip=solve(spec.tubes,4,spec.rules,50000,{flip:true});if(noFlip.status!=='unsolvable'||!solved.solution.some(action=>action&&action.type==='flip'))throw new Error('FLIP is not required for level '+spec.id);result.flipMoves=solved.solution.map((action,index)=>action&&action.type==='flip'?index+1:null).filter(Boolean);}
  results.push(result);console.log(JSON.stringify(result));
}
if(!requested&&results.some((stage,index)=>index&&stage.minimumMoves<=results[index-1].minimumMoves))throw new Error('minimum moves must rise');
