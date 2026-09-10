(function(){
  'use strict';
  function clone(t){return t.map(function(x){return x.slice();});}
  function cloneRuleState(state){var used={},source=state&&state.dyeUsed||{};Object.keys(source).forEach(function(color){if(Number.isInteger(source[color])&&source[color]>0)used[color]=source[color];});return {locksOpen:!!(state&&state.locksOpen),chainIndex:Math.max(0,state&&Number.isInteger(state.chainIndex)?state.chainIndex:0),flipsRemaining:Math.max(0,state&&Number.isInteger(state.flipsRemaining)?state.flipsRemaining:0),flipsUsed:Math.max(0,state&&Number.isInteger(state.flipsUsed)?state.flipsUsed:0),isFlipped:!!(state&&state.isFlipped),forgeRemaining:Math.max(0,state&&Number.isInteger(state.forgeRemaining)?state.forgeRemaining:0),dyesUsed:Math.max(0,state&&Number.isInteger(state.dyesUsed)?state.dyesUsed:0),dyeUsed:used};}
  function topRun(tube){if(!tube.length)return 0;var c=tube[tube.length-1],n=0;for(var i=tube.length-1;i>=0&&tube[i]===c;i--)n++;return n;}
  function completeTube(tube,cap){return tube.length===cap&&tube[0]!=='gray'&&tube.every(function(c){return c===tube[0];});}
  function completedCount(tubes,cap){return tubes.reduce(function(n,tube){return n+(completeTube(tube,cap)?1:0);},0);}
  function lockedTubes(rules){return rules&&Array.isArray(rules.lockedTubes)?rules.lockedTubes:[];}
  function unlockChain(rules){return rules&&Array.isArray(rules.unlockChain)?rules.unlockChain:[];}
  function completedColor(tubes,cap,color){return tubes.some(function(tube){return completeTube(tube,cap)&&tube[0]===color;});}
  function chainStepForTube(rules,index){
    var chain=unlockChain(rules);
    for(var i=0;i<chain.length;i++)if(chain[i]&&chain[i].tube===index)return {index:i,color:chain[i].color,tube:index};
    return null;
  }
  function targetEntries(rules){return rules&&rules.targets?Object.keys(rules.targets).map(Number).sort(function(a,b){return a-b;}):[];}
  function flipLimit(rules){return Math.max(0,rules&&Number.isInteger(rules.flipLimit)?rules.flipLimit:0);}
  function forgeLimit(rules){return Math.max(0,rules&&Number.isInteger(rules.forgeLimit)?rules.forgeLimit:0);}
  function dyeStock(rules){return rules&&rules.dyeStock&&typeof rules.dyeStock==='object'?rules.dyeStock:{};}
  function dyeGoals(rules){return rules&&rules.dyeGoals&&typeof rules.dyeGoals==='object'?rules.dyeGoals:{};}
  function portalPairs(rules){return rules&&Array.isArray(rules.portals)?rules.portals.filter(function(pair){return pair&&Number.isInteger(pair.entry)&&Number.isInteger(pair.exit)&&pair.entry>=0&&pair.exit>=0&&pair.entry!==pair.exit;}):[];}
  function portalForEntry(rules,index){var pairs=portalPairs(rules);for(var i=0;i<pairs.length;i++)if(pairs[i].entry===index)return pairs[i];return null;}
  function portalForTube(rules,index){var pairs=portalPairs(rules);for(var i=0;i<pairs.length;i++)if(pairs[i].entry===index||pairs[i].exit===index)return {entry:pairs[i].entry,exit:pairs[i].exit,symbol:pairs[i].symbol||String.fromCharCode(65+i),pairIndex:i,role:pairs[i].entry===index?'entry':'exit'};return null;}
  function portalExit(rules,index){var pair=portalForEntry(rules,index);return pair?pair.exit:-1;}
  function dyeColors(rules){var order=['red','blue','yellow','green','purple','orange','cyan','pink'];return Object.keys(dyeStock(rules)).filter(function(color){return Number.isInteger(dyeStock(rules)[color])&&dyeStock(rules)[color]>0;}).sort(function(a,b){var ai=order.indexOf(a),bi=order.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b);});}
  function colorCounts(tubes){var counts={};tubes.forEach(function(tube){tube.forEach(function(color){if(color!=='gray')counts[color]=(counts[color]||0)+1;});});return counts;}
  function dyeNeeds(tubes,rules){var counts=colorCounts(tubes),needs={};Object.keys(dyeGoals(rules)).forEach(function(color){var needed=Math.max(0,dyeGoals(rules)[color]-(counts[color]||0));if(needed)needs[color]=needed;});return needs;}
  function hasSpecialRules(rules){return !!(rules&&(lockedTubes(rules).length||targetEntries(rules).length||unlockChain(rules).length||flipLimit(rules)||forgeLimit(rules)||portalPairs(rules).length));}
  function createRuleState(tubes,cap,rules){
    var locks=lockedTubes(rules),threshold=rules&&rules.unlockAfterCompleted||1;
    var state={locksOpen:!locks.length||completedCount(tubes,cap)>=threshold,chainIndex:0,flipsRemaining:flipLimit(rules),flipsUsed:0,isFlipped:false,forgeRemaining:forgeLimit(rules),dyesUsed:0,dyeUsed:{}};
    updateRuleState(tubes,cap,rules,state);return state;
  }
  function isTubeLocked(rules,ruleState,index){
    if(lockedTubes(rules).indexOf(index)>=0&&!(ruleState&&ruleState.locksOpen))return true;
    var step=chainStepForTube(rules,index);return !!step&&step.index>=Math.max(0,ruleState&&ruleState.chainIndex||0);
  }
  function updateRuleState(tubes,cap,rules,ruleState){
    if(!ruleState)return;
    if(!ruleState.locksOpen&&lockedTubes(rules).length&&completedCount(tubes,cap)>=(rules.unlockAfterCompleted||1))ruleState.locksOpen=true;
    var chain=unlockChain(rules),index=Math.max(0,ruleState.chainIndex||0);
    while(index<chain.length&&completedColor(tubes,cap,chain[index].color))index++;
    ruleState.chainIndex=index;
  }
  function legal(tubes,from,to,cap,rules,ruleState){
    if(from===to||!tubes[from]||!tubes[to]||!tubes[from].length||tubes[to].length>=cap)return false;
    if(isTubeLocked(rules,ruleState,from)||isTubeLocked(rules,ruleState,to))return false;
    if(tubes[to].length&&tubes[to][tubes[to].length-1]!==tubes[from][tubes[from].length-1])return false;
    var exit=portalExit(rules,to);if(exit>=0&&(exit===from||!tubes[exit]||tubes[exit].length>=cap||isTubeLocked(rules,ruleState,exit)))return false;
    return true;
  }
  function move(tubes,from,to,cap,rules,ruleState){if(!legal(tubes,from,to,cap,rules,ruleState))return 0;var ball=tubes[from].pop(),exit=portalExit(rules,to);tubes[exit>=0?exit:to].push(ball);updateRuleState(tubes,cap,rules,ruleState);return 1;}
  function canFlip(rules,ruleState){return flipLimit(rules)>0&&!!ruleState&&ruleState.flipsRemaining>0;}
  function flip(tubes,rules,ruleState){if(!canFlip(rules,ruleState))return 0;tubes.forEach(function(tube){tube.reverse();});ruleState.flipsRemaining--;ruleState.flipsUsed++;ruleState.isFlipped=!ruleState.isFlipped;return 1;}
  function dyeChoices(tubes,index,rules,ruleState){
    if(forgeLimit(rules)<=0||!ruleState||ruleState.forgeRemaining<=0||!tubes[index]||tubes[index][tubes[index].length-1]!=='gray'||isTubeLocked(rules,ruleState,index))return [];
    var used=ruleState.dyeUsed&&typeof ruleState.dyeUsed==='object'?ruleState.dyeUsed:{};
    return dyeColors(rules).filter(function(color){return Math.max(0,dyeStock(rules)[color]-(used[color]||0))>0;});
  }
  function canDye(tubes,rules,ruleState){for(var i=0;i<tubes.length;i++)if(dyeChoices(tubes,i,rules,ruleState).length)return true;return false;}
  function dye(tubes,index,color,cap,rules,ruleState){if(dyeChoices(tubes,index,rules,ruleState).indexOf(color)<0)return 0;tubes[index][tubes[index].length-1]=color;ruleState.forgeRemaining--;ruleState.dyesUsed=Math.max(0,Number.isInteger(ruleState.dyesUsed)?ruleState.dyesUsed:0)+1;if(!ruleState.dyeUsed||typeof ruleState.dyeUsed!=='object')ruleState.dyeUsed={};ruleState.dyeUsed[color]=(ruleState.dyeUsed[color]||0)+1;updateRuleState(tubes,cap,rules,ruleState);return 1;}
  function cleared(tubes,cap,rules){
    if(forgeLimit(rules)&&tubes.some(function(tube){return tube.indexOf('gray')>=0;}))return false;
    if(forgeLimit(rules)){
      var counts=colorCounts(tubes),goals=dyeGoals(rules),colors=Object.keys(counts).concat(Object.keys(goals));
      if(colors.some(function(color){return (counts[color]||0)!==(goals[color]||0);}))return false;
    }
    if(!tubes.every(function(t){return t.length===0||completeTube(t,cap);}))return false;
    var targets=targetEntries(rules);
    return targets.every(function(index){var tube=tubes[index],color=rules.targets[index];return tube&&tube.length===cap&&tube.every(function(c){return c===color;});});
  }
  function stuck(tubes,cap,rules,ruleState){
    if(cleared(tubes,cap,rules))return false;
    if(canFlip(rules,ruleState))return false;
    if(canDye(tubes,rules,ruleState))return false;
    for(var from=0;from<tubes.length;from++)for(var to=0;to<tubes.length;to++)if(legal(tubes,from,to,cap,rules,ruleState))return false;
    return true;
  }
  function tubeRole(rules,ruleState,index){
    if(rules&&rules.targets&&rules.targets[index])return 'target:'+rules.targets[index];
    if(isTubeLocked(rules,ruleState,index))return 'locked:'+index;
    var portal=portalForTube(rules,index);if(portal)return 'portal-'+portal.role+':'+portal.entry+'>'+portal.exit;
    return 'free';
  }
  function ruleKey(rules,ruleState){
    if(!hasSpecialRules(rules))return '';
    var locks=lockedTubes(rules).slice().sort(function(a,b){return a-b;}).join(','),targets=targetEntries(rules).map(function(i){return i+':'+rules.targets[i];}).join(','),chain=unlockChain(rules).map(function(step){return step.color+':'+step.tube;}).join(','),portals=portalPairs(rules).map(function(pair){return pair.entry+'>'+pair.exit;}).join(','),stock=dyeColors(rules).map(function(color){return color+':'+dyeStock(rules)[color];}).join(','),goals=Object.keys(dyeGoals(rules)).sort().map(function(color){return color+':'+dyeGoals(rules)[color];}).join(','),used=dyeColors(rules).map(function(color){return color+':'+Math.max(0,ruleState&&ruleState.dyeUsed&&ruleState.dyeUsed[color]||0);}).join(',');
    return 'r[l:'+locks+';u:'+(rules.unlockAfterCompleted||1)+';t:'+targets+';c:'+chain+';o:'+portals+';f:'+flipLimit(rules)+';g:'+forgeLimit(rules)+';p:'+stock+';n:'+goals+'];s:'+(ruleState&&ruleState.locksOpen?1:0)+','+Math.max(0,ruleState&&ruleState.chainIndex||0)+','+Math.max(0,ruleState&&ruleState.flipsRemaining||0)+','+(ruleState&&ruleState.isFlipped?1:0)+','+Math.max(0,ruleState&&ruleState.forgeRemaining||0)+','+used+'|';
  }
  // Only tubes with a special rule keep their position. All other tube
  // permutations still share one visited/cache entry.
  function stateKey(tubes,cap,rules,ruleState){
    if(!hasSpecialRules(rules))return cap+'|'+tubes.map(function(t){return t.join(',');}).sort().join('|');
    var fixed={},free=[];
    targetEntries(rules).forEach(function(i){fixed[i]=1;});
    if(!(ruleState&&ruleState.locksOpen))lockedTubes(rules).forEach(function(i){fixed[i]=1;});
    unlockChain(rules).forEach(function(step){if(isTubeLocked(rules,ruleState,step.tube))fixed[step.tube]=1;});
    portalPairs(rules).forEach(function(pair){fixed[pair.entry]=1;fixed[pair.exit]=1;});
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
        if(canFlip(rules,node.ruleState)){
          var flipped=clone(board),flippedState=cloneRuleState(node.ruleState);flip(flipped,rules,flippedState);var flipKey=stateKey(flipped,cap,rules,flippedState);
          if(!visited.has(flipKey)){if(visited.size>=maxVisited){finished='unknown';return finished;}visited.add(flipKey);stack.push({board:flipped,ruleState:flippedState});}
        }
        for(var dyeFrom=0;dyeFrom<board.length;dyeFrom++){
          var choices=dyeChoices(board,dyeFrom,rules,node.ruleState);
          for(var d=0;d<choices.length;d++){
            var dyed=clone(board),dyedState=cloneRuleState(node.ruleState),color=choices[d];dye(dyed,dyeFrom,color,cap,rules,dyedState);var dyeKey=stateKey(dyed,cap,rules,dyedState);if(visited.has(dyeKey))continue;
            if(visited.size>=maxVisited){finished='unknown';return finished;}
            visited.add(dyeKey);stack.push({board:dyed,ruleState:dyedState});
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
        if(canFlip(rules,node.ruleState)){
          var flipped=clone(node.board),flippedState=cloneRuleState(node.ruleState);flip(flipped,rules,flippedState);var flipKey=stateKey(flipped,cap,rules,flippedState);
          if(!visited.has(flipKey)){if(visited.size>=maxVisited){finished={status:'unknown',move:null,distance:null,visited:visited.size};return finished;}visited.add(flipKey);queue.push({board:flipped,ruleState:flippedState,first:node.first||{type:'flip'},depth:node.depth+1});}
        }
        for(var dyeFrom=0;dyeFrom<node.board.length;dyeFrom++){
          var choices=dyeChoices(node.board,dyeFrom,rules,node.ruleState);
          for(var d=0;d<choices.length;d++){
            var dyed=clone(node.board),dyedState=cloneRuleState(node.ruleState),color=choices[d];dye(dyed,dyeFrom,color,cap,rules,dyedState);var dyeKey=stateKey(dyed,cap,rules,dyedState);if(visited.has(dyeKey))continue;
            if(visited.size>=maxVisited){finished={status:'unknown',move:null,distance:null,visited:visited.size};return finished;}
            visited.add(dyeKey);queue.push({board:dyed,ruleState:dyedState,first:node.first||{type:'dye',tube:dyeFrom,color:color},depth:node.depth+1});
          }
        }
      }
      if(cursor>=queue.length){finished={status:'unsolvable',move:null,distance:null,visited:visited.size};return finished;}
      return {status:'searching',move:null,distance:null,visited:visited.size};
    }
    return {step:step,key:stateKey(start,cap,rules,startState),get visited(){return visited.size;}};
  }
  window.CRGame={clone:clone,cloneRuleState:cloneRuleState,createRuleState:createRuleState,isTubeLocked:isTubeLocked,chainStepForTube:chainStepForTube,completedCount:completedCount,topRun:topRun,isLegalMove:legal,applyMove:move,canFlip:canFlip,applyFlip:flip,dyeChoices:dyeChoices,canDye:canDye,applyDye:dye,dyeNeeds:dyeNeeds,portalPairs:portalPairs,portalForTube:portalForTube,portalExit:portalExit,isCleared:cleared,isStuck:stuck,stateKey:stateKey,createSolveSearch:createSolveSearch,createHintSearch:createHintSearch,cachedSolvability:cachedSolvability};
}());
