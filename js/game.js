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
  // Tube positions have no meaning in this puzzle. Sorting their contents makes
  // permutations of the same board share one visited/cache entry.
  function stateKey(tubes,cap){return cap+'|'+tubes.map(function(t){return t.join(',');}).sort().join('|');}
  var solveCache=new Map(),CACHE_LIMIT=300;
  function cacheSet(key,value){if(solveCache.has(key))solveCache.delete(key);solveCache.set(key,value);if(solveCache.size>CACHE_LIMIT)solveCache.delete(solveCache.keys().next().value);}
  function createSolveSearch(tubes,cap,options){
    options=options||{};var start=clone(tubes),startKey=stateKey(start,cap),cached=solveCache.get(startKey);
    if(cached)return {step:function(){return cached;},key:startKey,visited:0};
    var stack=[start],visited=new Set([startKey]),maxVisited=options.maxVisited||50000,finished=null;
    function step(budget){
      if(finished)return finished;
      budget=Math.max(1,budget||250);
      while(stack.length&&budget--){
        var board=stack.pop();
        if(cleared(board,cap)){finished='solvable';cacheSet(startKey,finished);return finished;}
        var destinations={};
        for(var from=0;from<board.length;from++){
          if(!board[from].length)continue;
          for(var to=0;to<board.length;to++){
            if(!legal(board,from,to,cap))continue;
            // Equivalent source/destination tubes produce equivalent children.
            var destination=board[to].join(',');
            var pair=board[from].join(',')+'>'+destination;if(destinations[pair])continue;destinations[pair]=1;
            var next=clone(board);move(next,from,to,cap);var key=stateKey(next,cap);
            if(visited.has(key))continue;
            if(visited.size>=maxVisited){finished='unknown';return finished;}
            visited.add(key);stack.push(next);
          }
        }
      }
      if(!stack.length){finished='unsolvable';cacheSet(startKey,finished);return finished;}
      return 'searching';
    }
    return {step:step,key:startKey,get visited(){return visited.size;}};
  }
  function cachedSolvability(tubes,cap){return solveCache.get(stateKey(tubes,cap))||null;}
  // The hint search shares the production legality and move implementation
  // with the stuck solver. Stable from/to iteration breaks shortest-path ties.
  function createHintSearch(tubes,cap,options){
    options=options||{};var start=clone(tubes),queue=[{board:start,first:null,depth:0}],cursor=0,visited=new Set([stateKey(start,cap)]),maxVisited=options.maxVisited||50000,finished=null;
    function step(budget){
      if(finished)return finished;budget=Math.max(1,budget||250);
      while(cursor<queue.length&&budget--){
        var node=queue[cursor++];
        if(cleared(node.board,cap)){finished={status:'solved',move:node.first,distance:node.depth,visited:visited.size};return finished;}
        var equivalent={};
        for(var from=0;from<node.board.length;from++)for(var to=0;to<node.board.length;to++){
          if(!legal(node.board,from,to,cap))continue;
          var signature=node.board[from].join(',')+'>'+node.board[to].join(',');if(equivalent[signature])continue;equivalent[signature]=1;
          var next=clone(node.board);move(next,from,to,cap);var key=stateKey(next,cap);if(visited.has(key))continue;
          if(visited.size>=maxVisited){finished={status:'unknown',move:null,distance:null,visited:visited.size};return finished;}
          visited.add(key);queue.push({board:next,first:node.first||{from:from,to:to},depth:node.depth+1});
        }
      }
      if(cursor>=queue.length){finished={status:'unsolvable',move:null,distance:null,visited:visited.size};return finished;}
      return {status:'searching',move:null,distance:null,visited:visited.size};
    }
    return {step:step,key:stateKey(start,cap),get visited(){return visited.size;}};
  }
  window.CRGame={clone:clone,topRun:topRun,isLegalMove:legal,applyMove:move,isCleared:cleared,isStuck:stuck,stateKey:stateKey,createSolveSearch:createSolveSearch,createHintSearch:createHintSearch,cachedSolvability:cachedSolvability};
}());
