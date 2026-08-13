(function(){
  'use strict';
  function search(tubes,cap,options){return CRGame.createHintSearch(tubes,cap,options);}
  function choose(tubes,cap){var job=search(tubes,cap),result;do{result=job.step(1000);}while(result.status==='searching');return result.status==='solved'?result.move:null;}
  window.CRHint={search:search,choose:choose};
}());
