'use strict';

const fs=require('fs'),vm=require('vm');
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync('js/game.js','utf8'),context,{filename:'js/game.js'});
const G=context.window.CRGame;
const palette=['red','blue','yellow','green','purple','orange','cyan','pink'];
const requested=(process.argv.find(arg=>arg.indexOf('--level=')===0)||'').split('=')[1];

function rng(seed){let value=seed>>>0;return function(){value=(value*1664525+1013904223)>>>0;return value/4294967296;};}
function randomBoard(colors,capacity,empty,seed){
  const values=[];for(let color=0;color<colors;color++)for(let n=0;n<capacity;n++)values.push(palette[color]);
  const random=rng(seed);for(let i=values.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
  const board=[];for(let i=0;i<colors;i++)board.push(values.slice(i*capacity,(i+1)*capacity));for(let i=0;i<empty;i++)board.push([]);return board;
}
function replaceAt(board,color,kind,skip){
  const positions=[];board.forEach((tube,tubeIndex)=>tube.forEach((value,slot)=>{if(value===color&&(kind==='any'||(kind==='top'&&slot===tube.length-1)||(kind==='buried'&&slot<tube.length-1)))positions.push([tubeIndex,slot]);}));
  if(!positions.length)return false;const at=positions[(skip||0)%positions.length];board[at[0]][at[1]]='gray';return at;
}
function goals(colors,capacity){const result={};for(let i=0;i<colors;i++)result[palette[i]]=capacity;return result;}
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
function firstDye(solution){return solution.find(action=>action&&action.type==='dye');}
function wrongFirstDyeIsDead(board,capacity,rules,solution,maxVisited){
  const action=firstDye(solution);if(!action)return false;
  const state=G.createRuleState(board,capacity,rules),work=G.clone(board);
  for(const step of solution){
    if(step===action)break;
    if(Array.isArray(step))G.applyMove(work,step[0],step[1],capacity,rules,state);else if(step.type==='flip')G.applyFlip(work,rules,state);
  }
  const alternative=G.dyeChoices(work,action.tube,rules,state).find(color=>color!==action.color);if(!alternative)return false;
  G.applyDye(work,action.tube,alternative,capacity,rules,state);
  const result=solve(work,capacity,rules,maxVisited,{},state);
  return result.status==='unsolvable';
}

const specs=[
  {id:66,colors:3,empty:1,replace:[['red','top']],stock:{red:1},min:5,max:14},
  {id:67,colors:3,empty:1,replace:[['red','top']],stock:{red:1,blue:1},min:7,max:18,wrongChoice:true},
  {id:68,colors:4,empty:1,replace:[['red','any'],['blue','any']],stock:{red:1,blue:1},min:15,max:17},
  {id:69,colors:4,empty:1,replace:[['red','top'],['blue','buried']],stock:{red:1,blue:1},min:18,max:19,wrongChoice:true},
  {id:70,colors:5,empty:1,replace:[],forgeLimit:2,stock:{red:1,blue:1},flipLimit:2,targets:{0:'red'},min:20,max:20,requireFlip:true,preset:[["blue","yellow","gray","yellow"],["green","yellow","green","green"],["green","purple","red","purple"],["red","red","purple","yellow"],["blue","purple","blue","gray"],[]]}
];
let previous=0;
for(const spec of specs){
  if(requested&&String(spec.id)!==requested)continue;
  let found=null;
  const firstSeed=spec.id*100000,lastSeed=firstSeed+(spec.preset?1:50000);
  for(let seed=firstSeed;seed<lastSeed&&!found;seed++){
    const board=spec.preset?G.clone(spec.preset):randomBoard(spec.colors,4,spec.empty,seed);let valid=true;
    spec.replace.forEach((entry,index)=>{if(valid&&!replaceAt(board,entry[0],entry[1],seed+index))valid=false;});if(!valid)continue;
    const rules={forgeLimit:spec.forgeLimit||spec.replace.length,dyeStock:spec.stock,dyeGoals:goals(spec.colors,4)};if(spec.flipLimit)rules.flipLimit=spec.flipLimit;if(spec.targets)rules.targets=spec.targets;
    const noForge=solve(board,4,rules,50000,{forge:true});if(noForge.status!=='unsolvable')continue;
    if(spec.requireFlip){const noFlip=solve(board,4,rules,50000,{flip:true});if(noFlip.status!=='unsolvable')continue;}
    const solved=solve(board,4,rules,50000,{});if(solved.status!=='solved'||solved.distance<Math.max(spec.min,previous+1)||solved.distance>spec.max)continue;
    const dyes=solved.solution.filter(action=>action&&action.type==='dye'),flips=solved.solution.filter(action=>action&&action.type==='flip');if(dyes.length!==(spec.forgeLimit||spec.replace.length))continue;
    if(spec.requireFlip&&flips.length!==1)continue;if(spec.wrongChoice&&!wrongFirstDyeIsDead(board,4,rules,solved.solution,50000))continue;
    found={id:spec.id,colors:spec.colors,capacity:4,tubes:board,difficulty:'forge',minimumMoves:solved.distance,dyeMoves:solved.solution.map((action,index)=>action&&action.type==='dye'?index+1:null).filter(Boolean),flipMoves:solved.solution.map((action,index)=>action&&action.type==='flip'?index+1:null).filter(Boolean),rules,solution:solved.solution,verifiedMoves:solved.distance,seed,visited:solved.visited,noForgeVisited:noForge.visited};
  }
  if(!found)throw new Error('no candidate for level '+spec.id);
  previous=found.minimumMoves;console.log(JSON.stringify(found));
}
