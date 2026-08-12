(function(){
  'use strict';
  function clone(t){return t.map(function(x){return x.slice();});}
  function topRun(tube){if(!tube.length)return 0;var c=tube[tube.length-1],n=0;for(var i=tube.length-1;i>=0&&tube[i]===c;i--)n++;return n;}
  function legal(tubes,from,to,cap){if(from===to||!tubes[from]||!tubes[to]||!tubes[from].length||tubes[to].length>=cap)return false;return !tubes[to].length||tubes[to][tubes[to].length-1]===tubes[from][tubes[from].length-1];}
  function move(tubes,from,to,cap){if(!legal(tubes,from,to,cap))return 0;tubes[to].push(tubes[from].pop());return 1;}
  function cleared(tubes,cap){return tubes.every(function(t){return t.length===0||(t.length===cap&&t.every(function(c){return c===t[0];}));});}
  function stuck(tubes,cap){
    if(cleared(tubes,cap))return false;
    for(var from=0;from<tubes.length;from++)for(var to=0;to<tubes.length;to++)if(legal(tubes,from,to,cap))return false;
    return true;
  }
  window.CRGame={clone:clone,topRun:topRun,isLegalMove:legal,applyMove:move,isCleared:cleared,isStuck:stuck};
}());
