'use strict';

// Development-only level analysis.  Production rules are deliberately loaded
// from js/game.js instead of being copied into this tool.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
function loadBrowserFile(file, context) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, {filename: file});
}
function loadGame() {
  const context = {window: {}};
  vm.createContext(context);
  loadBrowserFile('js/game.js', context);
  return context.window.CRGame;
}
function loadStages() {
  const context = {window: {}};
  vm.createContext(context);
  loadBrowserFile('data/stages.js', context);
  return context.window.CR_STAGES;
}

function moves(game, board, capacity) {
  const result = [];
  const equivalent = new Set();
  for (let from = 0; from < board.length; from++) {
    for (let to = 0; to < board.length; to++) {
      if (!game.isLegalMove(board, from, to, capacity)) continue;
      // Keep UI-facing legal move count, but mark symmetric moves so the
      // development search does not pay for interchangeable tube positions.
      const signature = board[from].join(',') + '>' + board[to].join(',');
      result.push({from, to, symmetric: equivalent.has(signature)});
      equivalent.add(signature);
    }
  }
  return result;
}

function replayCertificate(game, stage, capacity) {
  const board = game.clone(stage.tubes);
  const states = [game.clone(board)];
  stage.solution.forEach(([from, to], index) => {
    if (!game.isLegalMove(board, from, to, capacity)) {
      throw new Error(`Level ${stage.id}: illegal certificate move ${index + 1} (${from}->${to})`);
    }
    const before = board.reduce((n, tube) => n + tube.length, 0);
    if (game.applyMove(board, from, to, capacity) !== 1) throw new Error('applyMove rejected a legal move');
    const after = board.reduce((n, tube) => n + tube.length, 0);
    if (before !== after) throw new Error(`Level ${stage.id}: move ${index + 1} changed the ball count`);
    states.push(game.clone(board));
  });
  if (!game.isCleared(board, capacity)) throw new Error(`Level ${stage.id}: certificate does not clear board`);
  return states;
}

function sampleReachable(game, start, capacity, stateLimit) {
  const queue = [game.clone(start)];
  const visited = new Set([game.stateKey(start, capacity)]);
  const depths = [0];
  let cursor = 0, edges = 0, deadEnds = 0, maxBranch = 0, shortestMoves = null;
  while (cursor < queue.length && visited.size < stateLimit) {
    const board = queue[cursor];
    const depth = depths[cursor++];
    if (game.isCleared(board, capacity) && shortestMoves === null) shortestMoves = depth;
    const legal = moves(game, board, capacity);
    edges += legal.length;
    maxBranch = Math.max(maxBranch, legal.length);
    if (!game.isCleared(board, capacity) && legal.length === 0) deadEnds++;
    for (const move of legal) {
      if (move.symmetric) continue;
      const next = game.clone(board);
      game.applyMove(next, move.from, move.to, capacity);
      const key = game.stateKey(next, capacity);
      if (!visited.has(key)) { visited.add(key); queue.push(next); depths.push(depth + 1); }
      if (visited.size >= stateLimit) break;
    }
  }
  return {
    states: visited.size,
    exhausted: cursor === queue.length,
    averageBranching: cursor ? edges / cursor : 0,
    maxBranching: maxBranch,
    observedDeadEnds: deadEnds,
    shortestMoves
  };
}

function band(score) {
  if (score < 20) return 'Tutorial';
  if (score < 38) return 'Easy';
  if (score < 57) return 'Normal';
  if (score < 74) return 'Hard';
  return score < 90 ? 'Expert' : 'Final';
}

function analyzeStage(stage, options = {}) {
  const game = options.game || loadGame();
  const capacity = options.capacity || 4;
  const states = replayCertificate(game, stage, capacity);
  const branches = states.slice(0, -1).map(board => moves(game, board, capacity).length);
  let emptyMoves = 0, completeBreaks = 0, forced = 0, alternatives = 0;
  stage.solution.forEach(([from, to], index) => {
    const board = states[index];
    if (!board[to].length) emptyMoves++;
    if (board[from].length === capacity && board[from].every(c => c === board[from][0])) completeBreaks++;
    if (branches[index] === 1) forced++;
    alternatives += Math.max(0, branches[index] - 1);
  });
  const sampled = sampleReachable(game, stage.tubes, capacity, options.stateLimit || 5000);
  const emptyTubes = stage.tubes.filter(t => !t.length).length;
  const averageBranching = branches.reduce((a, b) => a + b, 0) / branches.length;
  // Relative, intentionally transparent score.  It rewards planning length,
  // choice pressure and scarce workspace, while forced/corridor-like play is
  // discounted.  Certificate length is not claimed to be an exact optimum.
  const solvingLength = sampled.shortestMoves === null ? stage.solution.length : sampled.shortestMoves;
  const raw = solvingLength * 0.8 + stage.colors * 3.2 +
    Math.min(averageBranching, 12) * 1.6 + alternatives / branches.length * 1.1 +
    (emptyTubes === 1 ? 12 : 0) + emptyMoves / branches.length * 5 -
    forced / branches.length * 8 - completeBreaks * 2;
  const difficultyScore = Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
  return {
    level: stage.id,
    world: stage.id <= 10 ? 'Garden' : stage.id <= 20 ? 'Ocean' : 'City',
    colors: stage.colors,
    tubes: stage.tubes.length,
    emptyTubes,
    solvable: true,
    solutionKind: 'verified certificate (upper bound)',
    solutionMoves: stage.solution.length,
    shortestMoves: sampled.exhausted && sampled.shortestMoves !== null ? sampled.shortestMoves : null,
    initialLegalMoves: branches[0],
    averageSolutionBranching: +averageBranching.toFixed(2),
    forcedMoveRatio: +(forced / branches.length).toFixed(3),
    alternativeMovesPerStep: +(alternatives / branches.length).toFixed(2),
    emptyTubeMoveRatio: +(emptyMoves / branches.length).toFixed(3),
    completedTubeBreaks: completeBreaks,
    sampledStates: sampled.states,
    sampleExhausted: sampled.exhausted,
    sampledAverageBranching: +sampled.averageBranching.toFixed(2),
    sampledMaxBranching: sampled.maxBranching,
    observedDeadEnds: sampled.observedDeadEnds,
    difficultyScore,
    band: band(difficultyScore),
    notes: sampled.exhausted ? 'reachable sample exhausted' : `reachability sample capped at ${sampled.states} states`
  };
}

function analyzeAll(options = {}) {
  const game = loadGame();
  return loadStages().map(stage => analyzeStage(stage, {...options, game}));
}

module.exports = {loadGame, loadStages, moves, replayCertificate, sampleReachable, analyzeStage, analyzeAll};
