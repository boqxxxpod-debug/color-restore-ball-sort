(function () {
  'use strict';

  var stages = window.CR_STAGES;
  if (!Array.isArray(stages) || stages.length !== 55) return;

  // Levels 1-25 keep the verified boards from the previous progression pass.
  // Level 15 replaces the remaining Analyzer plateau. Levels 26-35 use
  // newly verified 8-color/one-empty boards whose exact minimum rises by
  // one move per level (34 -> 43) and whose Analyzer score also rises.
  // Levels 36-55 keep their existing per-stage mechanical pressure:
  // five-ball depth, lock route length, target count, then move-limit slack.
  var sourceOrder = [1,2,4,5,3,7,9,8,6,10,13,12,11,14,20,19,22,18,16,17,15,24,21,25,23,26,28,27,29,30,35,34,32,31,33,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55];

  var analyzerScores = {"1":24.3,"2":24.4,"3":32.0,"4":29.5,"5":30.2,"6":38.2,"7":35.5,"8":35.9,"9":35.7,"10":40.0,"11":43.7,"12":43.1,"13":40.3,"14":56.7,"15":60.9,"16":59.8,"17":60.3,"18":58.5,"19":57.1,"20":56.7,"21":61.9,"22":57.4,"23":63.5,"24":61.1,"25":62.0,"26":68.0,"27":69.8,"28":68.0,"29":69.8,"30":69.8};

  var strictOverrides = {
    15: {"colors":6,"capacity":4,"tubes":[["blue","orange","yellow","red"],["purple","green","purple","red"],["red","orange","green","purple"],["yellow","yellow","yellow","red"],["green","purple","orange","green"],["blue","orange","blue","blue"],[]],"solution":[[0,6],[1,6],[2,1],[3,6],[0,3],[4,2],[4,0],[1,4],[1,4],[2,1],[2,1],[2,0],[2,6],[0,2],[0,2],[0,2],[5,0],[5,0],[5,2],[5,0],[1,5],[1,5],[1,5],[4,1],[4,1],[4,1],[4,5]],"verifiedMoves":27,"minimumMoves":27,"analyzerDifficultyScore":57.0,"generatedSeed":117},
    26: {"colors":8,"capacity":4,"tubes":[["red","orange","blue","purple"],["yellow","pink","orange","purple"],["blue","blue","green","green"],["orange","yellow","orange","blue"],["cyan","purple","cyan","purple"],["red","cyan","yellow","red"],["pink","yellow","red","pink"],["green","green","pink","cyan"],[]],"solution":[[0,8],[1,8],[3,0],[3,1],[4,8],[7,4],[6,7],[5,6],[5,3],[4,5],[4,5],[4,8],[5,4],[5,4],[5,4],[6,5],[6,5],[6,3],[7,6],[7,6],[2,7],[2,7],[0,2],[0,2],[1,0],[1,0],[1,6],[3,1],[3,1],[3,1],[0,3],[0,3],[0,3],[0,5]],"verifiedMoves":34,"minimumMoves":34,"analyzerDifficultyScore":65.8,"generatedSeed":1022310},
    27: {"colors":8,"capacity":4,"tubes":[["orange","blue","green","purple"],["blue","cyan","yellow","orange"],["green","pink","yellow","green"],["green","pink","pink","cyan"],["cyan","red","purple","purple"],["red","orange","orange","blue"],["yellow","red","purple","red"],["pink","yellow","blue","cyan"],[]],"solution":[[0,8],[2,0],[4,8],[4,8],[6,4],[6,8],[4,6],[4,6],[3,4],[7,4],[5,7],[1,5],[1,2],[1,4],[7,1],[7,1],[2,7],[2,7],[2,3],[0,2],[0,2],[0,1],[5,0],[5,0],[5,0],[6,5],[6,5],[6,5],[7,6],[7,6],[7,6],[3,7],[3,7],[3,7],[3,2]],"verifiedMoves":35,"minimumMoves":35,"analyzerDifficultyScore":66.8,"generatedSeed":1018255},
    28: {"colors":8,"capacity":4,"tubes":[["purple","yellow","yellow","blue"],["cyan","pink","orange","purple"],["pink","orange","red","red"],["red","yellow","blue","blue"],["orange","green","purple","cyan"],["green","cyan","pink","pink"],["purple","green","blue","orange"],["yellow","red","cyan","green"],[]],"solution":[[0,8],[3,8],[3,8],[3,0],[2,3],[2,3],[6,2],[6,8],[7,6],[4,7],[1,4],[1,2],[5,1],[5,1],[7,5],[7,5],[7,3],[0,7],[0,7],[0,7],[4,0],[4,0],[4,6],[2,4],[2,4],[2,4],[1,2],[1,2],[1,2],[5,1],[5,1],[5,1],[6,5],[6,5],[6,5],[6,0]],"verifiedMoves":36,"minimumMoves":36,"analyzerDifficultyScore":67.1,"generatedSeed":1014786},
    29: {"colors":8,"capacity":4,"tubes":[["pink","blue","blue","orange"],["green","purple","green","red"],["orange","cyan","cyan","pink"],["yellow","red","orange","blue"],["cyan","red","cyan","yellow"],["blue","yellow","purple","purple"],["red","pink","pink","yellow"],["purple","orange","green","green"],[]],"solution":[[7,8],[7,8],[0,7],[3,0],[3,7],[1,3],[1,8],[5,1],[5,1],[4,5],[6,5],[2,6],[4,2],[3,4],[3,4],[5,3],[5,3],[5,3],[0,5],[0,5],[0,5],[6,0],[6,0],[6,0],[4,6],[4,6],[4,6],[2,4],[2,4],[2,4],[7,2],[7,2],[7,2],[1,7],[1,7],[1,7],[1,8]],"verifiedMoves":37,"minimumMoves":37,"analyzerDifficultyScore":68.3,"generatedSeed":1024343},
    30: {"colors":8,"capacity":4,"tubes":[["green","yellow","green","orange"],["orange","green","red","orange"],["red","green","purple","pink"],["purple","purple","cyan","yellow"],["yellow","blue","purple","red"],["cyan","orange","pink","cyan"],["blue","cyan","yellow","blue"],["red","pink","blue","pink"],[]],"solution":[[2,8],[7,8],[6,7],[3,6],[5,3],[5,8],[0,5],[1,5],[4,1],[4,2],[7,4],[7,4],[7,8],[1,7],[1,7],[1,0],[5,1],[5,1],[5,1],[3,5],[3,5],[2,3],[2,3],[0,2],[0,2],[6,0],[6,0],[6,5],[4,6],[4,6],[4,6],[0,4],[0,4],[0,4],[2,0],[2,0],[2,0],[2,7]],"verifiedMoves":38,"minimumMoves":38,"analyzerDifficultyScore":68.4,"generatedSeed":1019041},
    31: {"colors":8,"capacity":4,"tubes":[["red","red","yellow","red"],["yellow","pink","cyan","orange"],["purple","yellow","pink","blue"],["green","blue","orange","orange"],["cyan","purple","cyan","green"],["blue","purple","red","yellow"],["blue","cyan","green","pink"],["pink","green","orange","purple"],[]],"solution":[[1,8],[3,8],[3,8],[2,3],[6,2],[4,6],[1,4],[2,1],[2,1],[5,2],[0,5],[0,2],[5,0],[5,0],[7,5],[7,8],[6,7],[6,7],[4,6],[4,6],[4,5],[6,4],[6,4],[6,4],[3,6],[3,6],[7,3],[7,3],[7,3],[1,7],[1,7],[1,7],[2,1],[2,1],[2,1],[5,2],[5,2],[5,2],[5,6]],"verifiedMoves":39,"minimumMoves":39,"analyzerDifficultyScore":69.3,"generatedSeed":1027988},
    32: {"colors":8,"capacity":4,"tubes":[["blue","green","yellow","purple"],["red","purple","green","pink"],["pink","orange","blue","green"],["orange","cyan","purple","cyan"],["cyan","pink","cyan","red"],["red","yellow","blue","green"],["yellow","orange","red","orange"],["purple","blue","pink","yellow"],[]],"solution":[[2,8],[5,8],[5,2],[7,5],[1,7],[1,8],[0,1],[0,5],[0,8],[2,0],[2,0],[6,2],[4,6],[3,4],[3,1],[4,3],[4,3],[7,4],[7,4],[7,0],[1,7],[1,7],[1,7],[6,1],[6,1],[2,6],[2,6],[4,2],[4,2],[4,2],[3,4],[3,4],[3,4],[6,3],[6,3],[6,3],[5,6],[5,6],[5,6],[5,1]],"verifiedMoves":40,"minimumMoves":40,"analyzerDifficultyScore":70.1,"generatedSeed":1023728},
    33: {"colors":8,"capacity":4,"tubes":[["red","purple","orange","purple"],["orange","green","red","blue"],["yellow","pink","orange","purple"],["blue","yellow","green","pink"],["pink","blue","red","blue"],["green","cyan","purple","cyan"],["cyan","red","yellow","green"],["orange","pink","cyan","yellow"],[]],"solution":[[1,8],[4,8],[4,1],[8,4],[8,4],[0,8],[2,8],[0,2],[0,8],[1,0],[1,0],[6,1],[7,6],[5,7],[5,8],[7,5],[7,5],[3,7],[3,1],[6,3],[6,3],[6,0],[5,6],[5,6],[5,6],[1,5],[1,5],[1,5],[2,1],[2,1],[2,7],[3,2],[3,2],[3,2],[4,3],[4,3],[4,3],[7,4],[7,4],[7,4],[7,1]],"verifiedMoves":41,"minimumMoves":41,"analyzerDifficultyScore":71.8,"generatedSeed":1039164},
    34: {"colors":8,"capacity":4,"tubes":[["blue","green","orange","green"],["purple","cyan","yellow","red"],["orange","cyan","purple","blue"],["yellow","red","pink","cyan"],["green","red","cyan","purple"],["red","pink","blue","orange"],["pink","orange","pink","green"],["purple","yellow","blue","yellow"],[]],"solution":[[0,8],[5,0],[2,5],[4,2],[3,4],[6,8],[6,3],[0,6],[0,6],[0,8],[5,0],[5,0],[3,5],[3,5],[1,3],[7,1],[7,0],[1,7],[1,7],[4,1],[4,1],[4,3],[4,8],[1,4],[1,4],[1,4],[2,1],[2,1],[2,4],[6,2],[6,2],[6,2],[5,6],[5,6],[5,6],[3,5],[3,5],[3,5],[7,3],[7,3],[7,3],[7,1]],"verifiedMoves":42,"minimumMoves":42,"analyzerDifficultyScore":73.2,"generatedSeed":1033563},
    35: {"colors":8,"capacity":4,"tubes":[["orange","cyan","purple","red"],["purple","yellow","cyan","cyan"],["blue","pink","orange","red"],["cyan","orange","blue","orange"],["green","yellow","pink","yellow"],["pink","purple","green","green"],["blue","red","yellow","blue"],["red","green","purple","pink"],[]],"solution":[[0,8],[2,8],[3,2],[6,3],[4,6],[7,4],[0,7],[1,0],[1,0],[6,1],[6,1],[8,6],[8,6],[1,8],[1,8],[1,8],[7,1],[7,1],[5,7],[5,7],[5,1],[4,5],[4,5],[4,8],[7,4],[7,4],[7,4],[6,7],[6,7],[6,7],[3,6],[3,6],[2,3],[2,3],[2,5],[2,6],[0,2],[0,2],[0,2],[3,0],[3,0],[3,0],[3,2]],"verifiedMoves":43,"minimumMoves":43,"analyzerDifficultyScore":74.0,"generatedSeed":1040282}
  };

  var byId = {};
  stages.forEach(function (stage) { byId[stage.id] = stage; });
  if (sourceOrder.some(function (id) { return !byId[id]; })) return;

  window.CR_STAGES = sourceOrder.map(function (sourceId, index) {
    var level = index + 1;
    var stage = Object.assign({}, byId[sourceId]);
    stage.sourceId = sourceId;
    stage.id = level;
    stage.progressionRank = level;
    if (analyzerScores[sourceId] != null) stage.analyzerDifficultyScore = analyzerScores[sourceId];
    if (strictOverrides[level]) stage = Object.assign(stage, strictOverrides[level]);
    return stage;
  });
}());
