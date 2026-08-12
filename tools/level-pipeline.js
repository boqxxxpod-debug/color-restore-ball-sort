'use strict';

const {loadGame, loadStages, moves, sampleReachable} = require('./level-analyzer');

function rng(seed) {
  let value = seed >>> 0;
  return () => ((value = Math.imul(value ^ value >>> 15, 1 | value), value ^= value + Math.imul(value ^ value >>> 7, 61 | value), ((value ^ value >>> 14) >>> 0) / 4294967296));
}
function canonical(board) { return board.map(t => t.join(',')).sort().join('|'); }
function shapeKey(board) {
  const names = new Map(); let next = 0;
  return canonical(board.map(t => t.map(c => { if (!names.has(c)) names.set(c, next++); return names.get(c); })));
}
function features(game, board, capacity = 4) {
  const counts = new Map(), tops = new Map(); let buried = 0;
  board.forEach(t => t.forEach((c, i) => { if (!counts.has(c)) counts.set(c, new Set()); counts.get(c).add(t); if (i < t.length - 1) buried++; }));
  board.forEach(t => { if (t.length) tops.set(t.at(-1), (tops.get(t.at(-1)) || 0) + 1); });
  return {
    colorDispersion: +(Array.from(counts.values()).reduce((n, s) => n + s.size, 0) / counts.size).toFixed(2),
    topColorPairs: Array.from(tops.values()).reduce((n, x) => n + x * (x - 1) / 2, 0),
    buriedRatio: +(buried / board.reduce((n, t) => n + t.length, 0)).toFixed(3),
    initialLegalMoves: moves(game, board, capacity).length
  };
}
function generateOne(template, seed, depth, game = loadGame(), capacity = 4) {
  const random = rng(seed), board = game.clone(template.tubes), undo = [];
  for (let i = 0; i < depth; i++) {
    // Only use transitions whose inverse is legal.  Reversing the walk then
    // replaying the published certificate is therefore a proof of solvability.
    const choices = moves(game, board, capacity).filter(m => {
      const next = game.clone(board); game.applyMove(next, m.from, m.to, capacity);
      return game.isLegalMove(next, m.to, m.from, capacity);
    });
    if (!choices.length) break;
    const move = choices[Math.floor(random() * choices.length)];
    game.applyMove(board, move.from, move.to, capacity); undo.push([move.to, move.from]);
  }
  return {board, solution: undo.reverse().concat(template.solution), seed, shuffleDepth: undo.length};
}
function scoreCandidate(candidate, options = {}) {
  const game = options.game || loadGame(), capacity = options.capacity || 4;
  const board = game.clone(candidate.board); let cycles = 0, critical = 0, emptyMoves = 0;
  const seen = new Set([game.stateKey(board, capacity)]); let branchTotal = 0, maxBranching = 0;
  for (const [from, to] of candidate.solution) {
    if (!game.isLegalMove(board, from, to, capacity)) return {...candidate, solvable:false, rejectReason:'certificate-invalid'};
    const branch = moves(game, board, capacity).length; branchTotal += branch; maxBranching = Math.max(maxBranching, branch);
    if (branch > 2) critical++; if (!board[to].length) emptyMoves++;
    game.applyMove(board, from, to, capacity); const key = game.stateKey(board, capacity); if (seen.has(key)) cycles++; seen.add(key);
  }
  if (!game.isCleared(board, capacity)) return {...candidate, solvable:false, rejectReason:'certificate-invalid'};
  const sampled = sampleReachable(game, candidate.board, capacity, options.stateLimit || 120);
  const f = features(game, candidate.board, capacity), length = candidate.solution.length;
  const avg = branchTotal / length, deadRate = sampled.observedDeadEnds / sampled.states;
  const difficultyScore = Math.max(0, Math.min(100, +(length * 1.25 + avg * 2.2 + (candidate.board.filter(t=>!t.length).length === 1 ? 12 : 0) + deadRate * 25).toFixed(2)));
  const qualityScore = Math.max(0, Math.min(100, +(72 - Math.abs(avg - 5) * 5 + Math.min(15, critical / length * 25) + Math.min(10, f.colorDispersion * 2) - cycles / length * 12).toFixed(2)));
  return {...candidate, solvable:true, solutionMoves:length, searchedStates:sampled.states, averageBranching:+sampled.averageBranching.toFixed(3), maxBranching:sampled.maxBranching, deadEnds:sampled.observedDeadEnds, criticalBranches:critical, cycleExclusions:cycles, emptyTubeDependency:+(emptyMoves/length).toFixed(3), difficultyScore, qualityScore, ...f};
}
function bandFor(template) { if (template.id <= 5) return 'Easy'; if (template.id <= 13) return 'Normal'; if (template.id <= 20) return 'Hard'; if (template.id <= 27) return 'Expert'; return 'Final'; }
function randomBoard(colors, empty, seed, capacity = 4) {
  const random=rng(seed), palette=['red','blue','yellow','green','purple','orange','cyan','pink'].slice(0,colors), balls=[];
  palette.forEach(c=>{for(let i=0;i<capacity;i++) balls.push(c);});
  for(let i=balls.length-1;i;i--){const j=Math.floor(random()*(i+1)); [balls[i],balls[j]]=[balls[j],balls[i]];}
  const board=[]; for(let i=0;i<colors;i++) board.push(balls.slice(i*capacity,(i+1)*capacity));
  for(let i=0;i<empty;i++) board.push([]); return board;
}
function solvePath(game, start, capacity = 4, maxStates = 12000) {
  const boards=[game.clone(start)], paths=[[]], visited=new Set([game.stateKey(start,capacity)]); let cycles=0, deadEnds=0, edges=0, maxBranching=0;
  while(boards.length && visited.size<maxStates){const board=boards.pop(), path=paths.pop(); if(game.isCleared(board,capacity)) return {solution:path,states:visited.size,cycles,deadEnds,edges,maxBranching};
    const legal=moves(game,board,capacity).filter(m=>!m.symmetric); edges+=legal.length; maxBranching=Math.max(maxBranching,legal.length); let added=0;
    for(const m of legal){const next=game.clone(board); game.applyMove(next,m.from,m.to,capacity); const key=game.stateKey(next,capacity); if(visited.has(key)){cycles++;continue;} visited.add(key); added++; boards.push(next); paths.push(path.concat([[m.from,m.to]]));} if(!added)deadEnds++;
  }
  return {solution:null,states:visited.size,cycles,deadEnds,edges,maxBranching,limited:boards.length>0};
}

module.exports = {rng, canonical, shapeKey, features, generateOne, randomBoard, solvePath, scoreCandidate, bandFor, loadGame, loadStages};
