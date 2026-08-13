(function(root){
'use strict';
function create(clock){
  clock=clock||window;
  var generation=0,timers=new Map();
  function cancel(name){if(!timers.has(name))return;clock.clearTimeout(timers.get(name));timers.delete(name);}
  function schedule(name,callback,delay){
    cancel(name);
    var mine=generation,id=clock.setTimeout(function(){timers.delete(name);if(mine===generation)callback();},delay);
    timers.set(name,id);return id;
  }
  function leave(){generation++;timers.forEach(function(id){clock.clearTimeout(id);});timers.clear();}
  return {schedule:schedule,cancel:cancel,leave:leave,generation:function(){return generation;},pending:function(){return Array.from(timers.keys());}};
}
root.CRLifecycle={create:create};
})(typeof window==='undefined'?globalThis:window);
