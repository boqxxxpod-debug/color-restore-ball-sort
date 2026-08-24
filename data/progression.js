(function () {
  'use strict';

  var stages = window.CR_STAGES;
  if (!Array.isArray(stages) || stages.length !== 55) return;

  // Levels 1-30 are ordered by the existing Analyzer Difficulty Score.
  // Levels 31-35 share the same 8-color/one-empty rules, so order them by
  // verified solution length, then by initial branching for the 46-move tie.
  // Levels 36-55 already increase a concrete constraint every stage inside
  // their mechanic family (capacity puzzle length, lock puzzle length,
  // target count, then exact minimum / move-limit pressure).
  var sourceOrder = [
    1, 2, 4, 5, 3, 7, 9, 8, 6, 10,
    13, 12, 11, 14, 20, 19, 22, 18, 16, 17,
    15, 24, 21, 25, 23, 26, 28, 27, 29, 30,
    35, 34, 32, 33, 31,
    36, 37, 38, 39, 40,
    41, 42, 43, 44, 45,
    46, 47, 48, 49, 50,
    51, 52, 53, 54, 55
  ];

  var analyzerScores = {
    1: 24.3, 2: 24.4, 3: 32.0, 4: 29.5, 5: 30.2,
    6: 38.2, 7: 35.5, 8: 35.9, 9: 35.7, 10: 40.0,
    11: 43.7, 12: 43.1, 13: 40.3, 14: 56.7, 15: 60.9,
    16: 59.8, 17: 60.3, 18: 58.5, 19: 57.1, 20: 56.7,
    21: 61.9, 22: 57.4, 23: 63.5, 24: 61.1, 25: 62.0,
    26: 68.0, 27: 69.8, 28: 68.0, 29: 69.8, 30: 69.8
  };

  var byId = {};
  stages.forEach(function (stage) { byId[stage.id] = stage; });
  if (sourceOrder.some(function (id) { return !byId[id]; })) return;

  window.CR_STAGES = sourceOrder.map(function (sourceId, index) {
    var stage = Object.assign({}, byId[sourceId]);
    stage.sourceId = sourceId;
    stage.id = index + 1;
    stage.progressionRank = index + 1;
    if (analyzerScores[sourceId] != null) stage.analyzerDifficultyScore = analyzerScores[sourceId];
    return stage;
  });
}());
