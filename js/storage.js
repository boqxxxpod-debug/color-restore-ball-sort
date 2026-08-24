(function () {
  'use strict';
  var KEY = 'colorRestoreSave';
  var PROGRESSION_VERSION = 3;
  var V2_REBALANCED_THROUGH = 35;
  var V3_CHANGED = {15:1,26:1,27:1,28:1,29:1,30:1,31:1,32:1,33:1,34:1,35:1};
  var defaults = { unlockedStage: 1, clearedStages: [], bestMoves: {}, sound: true, vibration: true, tutorialCompleted: false, progressionVersion: PROGRESSION_VERSION };
  function maxStage() { return window.CR_STAGES && window.CR_STAGES.length ? window.CR_STAGES.length : 30; }
  function fresh() { return JSON.parse(JSON.stringify(defaults)); }
  function migratedBestMoves(rawBest, rawVersion, max) {
    if (!rawBest || typeof rawBest !== 'object') return {};
    if (rawVersion === PROGRESSION_VERSION) return rawBest;
    return Object.keys(rawBest).reduce(function(out, key) {
      var stage = Number(key);
      if (!Number.isInteger(stage) || stage < 1 || stage > max) return out;
      if (rawVersion === 2) {
        if (!V3_CHANGED[stage]) out[key] = rawBest[key];
      } else if (stage > V2_REBALANCED_THROUGH) {
        out[key] = rawBest[key];
      }
      return out;
    }, {});
  }
  function valid(raw) {
    if (!raw || typeof raw !== 'object') return fresh();
    var max = maxStage();
    var cleared = Array.isArray(raw.clearedStages) ? raw.clearedStages.filter(function(n){ return Number.isInteger(n) && n >= 1 && n <= max; }) : [];
    var earnedUnlock = cleared.reduce(function(n, stage){ return Math.max(n, stage + 1); }, 1);
    return {
      unlockedStage: Math.max(1, Math.min(max, Math.max(Number.isInteger(raw.unlockedStage) ? raw.unlockedStage : 1, earnedUnlock))),
      clearedStages: cleared,
      bestMoves: migratedBestMoves(raw.bestMoves, raw.progressionVersion, max),
      sound: raw.sound !== false, vibration: raw.vibration !== false,
      tutorialCompleted: raw.tutorialCompleted === true,
      progressionVersion: PROGRESSION_VERSION
    };
  }
  window.CRStorage = {
    load: function () { try { return valid(JSON.parse(localStorage.getItem(KEY))); } catch (_) { return fresh(); } },
    save: function (data) { try { localStorage.setItem(KEY, JSON.stringify(valid(data))); return true; } catch (_) { return false; } },
    defaults: fresh
  };
}());
