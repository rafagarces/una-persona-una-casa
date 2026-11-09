// rv5 without ink renders the exact rv4 markup; ink is appended last and never touches the seeded house.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class N{constructor(n){this.n=n;this.kids=[];this.a={}}setAttribute(k,v){this.a[k]=v}appendChild(c){this.kids.push(c)}}
const target={html:'',querySelector(){return this.svg},set innerHTML(v){this.html=v;this.svg=new N('svg')},get innerHTML(){return this.html}};
const c={window:{},document:{createElementNS:(ns,n)=>new N(n)}};vm.createContext(c);
c.window.CasasV4={render(t,h,s){t.innerHTML='<svg>'+s+'</svg>';return {background:'#abc'}}};
vm.runInContext(fs.readFileSync(__dirname+'/../renderer-v5.js','utf8'),c);const V5=c.window.CasasV5;
const house={v:1,rv:5,seed:99,layers:[]};
V5.render(target,house,99);const plain=target.html;assert.equal(plain,'<svg>99</svg>');assert.equal(target.svg.kids.length,0);
const ink=[{k:'p',c:'#3a3940',pts:[[1,1],[5,5]]},{k:'w',c:'#b04a41',pts:[[2,2],[9,9],[20,20]]}];
V5.render(target,{...house,ink},99);assert.equal(target.html,plain);assert.equal(target.svg.kids.length,1);assert.equal(target.svg.kids[0].kids.length,2);
V5.render(target,{...house,ink:[{k:'w',c:'#ff0000',pts:[[1,1],[2,2]]}]},99);assert.equal(target.svg.kids.length,0);
assert.equal(V5.validInk(ink),true);assert.equal(V5.validInk(Array(41).fill(ink[0])),false);assert.equal(V5.validInk([{k:'p',c:'#3a3940',pts:[[1,1]]}]),false);
console.log('PASS rv5: markup identical to rv4 without ink, ink appended last, invalid ink ignored');
