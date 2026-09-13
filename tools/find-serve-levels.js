'use strict';

const fs=require('fs'),vm=require('vm');
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync('js/game.js','utf8'),context,{filename:'js/game.js'});
const G=context.window.CRGame;
const requested=(process.argv.find(arg=>arg.indexOf('--level=')===0)||'').split('=')[1];

function solve(tubes,capacity,rules,maxVisited,disableFlip){
  const board=G.clone(tubes),ruleState=G.createRuleState(board,capacity,rules);if(disableFlip)ruleState.flipsRemaining=0;
  const queue=[{board,ruleState,parent:-1,action:null,depth:0}],visited=new Map([[G.stateKey(board,capacity,rules,ruleState),0]]);let cursor=0;
  while(cursor<queue.length){
    const node=queue[cursor],nodeIndex=cursor++;
    if(G.isCleared(node.board,capacity,rules,node.ruleState)){
      const solution=[];let at=nodeIndex;while(queue[at].parent>=0){solution.push(queue[at].action);at=queue[at].parent;}solution.reverse();
      return {status:'solved',distance:node.depth,solution,visited:visited.size};
    }
    const add=(next,nextState,action)=>{const key=G.stateKey(next,capacity,rules,nextState);if(visited.has(key))return true;if(visited.size>=maxVisited)return false;visited.set(key,queue.length);queue.push({board:next,ruleState:nextState,parent:nodeIndex,action,depth:node.depth+1});return true;};
    for(let from=0;from<node.board.length;from++)for(let to=0;to<node.board.length;to++)if(G.isLegalMove(node.board,from,to,capacity,rules,node.ruleState)){
      const next=G.clone(node.board),nextState=G.cloneRuleState(node.ruleState);G.applyMove(next,from,to,capacity,rules,nextState);if(!add(next,nextState,[from,to]))return {status:'unknown',visited:visited.size};
    }
    if(G.canFlip(rules,node.ruleState)){
      const next=G.clone(node.board),nextState=G.cloneRuleState(node.ruleState);G.applyFlip(next,rules,nextState);if(!add(next,nextState,{type:'flip'}))return {status:'unknown',visited:visited.size};
    }
    for(let tube=0;tube<node.board.length;tube++)for(const color of G.dyeChoices(node.board,tube,rules,node.ruleState)){
      const next=G.clone(node.board),nextState=G.cloneRuleState(node.ruleState);G.applyDye(next,tube,color,capacity,rules,nextState);if(!add(next,nextState,{type:'dye',tube,color}))return {status:'unknown',visited:visited.size};
    }
  }
  return {status:'unsolvable',visited:visited.size};
}
function applyAction(board,capacity,rules,ruleState,action){if(action&&action.type==='flip')return G.applyFlip(board,rules,ruleState);if(action&&action.type==='dye')return G.applyDye(board,action.tube,action.color,capacity,rules,ruleState);return G.applyMove(board,action[0],action[1],capacity,rules,ruleState);}
function shipmentTimeline(tubes,capacity,rules,solution){
  const board=G.clone(tubes),ruleState=G.createRuleState(board,capacity,rules),moves=[],order=[];let before=ruleState.serveProgress.slice();
  solution.forEach((action,index)=>{if(!applyAction(board,capacity,rules,ruleState,action))throw new Error('invalid certificate move '+(index+1));ruleState.serveProgress.forEach((served,laneIndex)=>{for(let n=before[laneIndex]||0;n<served;n++){const lane=G.serveLanes(rules)[laneIndex],batch=[lane.initial].concat(lane.queue||[])[n];moves.push(index+1);order.push((lane.symbol||String.fromCharCode(65+laneIndex))+':'+batch.target);}});before=ruleState.serveProgress.slice();});
  if(!G.isCleared(board,capacity,rules,ruleState))throw new Error('certificate did not ship every order');return {moves,order};
}

const specs=[
  {id:76,colors:3,tubes:[["red","blue"],["red","yellow","red"],["red","yellow"],["red"],[]],rules:{serveLanes:[{tube:3,symbol:'A',initial:{target:'red',balls:['red']},queue:[]}]},minimumMoves:5,seed:7600000},
  {id:77,colors:2,tubes:[["red","blue","red"],["blue","red"],[],["red"]],rules:{serveLanes:[{tube:3,symbol:'A',initial:{target:'red',balls:['red']},queue:[{target:'blue',balls:['blue','blue']}]}]},minimumMoves:6,seed:7700000},
  {id:78,colors:2,tubes:[["red","blue"],["blue","red"],[],["red","blue"],["blue","red"]],rules:{serveLanes:[{tube:3,symbol:'A',initial:{target:'red',balls:['red','blue']},queue:[]},{tube:4,symbol:'B',initial:{target:'blue',balls:['blue','red']},queue:[]}]},minimumMoves:7,seed:7800000,alternateSolution:[[4,1],[3,4],[0,4],[1,3],[1,3],[1,4],[0,3]],alternateShipmentOrder:['B:blue','A:red']},
  {id:79,colors:4,tubes:[["red","blue"],["blue","red"],[],["red","blue"],["blue","red"]],rules:{serveLanes:[{tube:3,symbol:'A',initial:{target:'red',balls:['red','blue']},queue:[{target:'green',balls:['green','yellow','green','yellow']}]},{tube:4,symbol:'B',initial:{target:'blue',balls:['blue','red']},queue:[{target:'yellow',balls:['yellow','green','yellow','green']}]}]},minimumMoves:17,seed:7900000},
  {id:80,colors:3,tubes:[["yellow","red","blue","blue"],["yellow","red","blue","yellow"],["blue","yellow","red","red"],[]],rules:{flipLimit:1,serveLanes:[{tube:3,symbol:'A',initial:{target:'red',balls:[]},queue:[{target:'blue',balls:['yellow']},{target:'yellow',balls:['red']}]}]},minimumMoves:21,seed:8000000,requireFlip:true}
];

let previous=0;
for(const spec of specs){
  if(requested&&String(spec.id)!==requested)continue;
  const solved=solve(spec.tubes,4,spec.rules,50000,false);if(solved.status!=='solved')throw new Error('no solution for level '+spec.id);if(solved.distance!==spec.minimumMoves)throw new Error('minimum changed for level '+spec.id+': '+solved.distance);if(solved.distance<=previous)throw new Error('minimum must rise at level '+spec.id);previous=solved.distance;
  const timeline=shipmentTimeline(spec.tubes,4,spec.rules,solved.solution),result={id:spec.id,sourceId:spec.id,progressionRank:spec.id,colors:spec.colors,capacity:4,tubes:spec.tubes,difficulty:'serve',minimumMoves:solved.distance,shipmentMoves:timeline.moves,shipmentOrder:timeline.order,rules:spec.rules,solution:solved.solution,verifiedMoves:solved.distance,generatedSeed:spec.seed};
  if(spec.alternateSolution){const alternate=shipmentTimeline(spec.tubes,4,spec.rules,spec.alternateSolution);if(alternate.order.join('|')!==spec.alternateShipmentOrder.join('|'))throw new Error('alternate order changed for level '+spec.id);result.alternateShipmentOrder=spec.alternateShipmentOrder;result.alternateSolution=spec.alternateSolution;}
  if(spec.requireFlip){const noFlip=solve(spec.tubes,4,spec.rules,50000,true);if(noFlip.status!=='unsolvable'||!solved.solution.some(action=>action&&action.type==='flip'))throw new Error('FLIP is not required for level '+spec.id);result.flipMoves=solved.solution.map((action,index)=>action&&action.type==='flip'?index+1:null).filter(Boolean);}
  console.log(JSON.stringify(result));
}
