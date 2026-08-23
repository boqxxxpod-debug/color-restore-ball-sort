(function(){
  'use strict';
  var worlds=[
    {key:'garden',name:'GARDEN',label:'Garden',start:1,end:10},
    {key:'ocean',name:'OCEAN',label:'Ocean',start:11,end:20},
    {key:'city',name:'CITY',label:'City',start:21,end:30},
    {key:'aurora',name:'AURORA',label:'Aurora',start:31,end:40},
    {key:'crystal',name:'CRYSTAL',label:'Crystal',start:41,end:50},
    {key:'challenge',name:'CHALLENGE',label:'Challenge',start:51,end:60}
  ];
  function available(total){return worlds.filter(function(w){return w.start<=total;}).map(function(w){return {key:w.key,name:w.name,label:w.label,start:w.start,end:Math.min(w.end,total)};});}
  function worldFor(id){for(var i=0;i<worlds.length;i++)if(id>=worlds[i].start&&id<=worlds[i].end)return worlds[i];return worlds[worlds.length-1];}
  function completed(world,cleared,total){var end=Math.min(world.end,total),count=0;cleared.forEach(function(n){if(n>=world.start&&n<=end)count++;});return {count:count,total:Math.max(0,end-world.start+1)};}
  window.CRStage={worlds:available,worldFor:worldFor,completion:completed,progress:function(id,cleared,total){var result=completed(worldFor(id),cleared,total);return result.total?result.count/result.total:0;}};
}());
