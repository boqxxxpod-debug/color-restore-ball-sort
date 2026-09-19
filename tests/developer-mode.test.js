const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function storageContext(hash){
  const session={};
  const context={
    window:{
      CR_STAGES:Array.from({length:85}),
      location:{hash:hash||'',pathname:'/color-restore-ball-sort/',search:''},
      history:{replaceState(_state,_title,url){context.replacedUrl=url;}},
      sessionStorage:{getItem:key=>session[key]||null,setItem:(key,value)=>{session[key]=value;}}
    },
    localStorage:{getItem:()=>null,setItem:()=>{}}
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/storage.js','utf8'),context,{filename:'js/storage.js'});
  return context;
}

const normal=storageContext('');
assert.equal(normal.window.CRStorage.allStagesEnabled(),false,'ordinary sessions retain normal progression');
assert.equal(normal.replacedUrl,undefined,'ordinary URLs are untouched');

const playtest=storageContext('#cr-qa-85');
assert.equal(playtest.window.CRStorage.allStagesEnabled(),true,'the private session unlocks all stages');
assert.equal(playtest.replacedUrl,'/color-restore-ball-sort/','the activation fragment is removed immediately');
assert.equal(playtest.window.CRStorage.load().unlockedStage,1,'developer access does not overwrite player progress');

const app=fs.readFileSync('js/app.js','utf8');
assert(app.includes('!allStagesEnabled&&s.id>save.unlockedStage'),'stage select bypasses locks only in the private session');
assert(app.includes('(!allStagesEnabled&&id>save.unlockedStage)'),'direct stage loading keeps the same guard');
assert(!fs.readFileSync('index.html','utf8').match(/developer|playtest|開発者/i),'normal UI does not advertise the mode');

console.log('private all-stage playtest mode passed');
