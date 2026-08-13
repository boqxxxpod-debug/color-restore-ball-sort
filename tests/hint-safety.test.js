'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),{performance}=require('perf_hooks');
const context={window:{}};vm.createContext(context);
for(const file of ['js/game.js','js/hint.js','data/stages.js']){vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});context.CRGame=context.window.CRGame;}
const G=context.window.CRGame,H=context.window.CRHint,stages=context.window.CR_STAGES,cap=4;
function graph(start){
  const boards=[G.clone(start)],keys=[G.stateKey(start,cap)],index=new Map([[keys[0],0]]),edges=[],reverse=[];
  for(let cursor=0;cursor<boards.length;cursor++){
    const board=boards[cursor],out=[],equivalent=new Set();
    for(let from=0;from<board.length;from++)for(let to=0;to<board.length;to++){
      if(!G.isLegalMove(board,from,to,cap))continue;
      const sig=board[from].join(',')+'>'+board[to].join(',');if(equivalent.has(sig))continue;equivalent.add(sig);
      const next=G.clone(board);G.applyMove(next,from,to,cap);const key=G.stateKey(next,cap);
      if(!index.has(key)){index.set(key,boards.length);boards.push(next);keys.push(key);}
      const child=index.get(key);out.push(child);(reverse[child]||(reverse[child]=[])).push(cursor);
    }
    edges[cursor]=out;
  }
  const distance=Array(boards.length).fill(null),queue=[];
  boards.forEach((board,i)=>{if(G.isCleared(board,cap)){distance[i]=0;queue.push(i);}});
  for(let cursor=0;cursor<queue.length;cursor++){const child=queue[cursor];for(const parent of reverse[child]||[])if(distance[parent]===null){distance[parent]=distance[child]+1;queue.push(parent);}}
  return {boards,edges,distance,index};
}
let reachable=0,solvable=0,maxVisited=0,maxMs=0,totalStarted=performance.now();
for(const stage of stages){
  const g=graph(stage.tubes);reachable+=g.boards.length;
  for(let i=0;i<g.boards.length;i++){
    const d=g.distance[i];if(d===null||d===0)continue;solvable++;
    // Exhaustive oracle property: every solvable state has a production-legal
    // successor whose exact reverse-BFS distance is d-1. The production hint
    // BFS is separately exercised along every complete level route below.
    let hint=null,nextIndex=-1;
    for(let from=0;from<g.boards[i].length&&!hint;from++)for(let to=0;to<g.boards[i].length;to++){
      if(!G.isLegalMove(g.boards[i],from,to,cap))continue;
      const next=G.clone(g.boards[i]);G.applyMove(next,from,to,cap);const key=G.stateKey(next,cap);
      const candidate=g.index.has(key)?g.index.get(key):-1;
      if(candidate>=0&&g.distance[candidate]===d-1){hint={from,to};nextIndex=candidate;break;}
    }
    assert(hint,`level ${stage.id}, state ${i}: shortest hint exists`);
    assert(G.isLegalMove(g.boards[i],hint.from,hint.to,cap),`level ${stage.id}, state ${i}: legal`);
    const next=G.clone(g.boards[i]);G.applyMove(next,hint.from,hint.to,cap);
    assert.notEqual(G.stateKey(next,cap),G.stateKey(g.boards[i],cap),`level ${stage.id}, state ${i}: changes state`);
    assert(g.distance[nextIndex]!==null,`level ${stage.id}, state ${i}: remains solvable`);
    assert.equal(g.distance[nextIndex],d-1,`level ${stage.id}, state ${i}: shortest distance decreases`);
  }
  const board=G.clone(stage.tubes),seen=new Set();let hints=0;
  while(!G.isCleared(board,cap)){
    const key=G.stateKey(board,cap);assert(!seen.has(key),`level ${stage.id}: hint loop`);seen.add(key);
    const started=performance.now(),job=H.search(board,cap);let result;do{result=job.step(10000);}while(result.status==='searching');maxMs=Math.max(maxMs,performance.now()-started);maxVisited=Math.max(maxVisited,result.visited);const hint=result.move;assert(hint,`level ${stage.id}: missing hint`);assert(G.isLegalMove(board,hint.from,hint.to,cap));G.applyMove(board,hint.from,hint.to,cap);hints++;
  }
  assert.equal(hints,g.distance[0],`level ${stage.id}: hint-only route is shortest`);
}
assert.equal(reachable,16708,'documented reachable-state population');
assert.equal(solvable,15857,'documented non-cleared solvable-state population');
for(const [level,bad] of [[14,[3,6]],[20,[3,6]],[26,[5,8]],[28,[5,8]]])assert.notDeepEqual(H.choose(stages[level-1].tubes,cap),{from:bad[0],to:bad[1]},`level ${level}: dangerous first move`);
console.log(`hint safety: ${solvable}/${reachable} states, 30/30 shortest hint-only clears, max search ${maxVisited} states / ${maxMs.toFixed(2)} ms, total ${(performance.now()-totalStarted).toFixed(0)} ms`);
