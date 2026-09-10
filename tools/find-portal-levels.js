'use strict';

const fs=require('fs'),vm=require('vm');
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync('js/game.js','utf8'),context,{filename:'js/game.js'});
const G=context.window.CRGame;
const palette=['red','blue','yellow','green','purple','orange','cyan','pink'];
const requested=(process.argv.find(arg=>arg.indexOf('--level=')===0)||'').split('=')[1];
const attemptArg=(process.argv.find(arg=>arg.indexOf('--attempts=')===0)||'').split('=')[1],attempts=attemptArg?Math.max(1,Number(attemptArg)):50000,debug=process.argv.includes('--debug');

function rng(seed){let value=seed>>>0;return function(){value=(value*1664525+1013904223)>>>0;return value/4294967296;};}
function randomBoard(colors,capacity,sizes,seed){
  const values=[];for(let color=0;color<colors;color++)for(let n=0;n<capacity;n++)values.push(palette[color]);
  const random=rng(seed);for(let i=values.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
  const board=[],work=values.slice();for(const size of sizes)board.push(work.splice(0,size));if(work.length)throw new Error('layout does not consume inventory');return board;
}
function goals(colors,capacity){const result={};for(let i=0;i<colors;i++)result[palette[i]]=capacity;return result;}
function finish(job){let result;do{result=job.step(5000);}while(result==='searching'||result.status==='searching');return result;}
function solve(tubes,capacity,rules,maxVisited,disabled,initialRuleState){
  const board=G.clone(tubes),ruleState=G.cloneRuleState(initialRuleState||G.createRuleState(board,capacity,rules)),off=disabled||{};
  if(off.flip)ruleState.flipsRemaining=0;if(off.forge)ruleState.forgeRemaining=0;
  const queue=[{board,ruleState,parent:-1,action:null,depth:0}],visited=new Map([[G.stateKey(board,capacity,rules,ruleState),0]]);let cursor=0;
  while(cursor<queue.length){
    const node=queue[cursor],nodeIndex=cursor++;
    if(G.isCleared(node.board,capacity,rules)){
      const solution=[];let at=nodeIndex;while(queue[at].parent>=0){solution.push(queue[at].action);at=queue[at].parent;}solution.reverse();
      return {status:'solved',distance:node.depth,solution,visited:visited.size};
    }
    const add=(next,nextState,action)=>{const key=G.stateKey(next,capacity,rules,nextState);if(visited.has(key))return true;if(visited.size>=maxVisited)return false;visited.set(key,queue.length);queue.push({board:next,ruleState:nextState,parent:nodeIndex,action,depth:node.depth+1});return true;};
    for(let from=0;from<node.board.length;from++)for(let to=0;to<node.board.length;to++)if(G.isLegalMove(node.board,from,to,capacity,rules,node.ruleState)){
      const exit=G.portalExit(rules,to);if(off.portal&&exit>=0)continue;const next=G.clone(node.board),nextState=G.cloneRuleState(node.ruleState);G.applyMove(next,from,to,capacity,rules,nextState);if(!add(next,nextState,{from,to,portalExit:exit>=0?exit:null}))return {status:'unknown',visited:visited.size};
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
function replaceColor(board,color,seed){const positions=[];board.forEach((tube,tubeIndex)=>tube.forEach((value,slot)=>{if(value===color)positions.push([tubeIndex,slot]);}));if(!positions.length)return false;const at=positions[seed%positions.length];board[at[0]][at[1]]='gray';return true;}
function comboForgeBoard(base,variant){const board=G.clone(base),colors=['red','blue'];colors.forEach((color,colorIndex)=>{const positions=[];board.forEach((tube,tubeIndex)=>tube.forEach((value,slot)=>{if(value===color)positions.push([tubeIndex,slot]);}));const at=positions[colorIndex?Math.floor(variant/4)%positions.length:variant%positions.length];board[at[0]][at[1]]='gray';});board.forEach(tube=>tube.reverse());return board;}
function portalUses(solution){return solution.map((action,index)=>action&&Number.isInteger(action.portalExit)?index+1:null).filter(Boolean);}
function usedEntries(solution){return new Set(solution.filter(action=>action&&Number.isInteger(action.portalExit)).map(action=>action.to));}

const specs=[
  {id:71,colors:3,sizes:[4,4,2,2],portals:[{entry:2,exit:3,symbol:'A'}],min:5,max:18},
  {id:72,colors:4,sizes:[4,3,3,3,3],portals:[{entry:4,exit:0,symbol:'A'}],min:8,max:30,blockedExit:true},
  {id:73,colors:4,sizes:[4,4,2,2,2,2],portals:[{entry:2,exit:3,symbol:'A'},{entry:4,exit:5,symbol:'B'}],min:13,max:30,allPairs:true},
  {id:74,colors:4,sizes:[4,4,2,2,2,2],portals:[{entry:2,exit:3,symbol:'A'}],targets:{0:'red'},min:16,max:32},
  {id:75,colors:4,portals:[{entry:2,exit:3,symbol:'A'},{entry:4,exit:5,symbol:'B'}],flipLimit:1,forge:['red','blue'],stock:{red:1,blue:1},min:24,max:40,allPairs:true,requireFlip:true,requireForge:true,variantCount:16,makeBoard:function(variant){return comboForgeBoard([["blue","red","yellow","red"],["yellow","yellow","green","yellow"],["red","blue"],["red","blue"],["green","green"],["green","blue"]],variant);}}
];

let previous=0;
for(const spec of specs){
  if(requested&&String(spec.id)!==requested)continue;
  let found=null,quickSolved=0,bfsSolved=0,noPortalDead=0,observed=[];const firstSeed=spec.id*100000,lastSeed=firstSeed+(spec.preset?1:spec.variantCount||attempts);
  search:for(let seed=firstSeed;seed<lastSeed&&!found;seed++)for(const portals of (spec.portalVariants||[spec.portals])){
    const board=spec.makeBoard?spec.makeBoard(seed-firstSeed):spec.preset?G.clone(spec.preset):randomBoard(spec.colors,4,spec.sizes,seed);if(spec.forge&&!spec.preset&&!spec.makeBoard)spec.forge.forEach((color,index)=>replaceColor(board,color,seed+index));
    const rules={portals};if(spec.targets)rules.targets=spec.targets;if(spec.flipLimit)rules.flipLimit=spec.flipLimit;if(spec.forge){rules.forgeLimit=spec.forge.length;rules.dyeStock=spec.stock;rules.dyeGoals=goals(spec.colors,4);}
    if(spec.blockedExit&&board[portals[0].exit].length!==4)continue;
    if(finish(G.createSolveSearch(board,4,{maxVisited:spec.quickLimit||2000,rules,ruleState:G.createRuleState(board,4,rules)}))!=='solvable')continue;quickSolved++;
    const solved=solve(board,4,rules,50000,{});if(solved.status==='solved'&&observed.length<24)observed.push({seed,portals,distance:solved.distance});if(solved.status!=='solved'||solved.distance<Math.max(spec.min,previous+1)||solved.distance>spec.max)continue;
    bfsSolved++;
    const uses=portalUses(solved.solution);if(!uses.length)continue;if(spec.allPairs&&usedEntries(solved.solution).size!==portals.length)continue;
    const noPortal=solve(board,4,rules,50000,{portal:true});if(noPortal.status!=='unsolvable')continue;noPortalDead++;
    if(spec.requireFlip){const noFlip=solve(board,4,rules,50000,{flip:true});if(noFlip.status!=='unsolvable'||!solved.solution.some(action=>action&&action.type==='flip'))continue;}
    if(spec.requireForge){const noForge=solve(board,4,rules,50000,{forge:true});if(noForge.status!=='unsolvable'||solved.solution.filter(action=>action&&action.type==='dye').length!==spec.forge.length)continue;}
    const certificate=solved.solution.map(action=>action&&Number.isInteger(action.from)?[action.from,action.to]:action);
    found={id:spec.id,colors:spec.colors,capacity:4,tubes:board,difficulty:'portal',minimumMoves:solved.distance,portalMoves:uses,flipMoves:solved.solution.map((action,index)=>action&&action.type==='flip'?index+1:null).filter(Boolean),dyeMoves:solved.solution.map((action,index)=>action&&action.type==='dye'?index+1:null).filter(Boolean),rules,solution:certificate,verifiedMoves:solved.distance,seed,visited:solved.visited,noPortalVisited:noPortal.visited};break search;
  }
  if(!found){if(debug)console.error(JSON.stringify({id:spec.id,attempts,quickSolved,bfsSolved,noPortalDead,observed}));throw new Error('no candidate for level '+spec.id);}
  previous=found.minimumMoves;console.log(JSON.stringify(found));
}
