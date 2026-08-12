#!/usr/bin/env node
'use strict';
const fs = require('fs'), path = require('path');
const P = require('./level-pipeline');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => { const x=process.argv.find(a=>a.startsWith(`--${name}=`)); return x ? x.split('=')[1] : fallback; };
const count=+arg('count',10000), seed=+arg('seed',1234), stateLimit=+arg('state-limit',120), checkpoint=+arg('checkpoint',500);
const fixedColors=arg('colors',null), fixedEmpty=arg('empty',null), shuffleDepth=+arg('shuffle-depth',4);
const out=path.resolve(ROOT,arg('out','artifacts/candidates')); fs.mkdirSync(out,{recursive:true});
const raw=path.join(out,'checkpoint.jsonl'); fs.writeFileSync(raw,'');
const game=P.loadGame(), seen=new Set(), accepted=[], rejects={duplicate:0,'already-cleared':0,'too-simple':0,unsolvable:0,'search-limit':0,'certificate-invalid':0};
const targets=['Easy','Normal','Hard','Expert','Final']; let evaluated=0;
const started=Date.now();
for(let i=0;i<count;i++){
  const desired=targets[i%targets.length], defaults={Easy:[2,2],Normal:[3,2],Hard:[4,2],Expert:[5,2],Final:[5,1]}[desired], spec=[fixedColors===null?defaults[0]:+fixedColors,fixedEmpty===null?defaults[1]:+fixedEmpty];
  const board=P.randomBoard(spec[0],spec[1],(seed+i*2654435761)>>>0), generated={board,seed:(seed+i*2654435761)>>>0,shuffleDepth};
  evaluated++; const key=P.shapeKey(generated.board);
  let result;
  if(seen.has(key)){rejects.duplicate++; result={seed:generated.seed,band:desired,rejected:'duplicate'};}
  else if(game.isCleared(generated.board,4)){rejects['already-cleared']++; result={seed:generated.seed,band:desired,rejected:'already-cleared'};}
  else { seen.add(key); const solved=P.solvePath(game,board,4,+arg('max-states',12000));
    if(!solved.solution){const reason=solved.limited?'search-limit':'unsolvable'; rejects[reason]++; result={seed:generated.seed,band:desired,rejected:reason,searchedStates:solved.states}; fs.appendFileSync(raw,JSON.stringify(result)+'\n'); continue;}
    generated.solution=solved.solution; const scored=P.scoreCandidate(generated,{game,stateLimit}); scored.band=desired;
    if(!scored.solvable){rejects['certificate-invalid']++; result={...scored,rejected:'certificate-invalid'};}
    else if(scored.solutionMoves<6||scored.initialLegalMoves<1){rejects['too-simple']++; result={...scored,rejected:'too-simple'};}
    else {accepted.push(scored); result=scored;}
  }
  fs.appendFileSync(raw,JSON.stringify(result)+'\n');
  if((i+1)%checkpoint===0) { fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify({generated:i+1,evaluated,unique:seen.size,accepted:accepted.length,rejects,elapsedSeconds:+((Date.now()-started)/1000).toFixed(1)},null,2)+'\n'); console.log(`progress ${i+1}/${count}: ${accepted.length} accepted`); }
}
const limits={Easy:20,Normal:30,Hard:30,Expert:30,Final:20}, rankings={};
for(const band of targets) rankings[band]=accepted.filter(x=>x.band===band).sort((a,b)=>b.qualityScore-a.qualityScore||b.difficultyScore-a.difficultyScore).slice(0,limits[band]);
const summary={command:`node tools/generate-levels.js --count=${count} --seed=${seed} --state-limit=${stateLimit}`,generated:count,evaluated,unique:seen.size,accepted:accepted.length,rejects,elapsedSeconds:+((Date.now()-started)/1000).toFixed(1),ranked:Object.fromEntries(targets.map(b=>[b,rankings[b].length]))};
fs.writeFileSync(path.join(out,'rankings.json'),JSON.stringify({summary,rankings},null,2)+'\n'); fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify({...summary,status:'complete'},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
