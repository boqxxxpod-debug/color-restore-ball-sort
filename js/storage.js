(function () {
  'use strict';
  var KEY = 'colorRestoreSave';
  var defaults = { unlockedStage: 1, clearedStages: [], bestMoves: {}, sound: true, vibration: true, tutorialCompleted: false };
  function maxStage() { return window.CR_STAGES && window.CR_STAGES.length ? window.CR_STAGES.length : 30; }
  function fresh() { return JSON.parse(JSON.stringify(defaults)); }
  function valid(raw) {
    if (!raw || typeof raw !== 'object') return fresh();
    var max = maxStage();
    var cleared = Array.isArray(raw.clearedStages) ? raw.clearedStages.filter(function(n){ return Number.isInteger(n) && n >= 1 && n <= max; }) : [];
    var earnedUnlock = cleared.reduce(function(n, stage){ return Math.max(n, stage + 1); }, 1);
    return {
      unlockedStage: Math.max(1, Math.min(max, Math.max(Number.isInteger(raw.unlockedStage) ? raw.unlockedStage : 1, earnedUnlock))),
      clearedStages: cleared,
      bestMoves: raw.bestMoves && typeof raw.bestMoves === 'object' ? raw.bestMoves : {},
      sound: raw.sound !== false, vibration: raw.vibration !== false,
      tutorialCompleted: raw.tutorialCompleted === true
    };
  }
  window.CRStorage = {
    load: function () { try { return valid(JSON.parse(localStorage.getItem(KEY))); } catch (_) { return fresh(); } },
    save: function (data) { try { localStorage.setItem(KEY, JSON.stringify(valid(data))); return true; } catch (_) { return false; } },
    defaults: fresh
  };
}());
