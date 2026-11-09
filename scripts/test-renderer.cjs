const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../renderer-v2.js','utf8'),c);
const p=k=>({v:2,kind:k,color:'#dfa3a5',material:'pencil',outline:[[10,10],[90,10],[90,90],[10,90]],marks:[]});
const target=()=>({innerHTML:'',querySelector:()=>({getBBox:()=>({x:10,y:10,width:80,height:80}),setAttribute(){}})});
for(let n=1;n<=4;n++)for(let seed=1;seed<=100;seed++){const t=target();c.window.CasasV2.render(t,{wall:p('wall'),windows:Array(n).fill().map(()=>p('window'))},seed);assert.equal((t.innerHTML.match(/data-own-window=/g)||[]).length,n,`windows=${n},seed=${seed}`)}
console.log('PASS rv2: all1-4 own windows appear in400 seeded compositions');
