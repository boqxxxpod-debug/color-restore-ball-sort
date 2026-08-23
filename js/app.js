(function(){
  'use strict';
  var $=function(s){return document.querySelector(s);};
  var $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s));};
  var save=CRStorage.load();
  var state={stageId:1,capacity:4,tubes:[],initialTubes:[],rules:{},ruleState:{locksOpen:true},initialRuleState:{locksOpen:true},moveLimit:null,selectedTube:null,moveCount:0,history:[],isAnimating:false,isCleared:false,isStuck:false,isLimitFailed:false};
  var app=window.ColorRestore={save:save,state:state};
  var screens=$$('.screen'),board=$('#tube-board'),tutorialStep=0,hintTimer,solveTimer,solveGeneration=0;

  function show(id){screens.forEach(function(x){x.classList.toggle('active',x.id===id);});window.scrollTo(0,0);}
  function persist(){CRStorage.save(save);}
  function worldCompletion(world){return CRStage.completion(world,save.clearedStages,CR_STAGES.length);}
  function buildSelect(){
    var worlds=CRStage.worlds(CR_STAGES.length);
    $('#world-tabs').innerHTML=worlds.map(function(w){var done=worldCompletion(w);return '<button data-start="'+w.start+'">'+w.label+'<small>'+done.count+'/'+done.total+'</small></button>';}).join('');
    var html='';
    CR_STAGES.forEach(function(s){var locked=s.id>save.unlockedStage,done=save.clearedStages.indexOf(s.id)>=0;html+='<button class="stage-tile '+(locked?'locked ':'')+(done?'done':'')+'" data-stage="'+s.id+'" '+(locked?'disabled':'')+'><span>'+(locked?'🔒':s.id)+'</span><small>'+(done?'BEST '+save.bestMoves[s.id]:locked?'LOCKED':'PLAY')+'</small></button>';});
    $('#stage-grid').innerHTML=html;
    $$('.stage-tile:not(.locked)').forEach(function(b){b.onclick=function(){loadStage(+b.dataset.stage);};});
    $$('#world-tabs button').forEach(function(b){b.onclick=function(){var tile=$('[data-stage="'+b.dataset.start+'"]');if(tile)tile.scrollIntoView({behavior:'smooth',block:'center'});};});
  }
  function cancelSolve(){solveGeneration++;clearTimeout(solveTimer);}
  function clearHint(){clearTimeout(hintTimer);$$('.hint-from,.hint-to').forEach(function(el){el.classList.remove('hint-from','hint-to');});}
  function cancelWork(){cancelSolve();clearHint();}
  function stageRuleLabel(data){
    if(data.moveLimit)return '⏱ '+data.moveLimit+'手以内';
    if(data.rules&&data.rules.targets)return '🎯 指定色を目標チューブへ';
    if(data.rules&&data.rules.lockedTubes)return '🔒 1色完成でチューブ解放';
    if((data.capacity||4)===5)return '5 BALL TUBES';
    if(data.tubes.filter(function(t){return !t.length;}).length===1)return 'EMPTY TUBE ×1';
    return '';
  }
  function currentKey(){return CRGame.stateKey(state.tubes,state.capacity,state.rules,state.ruleState);}
  function searchOptions(maxVisited){return {maxVisited:maxVisited,rules:state.rules,ruleState:CRGame.cloneRuleState(state.ruleState)};}
  function loadStage(id){
    var data=CR_STAGES[id-1];if(!data||id>save.unlockedStage)return;
    cancelWork();state.stageId=id;state.capacity=data.capacity||4;state.tubes=CRGame.clone(data.tubes);state.initialTubes=CRGame.clone(data.tubes);state.rules=data.rules||{};state.ruleState=CRGame.createRuleState(state.tubes,state.capacity,state.rules);state.initialRuleState=CRGame.cloneRuleState(state.ruleState);state.moveLimit=data.moveLimit||null;state.selectedTube=null;state.moveCount=0;state.history=[];state.isAnimating=false;state.isCleared=false;state.isStuck=false;state.isLimitFailed=false;tutorialStep=0;
    $('#clear-modal').classList.remove('open');$('#stuck-modal').classList.remove('open');$('#limit-modal').classList.remove('open');
    var w=CRStage.worldFor(id),world=$('#world'),total=CR_STAGES.length,done=worldCompletion(w);world.className='world '+w.key;world.style.setProperty('--gray',(100-(done.total?done.count/done.total*100:0))+'%');$('#world-name').textContent=w.name;$('#stage-number').textContent=id;$('#stage-total').textContent=total;$('#rule-chip').textContent=stageRuleLabel(data);$('.level-progress').setAttribute('aria-label','全'+total+'レベル中、現在レベル'+id);
    render();show('game-screen');updateTutorial();
  }
  function makeTube(i){
    var tube=state.tubes[i],el=document.createElement('button'),locked=CRGame.isTubeLocked(state.rules,state.ruleState,i),isLock=(state.rules.lockedTubes||[]).indexOf(i)>=0,target=state.rules.targets&&state.rules.targets[i];
    el.className='tube capacity-'+state.capacity+(state.selectedTube===i?' selected':'')+(locked?' locked-tube':'')+(isLock&&!locked?' unlocked-tube':'')+(target?' target-tube target-'+target:'');el.dataset.index=i;
    var label='チューブ '+(i+1)+'、ボール '+tube.length+'個';if(locked)label+='、ロック中';if(target)label+='、目標 '+target;el.setAttribute('aria-label',label);if(locked)el.setAttribute('aria-disabled','true');
    if(isLock){var lock=document.createElement('span');lock.className='lock-badge';lock.setAttribute('aria-hidden','true');lock.textContent=locked?'🔒':'🔓';el.appendChild(lock);}
    if(target){var marker=document.createElement('span');marker.className='target-marker';marker.setAttribute('aria-hidden','true');marker.textContent='◎';el.appendChild(marker);}
    for(var p=0;p<state.capacity;p++){var ball=document.createElement('i');ball.className='ball'+(p<tube.length?' '+tube[p]:' empty');ball.style.setProperty('--slot',p);el.appendChild(ball);}
    var pointerAt=0;el.addEventListener('pointerup',function(e){if(e.pointerType==='mouse'&&e.button!==0)return;pointerAt=Date.now();e.preventDefault();tapTube(i);});el.addEventListener('click',function(){if(Date.now()-pointerAt<500)return;tapTube(i);});return el;
  }
  function updateCounters(){
    $('#move-count').textContent=state.moveCount;$('#best-count').textContent=save.bestMoves[state.stageId]?'BEST '+save.bestMoves[state.stageId]:'BEST —';$('#undo-btn').disabled=!state.history.length||state.isAnimating;
    var limit=$('#limit-count');if(state.moveLimit){limit.textContent='残り '+Math.max(0,state.moveLimit-state.moveCount)+'手';limit.classList.remove('hidden');}else{limit.textContent='';limit.classList.add('hidden');}
  }
  function updateSelection(previous){if(previous!==null&&board.children[previous])board.children[previous].classList.remove('selected');if(state.selectedTube!==null&&board.children[state.selectedTube])board.children[state.selectedTube].classList.add('selected');}
  function updateTube(i){var old=board.children[i];if(old)board.replaceChild(makeTube(i),old);}
  function render(){board.innerHTML='';board.classList.toggle('capacity-5',state.capacity===5);state.tubes.forEach(function(_,i){board.appendChild(makeTube(i));});updateCounters();}
  function updateTutorial(){var t=$('#tutorial');if(state.stageId===1&&!save.tutorialCompleted){t.classList.remove('hidden');t.querySelector('b').textContent=tutorialStep?'移動先の筒をタップ':'この筒をタップ';}else t.classList.add('hidden');}
  function checkSolvability(){
    cancelSolve();if(state.isCleared||state.isLimitFailed)return;
    if(CRGame.isStuck(state.tubes,state.capacity,state.rules,state.ruleState)){showStuck();return;}
    var generation=solveGeneration,key=currentKey(),search=CRGame.createSolveSearch(state.tubes,state.capacity,searchOptions(50000)),started=Date.now();
    function slice(){
      if(generation!==solveGeneration||state.isCleared||state.isLimitFailed||key!==currentKey())return;
      var sliceStarted=Date.now(),result='searching';while(result==='searching'&&Date.now()-sliceStarted<6)result=search.step(200);
      if(result==='unsolvable'){showStuck();return;}
      if(result==='unknown'||result==='solvable'||Date.now()-started>=1200)return;
      solveTimer=setTimeout(slice,0);
    }
    solveTimer=setTimeout(slice,0);
  }
  function tapTube(i){
    if(state.isAnimating||state.isCleared||state.isLimitFailed)return;clearHint();
    if(CRGame.isTubeLocked(state.rules,state.ruleState,i)){invalid(i);toast('🔒 1色完成すると使えます');return;}
    if(state.selectedTube===null){if(!state.tubes[i].length){invalid(i);return;}state.selectedTube=i;tutorialStep=1;updateSelection(null);updateTutorial();return;}
    if(state.selectedTube===i){var deselected=state.selectedTube;state.selectedTube=null;updateSelection(deselected);return;}
    var from=state.selectedTube;if(!CRGame.isLegalMove(state.tubes,from,i,state.capacity,state.rules,state.ruleState)){invalid(i);return;}
    cancelSolve();state.history.push({tubes:CRGame.clone(state.tubes),ruleState:CRGame.cloneRuleState(state.ruleState),moveCount:state.moveCount});if(state.history.length>100)state.history.shift();state.isAnimating=true;
    var locksWereOpen=state.ruleState.locksOpen;CRGame.applyMove(state.tubes,from,i,state.capacity,state.rules,state.ruleState);var openedNow=!locksWereOpen&&state.ruleState.locksOpen;state.moveCount++;state.selectedTube=null;
    if(openedNow)render();else{updateTube(from);updateTube(i);updateCounters();}
    var fromEl=board.children[from],toEl=board.children[i],finished=false;fromEl.classList.add('pouring');toEl.classList.add('receiving');if(openedNow)toast('🔓 チューブを解放しました');if(!save.tutorialCompleted){save.tutorialCompleted=true;persist();}CRSound.move();updateTutorial();
    function finish(){if(finished)return;finished=true;state.isAnimating=false;fromEl.classList.remove('pouring');toEl.classList.remove('receiving');updateCounters();if(CRGame.isCleared(state.tubes,state.capacity,state.rules))clearStage();else if(state.moveLimit&&state.moveCount>=state.moveLimit)showLimit();else checkSolvability();}
    fromEl.addEventListener('animationend',finish,{once:true});setTimeout(finish,220);
  }
  function invalid(i){CRSound.invalid();var el=board.children[i];if(!el)return;el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');if(navigator.vibrate&&save.vibration)navigator.vibrate(35);}
  function hideStuck(){state.isStuck=false;$('#stuck-modal').classList.remove('open');}
  function showStuck(){clearHint();state.isStuck=true;var previous=state.selectedTube;state.selectedTube=null;updateSelection(previous);$('#stuck-modal').classList.add('open');}
  function hideLimit(){state.isLimitFailed=false;$('#limit-modal').classList.remove('open');}
  function showLimit(){clearHint();state.isLimitFailed=true;var previous=state.selectedTube;state.selectedTube=null;updateSelection(previous);$('#limit-modal').classList.add('open');}
  function undo(){if(state.isAnimating||state.isCleared||!state.history.length)return;cancelWork();hideStuck();hideLimit();var old=state.history.pop();state.tubes=CRGame.clone(old.tubes);state.ruleState=CRGame.cloneRuleState(old.ruleState);state.moveCount=old.moveCount;state.selectedTube=null;render();}
  function restart(){if(state.isAnimating)return;cancelWork();hideStuck();hideLimit();state.tubes=CRGame.clone(state.initialTubes);state.ruleState=CRGame.cloneRuleState(state.initialRuleState);state.moveCount=0;state.history=[];state.selectedTube=null;state.isCleared=false;state.isStuck=false;state.isLimitFailed=false;$('#clear-modal').classList.remove('open');render();}
  function hint(){
    if(state.isAnimating||state.isCleared||state.isLimitFailed)return;
    cancelWork();var previous=state.selectedTube;state.selectedTube=null;updateSelection(previous);
    if(state.isStuck||CRGame.isStuck(state.tubes,state.capacity,state.rules,state.ruleState)){showStuck();return;}
    var generation=solveGeneration,key=currentKey(),job=CRHint.search(state.tubes,state.capacity,searchOptions(50000)),started=Date.now();
    function slice(){
      if(generation!==solveGeneration||key!==currentKey()||state.isCleared||state.isLimitFailed)return;
      var sliceStarted=Date.now(),result={status:'searching'};while(result.status==='searching'&&Date.now()-sliceStarted<6)result=job.step(200);
      if(result.status==='searching'&&Date.now()-started<1200){solveTimer=setTimeout(slice,0);return;}
      if(result.status!=='solved'||!result.move){toast('HINTを計算できません');return;}
      if(state.moveLimit&&result.distance>state.moveLimit-state.moveCount)toast('残り手数ではクリアできません');
      var a=board.children[result.move.from],b=board.children[result.move.to];a.classList.add('hint-from');hintTimer=setTimeout(function(){if(generation===solveGeneration)b.classList.add('hint-to');},120);setTimeout(function(){if(generation===solveGeneration){a.classList.remove('hint-from');b.classList.remove('hint-to');}},650);
    }
    solveTimer=setTimeout(slice,0);
  }
  function confetti(){var box=$('#confetti');box.innerHTML='';for(var i=0;i<28;i++){var x=document.createElement('i');x.style.left=(5+Math.random()*90)+'%';x.style.background=['#ff5d73','#ffd447','#36c9a5','#518cff','#9b65d8'][i%5];x.style.animationDelay=(Math.random()*.35)+'s';box.appendChild(x);}setTimeout(function(){box.innerHTML='';},1900);}
  function clearStage(){cancelWork();state.isCleared=true;var total=CR_STAGES.length;save.clearedStages.indexOf(state.stageId)<0&&save.clearedStages.push(state.stageId);if(state.stageId<total)save.unlockedStage=Math.max(save.unlockedStage,state.stageId+1);var best=save.bestMoves[state.stageId];if(!best||state.moveCount<best)save.bestMoves[state.stageId]=state.moveCount;persist();$$('.tube').forEach(function(t){t.classList.add('complete');});CRSound.clear();confetti();$('#result-moves').textContent=state.moveCount;$('#result-best').textContent=save.bestMoves[state.stageId];$('#next-btn').textContent=state.stageId===total?'ALL STAGES CLEAR':'NEXT STAGE';setTimeout(function(){$('#clear-modal').classList.add('open');},850);}
  function toast(s){var t=$('#toast');t.textContent=s;t.classList.add('show');setTimeout(function(){t.classList.remove('show');},1400);}

  $('#play-btn').onclick=function(){loadStage(Math.min(save.unlockedStage,CR_STAGES.length));};$('#select-btn').onclick=function(){buildSelect();show('select-screen');};$$('.back-title').forEach(function(b){b.onclick=function(){cancelWork();show('title-screen');};});$('#home-btn').onclick=function(){if(state.isAnimating)return;cancelWork();buildSelect();show('select-screen');};$('#undo-btn').onclick=undo;$('#restart-btn').onclick=restart;$('#stuck-undo-btn').onclick=undo;$('#stuck-restart-btn').onclick=restart;$('#limit-undo-btn').onclick=undo;$('#limit-restart-btn').onclick=restart;$('#hint-btn').onclick=hint;$('#replay-btn').onclick=restart;$('#modal-select-btn').onclick=function(){cancelWork();buildSelect();show('select-screen');};$('#next-btn').onclick=function(){if(state.stageId<CR_STAGES.length)loadStage(state.stageId+1);else{buildSelect();show('select-screen');$('#clear-modal').classList.remove('open');}};
  app.loadStage=loadStage;app.undo=undo;app.restart=restart;app.hint=hint;app.complete=clearStage;buildSelect();
}());
