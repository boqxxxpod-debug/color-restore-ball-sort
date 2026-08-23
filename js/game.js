(function(){
  'use strict';
  function clone(t){return t.map(function(x){return x.slice();});}
  function cloneRuleState(state){return {locksOpen:!!(state&&state.locksOpen)};}
  function topRun(tube){if(!tube.length)return 0;var c=tube[tube.length-1],n=0;for(var i=tube.length-1;i>=0&&tube[i]===c;i--)n++;return n;}
  function completeTube(tube,cap){return tube.length===cap&&tube.every(function(c){return c===tube[0];});}
  function completedCount(tubes,cap){return tubes.reduce(function(n,tube){return n+(completeTube(tube,cap)?1:0);},0);}
  function lockedTubes(rules){return rules&&Array.isArray(rules.lockedTubes)?rules.lockedTubes:[];}
  function targetEntries(rules){return rules&&rules.targets?Object.keys(rules.targets).map(Number).sort(function(a,b){return a-b;}):[];}
  function createRuleState(tubes,cap,rules){
    var locks=lockedTubes(rules),threshold=rules&&rules.unlockAfterCompleted||1;
    return {locksOpen:!locks.length||completedCount(tubes,cap)>=threshold};
  }
  function isTubeLocked(rules,ruleState,index){return lockedTubes(rules).indexOf(index)>=0&&!(ruleState&&ruleState.locksOpen);}
  function updateRuleState(tubes,cap,rules,ruleState){
    if(!ruleState)return;
    if(!ruleState.locksOpen&&lockedTubes(rules).length&&completedCount(tubes,cap)>=(rules.unlockAfterCompleted||1))ruleState.locksOpen=true;
  }
  function legal(tubes,from,to,cap,rules,ruleState){
    if(from===to||!tubes[from]||!tubes[to]||!tubes[from].length||tubes[to].length>=cap)return false;
    if(isTubeLocked(rules,ruleState,from)||isTubeLocked(rules,ruleState,to))return false;
    return !tubes[to].length||tubes[to][tubes[to].length-1]===tubes[from][tubes[from].length-1];
  }
  function move(tubes,from,to,cap,rules,ruleState){if(!legal(tubes,from,to,cap,rules,ruleState))return 0;tubes[to].push(tubes[from].pop());updateRuleState(tubes,cap,rules,ruleState);return 1;}
  function cleared(tubes,cap,rules){
    if(!tubes.every(function(t){return t.length===0||completeTube(t,cap);}))return false;
    var targets=targetEntries(rules);
    return targets.every(function(index){var tube=tubes[index],color=rules.targets[index];return tube&&tube.length===cap&&tube.every(function(c){return c===color;});});
  }
  function stuck(tubes,cap,rules,ruleState){
    if(cleared(tubes,cap,rules))return false;
    for(var from=0;from<tubes.length;from++)for(var to=0;to<tubes.length;to++)if(legal(tubes,from,to,cap,rules,ruleState))return false;
    return true;
  }
  function tubeRole(rules,ruleState,index){
    if(rules&&rules.targets&&rules.targets[index])return 'target:'+rules.targets[index];
    if(isTubeLocked(rules,ruleState,index))return 'locked:'+index;
    return 'free';
  }
  function ruleKey(rules,ruleState){
    if(!rules||(!lockedTubes(rules).length&&!targetEntries(rules).length))return '';
    var locks=lockedTubes(rules).slice().sort(function(a,b){return a-b;}).join(','),targets=targetEntries(rules).map(function(i){return i+':'+rules.targets[i];}).join(',');
    return 'r[l:'+locks+';u:'+(rules.unlockAfterCompleted||1)+';t:'+targets+'];s:'+(ruleState&&ruleState.locksOpen?1:0)+'|';
  }
  // Only tubes with a special rule keep their position. All other tube
  // permutations still share one visited/cache entry.
  function stateKey(tubes,cap,rules,ruleState){
    if(!rules||(!lockedTubes(rules).length&&!targetEntries(rules).length))return cap+'|'+tubes.map(function(t){return t.join(',');}).sort().join('|');
    var fixed={},free=[];
    targetEntries(rules).forEach(function(i){fixed[i]=1;});
    if(!(ruleState&&ruleState.locksOpen))lockedTubes(rules).forEach(function(i){fixed[i]=1;});
    var positioned=[];tubes.forEach(function(t,i){if(fixed[i])positioned.push(i+':'+t.join(','));else free.push(t.join(','));});
    return cap+'|'+ruleKey(rules,ruleState)+'fixed:'+positioned.join('|')+'|free:'+free.sort().join('|');
  }
  function equivalentSignature(board,from,to,rules,ruleState){return board[from].join(',')+'@'+tubeRole(rules,ruleState,from)+'>'+board[to].join(',')+'@'+tubeRole(rules,ruleState,to);}
  var solveCache=new Map(),CACHE_LIMIT=300;
  function cacheSet(key,value){if(solveCache.has(key))solveCache.delete(key);solveCache.set(key,value);if(solveCache.size>CACHE_LIMIT)solveCache.delete(solveCache.keys().next().value);}
  function createSolveSearch(tubes,cap,options){
    options=options||{};var rules=options.rules||null,start=clone(tubes),startState=cloneRuleState(options.ruleState||createRuleState(start,cap,rules)),startKey=stateKey(start,cap,rules,startState),cached=solveCache.get(startKey);
    if(cached)return {step:function(){return cached;},key:startKey,visited:0};
    var stack=[{board:start,ruleState:startState}],visited=new Set([startKey]),maxVisited=options.maxVisited||50000,finished=null;
    function step(budget){
      if(finished)return finished;
      budget=Math.max(1,budget||250);
      while(stack.length&&budget--){
        var node=stack.pop(),board=node.board;
        if(cleared(board,cap,rules)){finished='solvable';cacheSet(startKey,finished);return finished;}
        var destinations={};
        for(var from=0;from<board.length;from++){
          if(!board[from].length)continue;
          for(var to=0;to<board.length;to++){
            if(!legal(board,from,to,cap,rules,node.ruleState))continue;
            var pair=equivalentSignature(board,from,to,rules,node.ruleState);if(destinations[pair])continue;destinations[pair]=1;
            var next=clone(board),nextState=cloneRuleState(node.ruleState);move(next,from,to,cap,rules,nextState);var key=stateKey(next,cap,rules,nextState);
            if(visited.has(key))continue;
            if(visited.size>=maxVisited){finished='unknown';return finished;}
            visited.add(key);stack.push({board:next,ruleState:nextState});
          }
        }
      }
      if(!stack.length){finished='unsolvable';cacheSet(startKey,finished);return finished;}
      return 'searching';
    }
    return {step:step,key:startKey,get visited(){return visited.size;}};
  }
  function cachedSolvability(tubes,cap,rules,ruleState){return solveCache.get(stateKey(tubes,cap,rules,ruleState))||null;}
  // The hint search shares the production legality, lock state and target
  // completion rules with normal play. Stable iteration breaks shortest ties.
  function createHintSearch(tubes,cap,options){
    options=options||{};var rules=options.rules||null,start=clone(tubes),startState=cloneRuleState(options.ruleState||createRuleState(start,cap,rules)),queue=[{board:start,ruleState:startState,first:null,depth:0}],cursor=0,visited=new Set([stateKey(start,cap,rules,startState)]),maxVisited=options.maxVisited||50000,finished=null;
    function step(budget){
      if(finished)return finished;budget=Math.max(1,budget||250);
      while(cursor<queue.length&&budget--){
        var node=queue[cursor++];
        if(cleared(node.board,cap,rules)){finished={status:'solved',move:node.first,distance:node.depth,visited:visited.size};return finished;}
        var equivalent={};
        for(var from=0;from<node.board.length;from++)for(var to=0;to<node.board.length;to++){
          if(!legal(node.board,from,to,cap,rules,node.ruleState))continue;
          var signature=equivalentSignature(node.board,from,to,rules,node.ruleState);if(equivalent[signature])continue;equivalent[signature]=1;
          var next=clone(node.board),nextState=cloneRuleState(node.ruleState);move(next,from,to,cap,rules,nextState);var key=stateKey(next,cap,rules,nextState);if(visited.has(key))continue;
          if(visited.size>=maxVisited){finished={status:'unknown',move:null,distance:null,visited:visited.size};return finished;}
          visited.add(key);queue.push({board:next,ruleState:nextState,first:node.first||{from:from,to:to},depth:node.depth+1});
        }
      }
      if(cursor>=queue.length){finished={status:'unsolvable',move:null,distance:null,visited:visited.size};return finished;}
      return {status:'searching',move:null,distance:null,visited:visited.size};
    }
    return {step:step,key:stateKey(start,cap,rules,startState),get visited(){return visited.size;}};
  }
  window.CRGame={clone:clone,cloneRuleState:cloneRuleState,createRuleState:createRuleState,isTubeLocked:isTubeLocked,completedCount:completedCount,topRun:topRun,isLegalMove:legal,applyMove:move,isCleared:cleared,isStuck:stuck,stateKey:stateKey,createSolveSearch:createSolveSearch,createHintSearch:createHintSearch,cachedSolvability:cachedSolvability};
}());
