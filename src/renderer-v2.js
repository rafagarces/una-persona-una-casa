// Frozen gallery renderer rv2. Never edit: create rv3 for future changes.

(function(){
  var COMMUNITY=[],ACTIVE=null,USED=false,LAST_SHARED=false;
  var PAGE='#a9c3dd',INK='#2b2540',WAX=false,WAXC='#2b2540';
  var INKS=['#2b2a33','#3a3846','#453f3b','#2a3350','#34302e','#4a4452'];
  function hx(n){n=Math.max(0,Math.min(255,Math.round(n)));return(n<16?'0':'')+n.toString(16)}
  function hsl(h,s,l){h=((h%360)+360)%360;s/=100;l/=100;var a=s*Math.min(l,1-l);
    function k(n){var m=(n+h/30)%12;return l-a*Math.max(-1,Math.min(m-3,9-m,1))}
    return'#'+hx(k(0)*255)+hx(k(8)*255)+hx(k(4)*255)}
  function makeBG(){return hsl(R(0,360),R(45,90),R(36,62))}
  function makePool(bg){var pool=[],n=0,t=0;
    while(pool.length<14&&t++<200){
      var m=rnd(),c=m<.3?hsl(R(0,360),R(25,60),R(80,92)):m<.55?hsl(R(0,360),R(55,90),R(60,76)):m<.8?hsl(R(0,360),R(40,80),R(40,58)):hsl(R(30,60),R(10,35),R(88,96));
      if(dist(c,bg)>110)pool.push(c)}
    return pool}
  var seed;
  function rnd(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
  function R(a,b){return a+(b-a)*rnd()}
  function pick(a){return a[Math.floor(rnd()*a.length)]}
  function f(n){return Math.round(n*100)/100}
  function J(p,a){return[p[0]+R(-a,a),p[1]+R(-a,a)]}
  function rot(pts,ang){var cx=0,cy=0;pts.forEach(function(p){cx+=p[0];cy+=p[1]});cx/=pts.length;cy/=pts.length;
    var c=Math.cos(ang),s=Math.sin(ang);return pts.map(function(p){var x=p[0]-cx,y=p[1]-cy;return[cx+x*c-y*s,cy+x*s+y*c]})}
  function path(pts){return'M'+pts.map(function(p){return f(p[0])+' '+f(p[1])}).join('L')+'Z'}
  function piece(pts,fill,wob){
    pts=rot(pts.map(function(p){return J(p,wob==null?1.3:wob)}),R(-.07,.07));
    return'<path d="'+path(pts)+'" fill="'+fill+'" filter="url(#sh)"/>'+
      '<path d="'+path(pts)+'" fill="#fff" opacity=".0"/>';
  }
  function rect(x,y,w,h){return[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]}
  // pencil line through points, two loose passes
  function pencil(pts,w){
    if(WAX)return waxline(pts,w);
    var o='',np=rnd()<.35?3:2;
    for(var k=0;k<np;k++){
      var q=pts.map(function(p){return J(p,k?.45:.2)});
      var d='M'+f(q[0][0]+R(-.5,.5))+' '+f(q[0][1]+R(-.5,.5));
      for(var i=1;i<q.length;i++){var m=[(q[i-1][0]+q[i][0])/2+R(-.5,.5),(q[i-1][1]+q[i][1])/2+R(-.5,.5)];d+='Q'+f(m[0])+' '+f(m[1])+' '+f(q[i][0]+(i==q.length-1?R(-.6,.6):0))+' '+f(q[i][1]+(i==q.length-1?R(-.6,.6):0))}
      o+='<path d="'+d+'" fill="none" stroke="'+INK+'" stroke-width="'+f((w||.45)*R(.38,.75)*(k?.8:1))+'" stroke-linecap="round" stroke-linejoin="round" opacity="'+f(R(.4,.85)*(k?.7:1))+'"/>';
    }
    return o;
  }
  function waxline(pts,w){
    var o='',np=rnd()<.5?2:3;
    for(var k=0;k<np;k++){
      var q=pts.map(function(p){return J(p,k?.5:.25)});
      var base=(w||.45)*R(3.4,4.8)*(k?.75:1);
      // smooth curve sampled into short segments so pressure (width/opacity) changes along the stroke
      var P=[],N=Math.max(6,q.length*5);
      for(var t=0;t<=N;t++){var u=t/N*(q.length-1),i=Math.min(q.length-2,Math.floor(u)),r=u-i;
        P.push([q[i][0]+(q[i+1][0]-q[i][0])*r+R(-.12,.12),q[i][1]+(q[i+1][1]-q[i][1])*r+R(-.12,.12)])}
      var pr=R(.75,1),dpr=0;o+='<g opacity="'+f(R(.84,.95)*(k?.9:1))+'">';
      for(var t=1;t<P.length;t++){
        dpr=dpr*.6+R(-.07,.07);pr=Math.max(.6,Math.min(1.1,pr+dpr));
        var edge=Math.min(t,P.length-t)<2?.7:1;
        o+='<path d="M'+f(P[t-1][0])+' '+f(P[t-1][1])+'L'+f(P[t][0])+' '+f(P[t][1])+'" fill="none" stroke="'+WAXC+'" stroke-width="'+f(base*pr*edge)+'" stroke-linecap="round"/>';
      }
      o+='</g>';
    }
    return'<g filter="url(#wax)">'+o+'</g>';
  }
  function sq(cx,cy,r){var a=R(-.1,.1),p=[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(function(v){return[cx+(v[0]*Math.cos(a)-v[1]*Math.sin(a))*r*R(.9,1.1),cy+(v[0]*Math.sin(a)+v[1]*Math.cos(a))*r*R(.9,1.1)]});
    return pencil(p,.4)+(rnd()<.6?pencil([[cx,cy-r],[cx+R(-.4,.4),cy+r]],.3):'')}
  function dots(cx,cy,r){var o='';for(var i=0;i<3;i++)o+=pencil([[cx-r+i*r,cy+R(-1,1)],[cx-r+i*r+R(.2,.8),cy+R(.2,.8)]],.6);return o}
  function hatch(cx,cy,r){var o='',n=Math.round(R(3,5));for(var i=0;i<n;i++)o+=pencil([[cx-r+i*2*r/n,cy-r*.8],[cx-r+i*2*r/n+r*.5,cy+r*.8]],.35);return o}
  function scribble(x,y,w,h){
    var n=Math.round(R(4,8)),pts=[];
    for(var i=0;i<n;i++){pts.push([x+(i%2?w:0)+R(-.8,.8),y+h*i/(n-1)])}
    return pencil(pts,.4);
  }
  function loop(cx,cy,r){
    var pts=[];for(var i=0;i<=9;i++){var a=i*Math.PI*2/8+R(-.2,.2);pts.push([cx+Math.cos(a)*r*R(.85,1.1),cy+Math.sin(a)*r*R(.85,1.1)])}
    return pencil(pts,.4);
  }
  function cross(cx,cy,r){return pencil([[cx-r,cy+R(-.6,.6)],[cx+r,cy+R(-.6,.6)]],.4)+pencil([[cx+R(-.6,.6),cy-r],[cx+R(-.6,.6),cy+r]],.4)}
  function arch(x,y,w,h){ // door with round top, base at y+h
    var pts=[[x,y+h]],r=w/2,n=7;
    for(var i=0;i<=n;i++){var a=Math.PI+Math.PI*i/n;pts.push([x+r+Math.cos(a)*r,y+r+Math.sin(a)*r*R(.85,1.15)])}
    pts.push([x+w,y+h]);return pts;
  }
  function archLine(x,y,w,h){
    var pts=[[x,y+h]],r=w/2;
    for(var i=0;i<=6;i++){var a=Math.PI+Math.PI*i/6;pts.push([x+r+Math.cos(a)*r,y+r+Math.sin(a)*r])}
    pts.push([x+w,y+h]);return pencil(pts,.5);
  }

  function rgb(h){return[1,3,5].map(function(i){return parseInt(h.substr(i,2),16)})}
  function contrast(a,b){function L(c){var v=rgb(c).map(function(n){n/=255;return n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2]}var x=L(a),y=L(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
  function dist(a,b){var x=rgb(a),y=rgb(b);return Math.sqrt(Math.pow(x[0]-y[0],2)+Math.pow(x[1]-y[1],2)+Math.pow(x[2]-y[2],2))}
  var CLIPN=0;
  function fitMap(p,x,y,w,h){
    var xs=p.outline.map(function(q){return q[0]}),ys=p.outline.map(function(q){return q[1]});
    var mnx=Math.min.apply(null,xs),mxx=Math.max.apply(null,xs),mny=Math.min.apply(null,ys),mxy=Math.max.apply(null,ys);
    var k=Math.min(w/Math.max(1e-6,mxx-mnx),h/Math.max(1e-6,mxy-mny));
    return{k:k,ox:x+(w-(mxx-mnx)*k)/2,oy:y+(h-(mxy-mny)*k)/2,mnx:mnx,mny:mny,mxy:mxy};
  }
  function rotAround(pts,ang,cx,cy){var c=Math.cos(ang),s=Math.sin(ang);return pts.map(function(p){var x=p[0]-cx,y=p[1]-cy;return[cx+x*c-y*s,cy+x*s+y*c]})}
  function cutout(p,x,y,w,h,base){
    var fm=fitMap(p,x,y,w,h);if(base)fm.oy=y+h-(fm.mxy-fm.mny)*fm.k;
    var map=function(q){return[fm.ox+(q[0]-fm.mnx)*fm.k,fm.oy+(q[1]-fm.mny)*fm.k]};
    var ang=R(-.05,.05),cx=x+w/2,cy=y+h/2;
    var pts=rotAround(p.outline.map(map),ang,cx,cy);
    var d=path(pts),o='<path d="'+d+'" fill="'+p.color+'" filter="url(#sh)"/>';
    if(p.marks&&p.marks.length){
      var saveInk=INK,saveWax=WAX,saveWaxC=WAXC,m='';WAX=p.material==='wax';
      p.marks.forEach(function(s){INK=s.color;WAXC=s.color;var mp=rotAround(s.points.map(map),ang,cx,cy);if(mp.length===1)mp.push([mp[0][0]+.025,mp[0][1]+.025]);m+=pencil(mp,s.width*Math.min(w,h)/100*(WAX?.3:1.2))});
      INK=saveInk;WAX=saveWax;WAXC=saveWaxC;
      var cid='cp'+(++CLIPN);
      o+='<clipPath id="'+cid+'"><path d="'+d+'"/></clipPath><g clip-path="url(#'+cid+')">'+m+'</g>';
    }
    return{svg:o,pts:pts};
  }
  function inPoly(x,y,pts){var c=false;for(var i=0,j=pts.length-1;i<pts.length;j=i++){var xi=pts[i][0],yi=pts[i][1],xj=pts[j][0],yj=pts[j][1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c}return c}
  function safeRect(pts){
    var xs=pts.map(function(q){return q[0]}),ys=pts.map(function(q){return q[1]});
    var mnx=Math.min.apply(null,xs),mxx=Math.max.apply(null,xs),mny=Math.min.apply(null,ys),mxy=Math.max.apply(null,ys);
    var cx=(mnx+mxx)/2,cy=(mny+mxy)/2,lo=.05,hi=1,best=.05;
    for(var t=0;t<22;t++){var mid=(lo+hi)/2,ok=[[mnx,mny],[mxx,mny],[mxx,mxy],[mnx,mxy]].every(function(c){return inPoly(cx+(c[0]-cx)*mid,cy+(c[1]-cy)*mid,pts)});
      if(ok){best=mid;lo=mid}else hi=mid}
    return{x:cx+(mnx-cx)*best,y:cy+(mny-cy)*best,w:(mxx-mnx)*best,h:(mxy-mny)*best};
  }
  function pieceSet(active){
    var s={wall:null,door:null,roof:null,windows:[]};
    if(!active)return s;
    var list=[];
    if(active.outline)list=[active];
    else if(Array.isArray(active))list=active;
    else{if(active.wall)list.push(active.wall);if(active.door)list.push(active.door);if(active.roof)list.push(active.roof);if(Array.isArray(active.windows))list=list.concat(active.windows)}
    list.forEach(function(p){if(!p||!p.outline||p.outline.length<3)return;if(p.kind==='window')s.windows.push(p);else if((p.kind==='wall'||p.kind==='door'||p.kind==='roof')&&!s[p.kind])s[p.kind]=p});
    return s}
  function house(){
    USED=false;LAST_SHARED=false;
    var bg=makeBG(),others=makePool(bg),used=[];var t0=0;do{PAGE=hsl(R(0,360),R(25,65),rnd()<.25?R(24,40):R(62,86));t0++}while(dist(PAGE,bg)<100&&t0<40);INK=pick(INKS);WAX=rnd()<.3;WAXC=pick([INK,INK,hsl(R(0,360),R(60,90),R(22,40)),hsl(R(0,360),R(55,80),R(36,50))]);
    function col(){var c,t=0;do{c=pick(others);t++}while(used.indexOf(c)>-1&&t<20);used.push(c);return c}
    function colFar(far){var c,t=0;do{c=col();t++}while(dist(c,far)<55&&t<25);return c}
    // the pieces for this house: the visitor's own design or draft, else a community cutout
    var set=pieceSet(ACTIVE),own=!!(set.wall||set.door||set.roof||set.windows.length);
    var shared=null;
    if(!own&&COMMUNITY.length&&rnd()<.42){var pool=COMMUNITY.filter(function(p){return p&&p.outline&&p.outline.length>=3});if(pool.length)shared=pick(pool)}
    LAST_SHARED=!!shared;
    var commUsed=false;
    function comm(k){return shared&&shared.kind===k&&!commUsed?shared:null}
    var wallP=set.wall||comm('wall'),roofP=set.roof||comm('roof'),doorP=set.door||comm('door');
    var winI=0;
    function takeWindow(){if(set.windows.length)return set.windows[(winI++)%set.windows.length];var w=comm('window');if(w)commUsed=true;return w}
    var wallCut=!!wallP,roofCut=!!roofP;
    if(wallP||roofP){var ap=wallP||roofP,tb=0;while(dist(ap.color,bg)<55&&tb++<40)bg=makeBG();others=makePool(bg)}
    var out='',pen='';
    var kind=Math.floor(R(0,4));
    var bx=R(24,36),by=R(46,54),bw=R(30,44),bh=R(26,36);
    if(wallCut){ // the wall piece's own proportions define the body
      var oxs=wallP.outline.map(function(q){return q[0]}),oys=wallP.outline.map(function(q){return q[1]});
      var aspect=(Math.max.apply(null,oxs)-Math.min.apply(null,oxs))/Math.max(1e-6,Math.max.apply(null,oys)-Math.min.apply(null,oys));
      bh=R(26,36);bw=Math.max(16,Math.min(50,bh*Math.max(.4,Math.min(2.4,aspect))));
    }
    if(by+bh>86)bh=86-by;
    var roofCol=rnd()<.3?'#f6f3ee':col();
    var accentP=wallCut?null:(doorP||set.windows[0]||roofP);
    var bodyCol=accentP?colFar(accentP.color):col();
    var bodies=[];
    var mainBody={x:bx,y:by,w:bw,h:bh,c:bodyCol};
    bodies.push(mainBody);
    if(kind>=1){ // second block overlapping, taller or offset
      var w2=R(18,30),h2=R(bh*.8,bh*1.5),x2=bx+bw*R(.45,.75),y2=by+bh-h2+R(-3,8);
      if(y2<26)y2=26; if(x2+w2>86)x2=86-w2; if(y2+h2>88)h2=88-y2;
      bodies.push({x:x2,y:y2,w:w2,h:h2,c:col(),back:rnd()<.3});
    }
    if(kind===3){
      var w3=R(14,22),h3=R(14,24);
      bodies.push({x:bx-w3*R(.2,.6),y:by+bh-h3,w:w3,h:h3,c:col(),back:true});
    }
    // draw order: back pieces first
    bodies.sort(function(a,b){return (b.back?1:0)-(a.back?1:0)});
    // wall piece: its silhouette sets the real composition anchors
    var wallSvg='',effX=bx,effY=by,effW=bw,effH=bh,main=mainBody,sil=null;
    if(wallCut){
      var c=cutout(wallP,bx,by,bw,bh);wallSvg=c.svg;sil=c.pts;if(wallP===shared)commUsed=true;
      var sxs=sil.map(function(q){return q[0]}),sys=sil.map(function(q){return q[1]});
      effX=Math.min.apply(null,sxs);effY=Math.min.apply(null,sys);
      effW=Math.max.apply(null,sxs)-effX;effH=Math.max.apply(null,sys)-effY;
      main=safeRect(sil);
    }
    // roof for main body, resting on the real top profile with a slight overlap
    var roofs='';
    var rx=effX-R(0,5),rw=effW+R(0,8),ry=effY+1.5,rh;
    if(roofCut){
      var roxs=roofP.outline.map(function(q){return q[0]}),roys=roofP.outline.map(function(q){return q[1]});
      var roa=(Math.max.apply(null,roxs)-Math.min.apply(null,roxs))/Math.max(1e-6,Math.max.apply(null,roys)-Math.min.apply(null,roys));
      rw=effW+R(0,8);rx=effX-(rw-effW)/2;rh=Math.max(10,Math.min(30,rw/Math.max(.6,Math.min(4,roa))));
      roofs=cutout(roofP,rx,ry-rh,rw,rh,true).svg;if(roofP===shared)commUsed=true;
    }else{rh=R(16,26);
    var rk=Math.floor(R(0,4));
    if(rk===0){roofs=piece([[rx-R(0,3),ry],[rx+rw*R(.3,.7),effY-rh],[rx+rw,ry]],roofCol)}
    else if(rk===1){var m=rx+rw*R(.4,.6);roofs=piece([[rx,ry],[rx+rw*.28,effY-rh],[m,effY-rh*R(.15,.4)],[rx+rw*.8,effY-rh*R(.8,1.05)],[rx+rw,ry]],roofCol)}
    else if(rk===2){roofs=piece([[rx,ry],[rx+R(0,5),effY-rh*.55],[rx+rw-R(0,5),effY-rh*R(.4,.7)],[rx+rw,ry]],roofCol)}
    else{roofs=piece([[rx-3,ry],[rx+rw*R(.15,.35),effY-rh*1.1],[rx+rw*R(.4,.6),ry]],roofCol)+
         piece([[rx+rw*.45,ry],[rx+rw*R(.65,.85),effY-rh*R(.6,.9)],[rx+rw+3,ry]],pick(others.filter(function(c){return c!==roofCol})))}}
    // chimney
    var chim='';
    if(rnd()<.35)chim=piece(rect(effX+effW*R(.55,.8),effY-rh*R(.7,1),R(4,7),R(8,13)),col());
    // draw
    out+=chim;
    bodies.forEach(function(b){
      if(b===mainBody&&wallCut)out+=wallSvg;else out+=piece(rect(b.x,b.y,b.w,b.h),b.c);
    });
    out+=roofs;
    // door, pivoting on the base of the silhouette's contained area
    var dw=Math.min(R(10,16),main.w*.8),dh=Math.min(R(15,22),main.h*.85);
    var dx=main.x+R(main.w*.15,Math.max(main.w*.15+1,main.w-dw-main.w*.15)),dy=main.y+main.h-dh;
    var dk=rnd(),customDoor=null;
    if(doorP){customDoor=cutout(doorP,dx,dy,dw,dh);if(doorP===shared)commUsed=true}
    if(customDoor){out+=customDoor.svg}else if(dk<.5){
      out+=piece(arch(dx,dy,dw,dh),bg,.5);
    }else if(dk<.8){
      pen+=archLine(dx,dy,dw,dh);
      var hx=dx+dw*.2,hw=dw*.35,i;
      for(i=0;i<5;i++)pen+=pencil([[hx+hw*i/4,dy+dh*.35+R(-1,1)],[hx+hw*i/4+R(-.5,.5),dy+dh]],.5);
    }else{
      pen+=archLine(dx,dy,dw,dh)+scribble(dx+dw*.3,dy+dh*.4,dw*.35,dh*.55);
    }
    // windows (pencil)
    var wk=Math.floor(R(0,7));
    var tops=[main].concat(bodies.filter(function(b){return b!==mainBody}));
    var targets=set.windows.length?[main]:tops.slice(0,rnd()<.5?2:1);
    targets.forEach(function(b,ti){
      var n=set.windows.length?set.windows.length:(ti===0?(rnd()<.6?2:1):1),ww=b.w/(n+1);
      for(var i=0;i<n;i++){
        var cx=b.x+ww*(i+1)+R(-1,1),cy=b.y+b.h*R(.2,.38),r=R(2.6,4.2);
        if(set.windows.length){var cols=Math.min(2,n),rows=Math.ceil(n/cols);cx=b.x+b.w*((i%cols)+1)/(cols+1);cy=b.y+b.h*(.2+.2*Math.floor(i/cols));r=Math.max(.2,Math.min(4.2,b.w/(cols*5),b.h/(rows*7)))}
        if(!set.windows.length&&ti===0&&cx>dx-r&&cx<dx+dw+r&&cy>dy-r)cy=dy-r-2;
        if(!set.windows.length&&b===main&&sil&&!inPoly(cx,cy,sil))continue;
        var customWindow=null;
        var winP=takeWindow();
        if(winP)customWindow=cutout(winP,cx-r,cy-r,2*r,2*r);
        if(customWindow)pen+='<g data-own-window="'+(winI-1)+'">'+customWindow.svg+'</g>';
        else if(wk===0)pen+=(i%2?dots(cx,cy,r):cross(cx,cy,r*.8));
        else if(wk===1)pen+=loop(cx,cy,r*.8);
        else if(wk===2)pen+=cross(cx,cy,r*.8);
        else if(wk===3)pen+=(i%2?cross(cx,cy,r*.8):loop(cx,cy,r*.8));
        else if(wk===4)pen+=sq(cx,cy,r*.85);
        else if(wk===5)pen+=(rnd()<.5?dots(cx,cy,r):hatch(cx,cy,r));
        else pen+=pick([loop,cross,sq])(cx,cy,r*.85);
      }
    });
    if(rnd()<.35){var sb=wallCut?main:pick(bodies);pen+=scribble(sb.x+sb.w*R(.1,.7),sb.y+sb.h*R(.5,.7),R(3,6),R(5,9))}
    if(rnd()<.3)pen+=pencil([[effX-4,effY+effH+R(-.5,.5)],[effX+effW*.5,effY+effH+R(-1,1)],[effX+effW+8,effY+effH+R(-.5,.5)]],.4);
    // background square, slightly rotated, on white paper
    var rotp=R(-1.4,1.4),rotb=R(-1.8,1.8),grainSeed=Math.floor(R(1,99));
    var svg='<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'+
     '<defs><filter id="sh" x="-10%" y="-10%" width="125%" height="125%"><feDropShadow dx=".06" dy=".1" stdDeviation=".1" flood-color="#241a30" flood-opacity=".11"/></filter>'+
     '<filter id="wax" filterUnits="userSpaceOnUse" x="-60" y="-60" width="220" height="220"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="3" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -10 7.6" result="m"/><feGaussianBlur in="SourceGraphic" stdDeviation=".06" result="b"/><feComposite in="b" in2="m" operator="in"/></filter></defs>'+
     '<g transform="rotate('+f(rotp)+' 50 50)"><rect x="3" y="3" width="94" height="94" fill="#f7f5f0"/>'+
     '<rect x="3" y="3" width="94" height="94" fill="#fff" opacity=".0"/>'+
     '<g transform="rotate('+f(rotb)+' 50 50)"><path d="'+path([J([10,9],.8),J([91,8],.8),J([90.5,89],.8),J([9.5,90],.8)])+'" fill="'+bg+'"/>'+
     '<g id="hs">'+out+pen+'</g>'+'</g>'+
     '<image x="3" y="3" width="94" height="94" href="paper.png" preserveAspectRatio="none"/></g></svg>';
    return svg;
  }

  var renderCount=0;
  function render(target,piece,fixedSeed){ACTIVE=piece||null;seed=fixedSeed==null?(Math.random()*4294967296)>>>0:fixedSeed;var markup=house(),uid='-v2-r'+(++renderCount);['sh','wax'].forEach(function(id){markup=markup.split('id="'+id+'"').join('id="'+id+uid+'"').split('url(#'+id+')').join('url(#'+id+uid+')')});target.innerHTML=markup;
    var g=target.querySelector('#hs'),b=g.getBBox(),k=Math.min(74/b.width,74/b.height)*R(.88,1);
    var cx=b.x+b.width/2,cy=b.y+b.height/2,tx=50+R(-3,3),ty=50+R(-2,4);
    g.setAttribute('transform','translate('+f(tx)+' '+f(ty)+') rotate('+f(R(-2,2))+') scale('+f(k)+') translate('+f(-cx)+' '+f(-cy)+')');g.setAttribute('stroke-width','1');
    ACTIVE=null;return {background:PAGE,shared:LAST_SHARED};
  }
  window.CasasV2={render:render,setCommunity:function(p){COMMUNITY=p},pieceSVG:function(p){seed=1049771;USED=false;var o=cutout(p,6,6,88,88).svg;return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'+
   '<defs><filter id="sh" x="-10%" y="-10%" width="125%" height="125%"><feDropShadow dx=".06" dy=".1" stdDeviation=".1" flood-color="#241a30" flood-opacity=".11"/></filter>'+
   '<filter id="wax" filterUnits="userSpaceOnUse" x="-60" y="-60" width="220" height="220"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="3" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -10 7.6" result="m"/><feGaussianBlur in="SourceGraphic" stdDeviation=".06" result="b"/><feComposite in="b" in2="m" operator="in"/></filter></defs>'+
   '<rect width="100" height="100" fill="#f7f5f0"/>'+o+'</svg>'}};
})();
