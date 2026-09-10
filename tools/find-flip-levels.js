'use strict';

const fs=require('fs'),vm=require('vm');
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync('js/game.js','utf8'),context,{filename:'js/game.js'});
const G=context.window.CRGame;
const palette=['red','blue','yellow','green','purple','orange','cyan','pink'];

function rng(seed){let value=seed>>>0;return function(){value=(value*1664525+1013904223)>>>0;return value/4294967296;};}
function randomBoard(colors,capacity,empty,seed){
  const values=[];for(let color=0;color<colors;color++)for(let n=0;n<capacity;n++)values.push(palette[color]);
  const random=rng(seed);for(let i=values.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
  const board=[];for(let i=0;i<colors;i++)board.push(values.slice(i*capacity,(i+1)*capacity));for(let i=0;i<empty;i++)board.push([]);return board;
}
function solve(tubes,capacity,rules,maxVisited,disableFlip){
  const board=G.clone(tubes),ruleState=G.createRuleState(board,capacity,rules);if(disableFlip)ruleState.flipsRemaining=0;
  const queue=[{board,ruleState,parent:-1,action:null,depth:0}],visited=new Map([[G.stateKey(board,capacity,rules,ruleState),0]]);let cursor=0;
  while(cursor<queue.length){
    const node=queue[cursor],nodeIndex=cursor++;
    if(G.isCleared(node.board,capacity,rules)){
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
  }
  return {status:'unsolvable',visited:visited.size};
}

const specs=[
  {id:61,colors:3,empty:1,flipLimit:1,min:5,max:12,requiredFlips:1},
  {id:62,colors:4,empty:1,flipLimit:1,min:8,max:18,requiredFlips:1},
  {id:63,colors:4,empty:1,flipLimit:2,min:11,max:24,requiredFlips:2},
  {id:64,colors:5,empty:2,flipLimit:1,min:14,max:30,requiredFlips:1,locked:true},
  {id:65,colors:5,empty:1,flipLimit:2,min:17,max:36,requiredFlips:1,target:true}
];
let previous=0;
for(const spec of specs){
  let found=null;
  for(let seed=spec.id*100000;seed<spec.id*100000+50000&&!found;seed++){
    const board=randomBoard(spec.colors,4,spec.empty,seed),rules={flipLimit:spec.flipLimit};
    if(spec.locked){rules.lockedTubes=[0];rules.unlockAfterCompleted=1;}
    if(spec.target)rules.targets={0:palette[0]};
    const initial=G.createRuleState(board,4,rules);if(spec.locked&&initial.locksOpen)continue;
    const noFlip=solve(board,4,rules,50000,true);if(noFlip.status!=='unsolvable')continue;
    const solved=solve(board,4,rules,50000,false);if(solved.status!=='solved'||solved.distance<Math.max(spec.min,previous+1)||solved.distance>spec.max)continue;
    const usedFlips=solved.solution.filter(action=>action&&action.type==='flip').length;if(usedFlips!==spec.requiredFlips)continue;
    if(spec.locked&&!solved.solution.some(action=>Array.isArray(action)&&(action[0]===0||action[1]===0)))continue;
    found={id:spec.id,colors:spec.colors,capacity:4,tubes:board,difficulty:'flip',minimumMoves:solved.distance,flipMoves:solved.solution.map((action,index)=>action&&action.type==='flip'?index+1:null).filter(Boolean),rules,solution:solved.solution,verifiedMoves:solved.distance,seed,visited:solved.visited,noFlipVisited:noFlip.visited};
  }
  if(!found)throw new Error('no candidate for level '+spec.id);
  previous=found.minimumMoves;console.log(JSON.stringify(found));
}
