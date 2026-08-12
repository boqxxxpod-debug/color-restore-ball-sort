(function () {
  'use strict';
  var KEY = 'colorRestoreSave';
  var defaults = { unlockedStage: 1, clearedStages: [], bestMoves: {}, sound: true, vibration: true, tutorialCompleted: false };
  function fresh() { return JSON.parse(JSON.stringify(defaults)); }
  function valid(raw) {
    if (!raw || typeof raw !== 'object') return fresh();
    return {
      unlockedStage: Math.max(1, Math.min(30, Number.isInteger(raw.unlockedStage) ? raw.unlockedStage : 1)),
      clearedStages: Array.isArray(raw.clearedStages) ? raw.clearedStages.filter(function(n){ return Number.isInteger(n) && n >= 1 && n <= 30; }) : [],
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
