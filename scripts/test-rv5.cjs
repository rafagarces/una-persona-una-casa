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

// rv6: los recortes propios llevan la misma sombra de cartulina (filtro sh) que las piezas generadas,
// también cuando la casa no tiene base (SVG nuevo que debe incluir los defs) y en pieceSVG aislado.
{
 const target2={html:'',_q:null,_svg:null,querySelector(sel){return sel==='#hs'?this._q:this._svg},querySelectorAll(){return []},set innerHTML(v){this.html=v;this._q={getBBox:()=>({x:10,y:10,width:50,height:50}),setAttribute(){}};this._svg={kids:[],setAttribute(){},appendChild(c){this.kids.push(c)},insertBefore(){},childNodes:[]}},get innerHTML(){return this.html}};
 const c2={window:{},document:{createElementNS:(ns,n)=>({attrs:{},kids:[],setAttribute(k,v){this.attrs[k]=v},appendChild(c){this.kids.push(c)},innerHTML:''})}};vm.createContext(c2);
 vm.runInContext(fs.readFileSync(__dirname+'/../renderer-v6.js','utf8'),c2);const V6=c2.window.CasasV6;
 const piece={v:2,kind:'wall',color:'#b04a41',material:'pencil',outline:[[10,20],[60,20],[60,85],[10,85]],marks:[]};
 V6.render(target2,{v:1,rv:6,seed:5,layers:[{kind:'wall',pieces:[piece]}]},5);
 const defId=(target2.html.match(/filter id="(sh-v6-r\d+)"/)||[])[1];assert.ok(defId,'el SVG sin base debe definir el filtro de sombra');
 assert.ok(target2.html.includes('feDropShadow dx=".06" dy=".1" stdDeviation=".1" flood-color="#241a30" flood-opacity=".11"'),'sombra idéntica a la de las casas iniciales');
 const layer=target2._svg;assert.ok(layer.kids.length>=1,'la capa se anexa al SVG');
 const layerHtml=layer.kids.map(k=>k.innerHTML||'').join('');
 assert.ok(layerHtml.includes('filter="url(#'+defId+')"'),'los recortes referencian el filtro definido');
 assert.ok(layerHtml.includes('data-direct-piece="wall-'),'recorte propio presente');
 const iso=V6.pieceSVG(piece);const isoId=(iso.match(/filter id="(sh-v6-r\d+)"/)||[])[1];assert.ok(isoId&&iso.includes('filter="url(#'+isoId+')"'),'pieceSVG aislado define y referencia la sombra');
 console.log('PASS rv6: recortes propios con la sombra de cartulina original, defs presentes sin base y en pieceSVG');
}
