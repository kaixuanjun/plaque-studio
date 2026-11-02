/* localart.js — 本地算法插画引擎
   每个插画都是一段「可执行的 Canvas 程序」，与 AI 生成物使用同一契约：
   window.ART = {width,height,duration,fps} / window.renderFrame(t)
*/
(function () {
  'use strict';

  const LA = {};

  function wrap(o, code) {
    return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<style>html,body{margin:0;height:100%;background:transparent;overflow:hidden}canvas{display:block;width:100%;height:100%}</style>' +
      '</head><body><canvas id="art" width="' + o.w + '" height="' + o.h + '"></canvas><script>\n' +
      'var W=' + o.w + ',H=' + o.h + ';\n' +
      'var C={bg:"' + o.p.bg + '",fg:"' + o.p.fg + '",accent:"' + o.p.accent + '",muted:"' + o.p.muted + '",extra:"' + o.p.extra + '"};\n' +
      'var D=' + o.dur + ',FPS=' + o.fps + ',SEED=' + o.seed + ';\n' +
      'function prng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}\n' +
      'function hexA(h,a){h=String(h).replace("#","");var n=parseInt(h.length===3?h.split("").map(function(c){return c+c}).join(""):h,16);return "rgba("+((n>>16)&255)+","+((n>>8)&255)+","+(n&255)+","+a+")"}\n' +
      'var c=document.getElementById("art"),x=c.getContext("2d");\n' +
      'window.ART={width:W,height:H,duration:D,fps:FPS};\n' +
      code + '\nwindow.renderFrame=renderFrame;\n' +
      '<\/script></body></html>';
  }

  function hexA(hex, a) {
    const h = String(hex).replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* 1. 流形渐变 */
  function mesh(o) {
    return wrap(o, `
var rnd=prng(SEED);
var blobs=[];
for(var i=0;i<7;i++){blobs.push({x:rnd(),y:rnd(),r:.24+rnd()*.3,s:.12+rnd()*.3,p:rnd()*6.28,
  c:[C.accent,C.extra,C.fg,C.muted,C.accent][i%5],a:.34+rnd()*.3});}
var grain=(function(){var g=document.createElement("canvas");g.width=g.height=120;var gg=g.getContext("2d");
  var im=gg.createImageData(120,120);var r=prng(7);for(var i=0;i<im.data.length;i+=4){var v=90+r()*120;
  im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=18;}gg.putImageData(im,0,0);return g;})();
var pat=x.createPattern(grain,"repeat");
function renderFrame(t){
  x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.globalCompositeOperation="source-over";
  x.fillStyle=C.bg;x.fillRect(0,0,W,H);
  x.globalCompositeOperation="lighter";
  for(var i=0;i<blobs.length;i++){
    var b=blobs[i],tt=t*0.4+b.p;
    var px=(b.x+Math.sin(tt*0.9)*b.s*0.5)*W, py=(b.y+Math.cos(tt*0.7)*b.s*0.5)*H;
    var rad=b.r*Math.max(W,H)*(1+Math.sin(tt*0.6)*0.09);
    var g=x.createRadialGradient(px,py,0,px,py,rad);
    g.addColorStop(0,hexA(b.c,b.a));g.addColorStop(.45,hexA(b.c,b.a*.45));g.addColorStop(1,hexA(b.c,0));
    x.fillStyle=g;x.beginPath();x.arc(px,py,rad,0,6.2832);x.fill();
  }
  x.globalCompositeOperation="source-over";
  x.globalAlpha=.5;x.fillStyle=pat;x.fillRect(0,0,W,H);x.globalAlpha=1;
  var vg=x.createRadialGradient(W*.5,H*.5,Math.min(W,H)*.2,W*.5,H*.5,Math.max(W,H)*.78);
  vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,"rgba(0,0,0,.35)");
  x.fillStyle=vg;x.fillRect(0,0,W,H);
}
window.hexA=hexA;`);
  }

  /* 2. 山脊日落 */
  function ridge(o) {
    return wrap(o, `
var rnd=prng(SEED);
var birds=[];for(var i=0;i<5;i++){birds.push({x:rnd(),y:.12+rnd()*.22,s:.6+rnd()*.7,p:rnd()*6.28});}
function ridgePath(base,amp,freq,phase,off){
  x.beginPath();x.moveTo(-10,H);
  for(var px=-10;px<=W+10;px+=6){
    var u=px/W;
    var y=H*base - Math.sin(u*freq+phase)*H*amp - Math.sin(u*freq*2.7+phase*1.7)*H*amp*.35 + off;
    x.lineTo(px,y);
  }
  x.lineTo(W+10,H);x.closePath();
}
function renderFrame(t){
  x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.globalCompositeOperation="source-over";
  var sky=x.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,C.bg);sky.addColorStop(.62,hexA(C.accent,.22));sky.addColorStop(1,hexA(C.accent,.06));
  x.fillStyle=sky;x.fillRect(0,0,W,H);
  var cx=W*.5, cy=H*.46, r=Math.min(W,H)*.19;
  var glow=x.createRadialGradient(cx,cy,r*.2,cx,cy,r*3.4);
  glow.addColorStop(0,hexA(C.accent,.55));glow.addColorStop(.4,hexA(C.accent,.16));glow.addColorStop(1,hexA(C.accent,0));
  x.fillStyle=glow;x.fillRect(0,0,W,H);
  x.fillStyle=C.accent;x.beginPath();x.arc(cx,cy,r,0,6.2832);x.fill();
  x.fillStyle=hexA(C.bg,.92);x.beginPath();x.arc(cx-r*.16,cy-r*.1,r*.86,0,6.2832);x.fill();
  var modes=[[.60,.10,.011,0],[.68,.085,.017,1.2],[.76,.06,.026,2.4],[.86,.045,.04,3.6]];
  for(var i=0;i<modes.length;i++){
    var m=modes[i];
    ridgePath(m[0],m[1],m[2],m[3]+t*0.05,i*H*.012);
    x.fillStyle=hexA(i%2?C.bg:C.extra, i===3?1:.86-i*.12);
    x.fill();
    x.strokeStyle=hexA(C.fg,.14);x.lineWidth=1;x.stroke();
  }
  x.strokeStyle=hexA(C.fg,.7);x.lineWidth=Math.max(1.4,W*.0016);
  for(var b=0;b<birds.length;b++){
    var bd=birds[b], bx=((bd.x+t*0.012)%1.15-.05)*W, by=bd.y*H + Math.sin(t*.5+bd.p)*H*.01;
    var s=Math.min(W,H)*.018*bd.s, f=Math.sin(t*3+bd.p)*.5+.5;
    x.beginPath();x.moveTo(bx-s,by);x.quadraticCurveTo(bx-s*.4,by-s*(.5+f*.5),bx,by);
    x.quadraticCurveTo(bx+s*.4,by-s*(.5+f*.5),bx+s,by);x.stroke();
  }
}`);
  }

  /* 3. 拓扑等高线 */
  function topo(o) {
    return wrap(o, `
var rnd=prng(SEED);
var seeds=[];for(var i=0;i<3;i++){seeds.push({x:.3+rnd()*.4,y:.3+rnd()*.4,r:.12+rnd()*.2});}
function ring(cx,cy,base,amp,k,phase,rot){
  x.beginPath();
  for(var a=0;a<=6.2832;a+=0.02){
    var r=base+Math.sin(a*k+phase)*amp+Math.sin(a*(k*2.3)+phase*1.7)*amp*.4;
    var px=cx+Math.cos(a+rot)*r, py=cy+Math.sin(a+rot)*r*.86;
    if(a===0)x.moveTo(px,py);else x.lineTo(px,py);
  }
  x.closePath();
}
function renderFrame(t){
  x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.globalCompositeOperation="source-over";
  x.fillStyle=C.bg;x.fillRect(0,0,W,H);
  var m=Math.min(W,H);
  for(var s=0;s<seeds.length;s++){
    var sd=seeds[s];
    for(var i=1;i<=15;i++){
      var base=(i/15)*m*.62+Math.sin(t*.4+s)*m*.01;
      ring(sd.x*W,sd.y*H,base,m*.045,3+s, t*.35+s*1.7+i*.22, t*.03);
      x.strokeStyle=hexA(i%4===0?C.accent:C.fg, i%4===0?.62:.22);
      x.lineWidth=i%4===0?Math.max(1.2,m*.0022):Math.max(.8,m*.0011);
      x.stroke();
    }
  }
  x.fillStyle=hexA(C.accent,.9);
  for(var p=0;p<34;p++){
    var px=((p*0.137+t*0.006)%1)*W, py=((p*0.271)%1)*H;
    x.beginPath();x.arc(px,py,Math.max(1,m*.0026),0,6.2832);x.fill();
  }
  var vg=x.createRadialGradient(W*.5,H*.5,m*.25,W*.5,H*.5,m*.8);
  vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,"rgba(0,0,0,.32)");
  x.fillStyle=vg;x.fillRect(0,0,W,H);
}`);
  }

  /* 4. 粒子星环 */
  function orbit(o) {
    return wrap(o, `
var rnd=prng(SEED);
var ps=[];for(var i=0;i<260;i++){
  ps.push({a:rnd()*6.2832,r:.32+rnd()*.34,sp:.06+rnd()*.16,sz:.6+rnd()*2.4,
    tilt:rnd()*6.2832,z:rnd(),c:rnd()>.72?C.accent:(rnd()>.5?C.fg:C.muted)});
}
function renderFrame(t){
  x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.globalCompositeOperation="source-over";
  x.fillStyle=C.bg;x.fillRect(0,0,W,H);
  var cx=W*.5,cy=H*.5,m=Math.min(W,H);
  var g=x.createRadialGradient(cx,cy,0,cx,cy,m*.5);
  g.addColorStop(0,hexA(C.accent,.22));g.addColorStop(1,hexA(C.accent,0));
  x.fillStyle=g;x.fillRect(0,0,W,H);
  x.save();x.translate(cx,cy);x.rotate(-0.32);
  for(var k=0;k<3;k++){
    x.beginPath();x.ellipse(0,0,m*(.34+k*.01),m*(.11+k*.004),0,0,6.2832);
    x.strokeStyle=hexA(C.fg,.16);x.lineWidth=1;x.stroke();
  }
  for(var i=0;i<ps.length;i++){
    var p=ps[i],a=p.a+t*p.sp;
    var rr=m*p.r, ex=Math.cos(a)*rr, ey=Math.sin(a)*rr*.34;
    var dep=(Math.sin(a)+1)/2;
    x.globalAlpha=.25+dep*.75;
    x.fillStyle=p.c;
    x.beginPath();x.arc(ex,ey,p.sz*(0.7+dep*1.5),0,6.2832);x.fill();
  }
  x.globalAlpha=1;x.restore();
  x.fillStyle=C.accent;x.beginPath();x.arc(cx,cy,m*.035*(1+Math.sin(t*.8)*.04),0,6.2832);x.fill();
  x.strokeStyle=hexA(C.fg,.5);x.lineWidth=Math.max(1,m*.0016);
  x.beginPath();x.arc(cx,cy,m*.075,0,6.2832);x.stroke();
}`);
  }

  /* 5. 包豪斯拱门 */
  function arch(o) {
    return wrap(o, `
var rnd=prng(SEED);
function archPath(cx,base,w,h){
  var r=w/2;
  x.beginPath();x.moveTo(cx-r,base);x.lineTo(cx-r,base-h+r);
  x.arc(cx,base-h+r,r,Math.PI,0);x.lineTo(cx+r,base);x.closePath();
}
function renderFrame(t){
  x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.globalCompositeOperation="source-over";
  x.fillStyle=C.bg;x.fillRect(0,0,W,H);
  var m=Math.min(W,H), base=H*.82, cx=W*.5;
  var cols=[C.extra,C.accent,C.fg,C.muted];
  var n=4;
  for(var i=0;i<n;i++){
    var f=i/(n-1);
    var w=m*(.72-f*.16), h=m*(.62-f*.11);
    var yy=base+Math.sin(t*.5+i)*m*.012 - i*m*.02;
    archPath(cx,yy,w,h);
    x.globalAlpha=i===n-1?1:.92;
    x.fillStyle=cols[i%cols.length];
    x.fill();
  }
  x.globalAlpha=1;
  x.fillStyle=C.bg;
  x.beginPath();x.arc(cx,base-m*.3,m*.09*(1+Math.sin(t*.7)*.06),0,6.2832);x.fill();
  x.strokeStyle=hexA(C.fg,.25);x.lineWidth=1;
  for(var l=0;l<9;l++){
    var ly=H*.12+l*H*.028;
    x.beginPath();x.moveTo(W*.06,ly);x.lineTo(W*.06+W*.16,ly);x.stroke();
  }
  x.fillStyle=hexA(C.accent,.85);x.fillRect(W*.06,H*.06,W*.028,W*.028);
  x.fillStyle=hexA(C.fg,.55);x.fillRect(W*.79,H*.86,W*.14,Math.max(2,m*.006));
}`);
  }

  /* 6. 等距网格城 */
  function city(o) {
    return wrap(o, `
var rnd=prng(SEED);
var cells=[];var N=7;
for(var r=0;r<N;r++)for(var q=0;q<N;q++){cells.push({r:r,q:q,h:.15+rnd()*.85,ph:rnd()*6.28,c:rnd()});}
function pt(px,py,s){var ox=W*.5, oy=H*.56; return [ox+(px-py)*s*0.86, oy+(px+py)*s*0.43];}
function renderFrame(t){
  x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.globalCompositeOperation="source-over";
  x.fillStyle=C.bg;x.fillRect(0,0,W,H);
  var s=Math.min(W,H)/9.4, sz=s*.82;
  var order=cells.slice().sort(function(a,b){return (a.r+a.q)-(b.r+b.q);});
  for(var i=0;i<order.length;i++){
    var c0=order[i];
    var bx=(c0.r-N/2)*sz, bz=(c0.q-N/2)*sz;
    var hh=(c0.h*(0.6+Math.sin(t*.7+c0.ph)*.18+0.35))*s*.85;
    var A=pt(bx,bz,s),B=pt(bx+sz,bz,s),Cc=pt(bx+sz,bz+sz,s),D=pt(bx,bz+sz,s);
    x.beginPath();x.moveTo(D[0],D[1]);x.lineTo(Cc[0],Cc[1]);x.lineTo(Cc[0],Cc[1]-hh);x.lineTo(D[0],D[1]-hh);x.closePath();
    x.fillStyle=hexA(C.extra,.95);x.fill();
    x.beginPath();x.moveTo(B[0],B[1]);x.lineTo(Cc[0],Cc[1]);x.lineTo(Cc[0],Cc[1]-hh);x.lineTo(B[0],B[1]-hh);x.closePath();
    x.fillStyle=hexA(C.muted,.55);x.fill();
    x.beginPath();x.moveTo(A[0],A[1]-hh);x.lineTo(B[0],B[1]-hh);x.lineTo(Cc[0],Cc[1]-hh);x.lineTo(D[0],D[1]-hh);x.closePath();
    x.fillStyle=c0.c>.82?C.accent:hexA(C.fg,.9);x.fill();
    if(c0.c>.9){x.fillStyle=hexA(C.accent,.35);x.fillRect(A[0],A[1]-hh-sz*.5,2,2);}
  }
  x.strokeStyle=hexA(C.accent,.35);x.lineWidth=1;
  x.beginPath();x.moveTo(W*.08,H*.9);x.lineTo(W*.92,H*.9);x.stroke();
  var vg=x.createLinearGradient(0,H*.45,0,H);
  vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,"rgba(0,0,0,.45)");
  x.fillStyle=vg;x.fillRect(0,0,W,H);
}`);
  }

  const BUILDERS = { mesh: mesh, ridge: ridge, topo: topo, orbit: orbit, arch: arch, city: city };

  LA.list = [
    { id: 'mesh', name: '流形渐变', note: '氛围底图' },
    { id: 'ridge', name: '山脊日落', note: '风景' },
    { id: 'topo', name: '拓扑等高线', note: '抽象纹理' },
    { id: 'orbit', name: '粒子星环', note: '科技' },
    { id: 'arch', name: '包豪斯拱门', note: '几何' },
    { id: 'city', name: '等距网格城', note: '建筑' }
  ];

  LA.make = function (id, opts) {
    opts = opts || {};
    const p = opts.palette || DATA.palById('midnight');
    const o = {
      w: opts.w || 1024,
      h: opts.h || 1024,
      dur: opts.duration || 6,
      fps: opts.fps || 30,
      seed: opts.seed || Math.floor(Math.random() * 1e6),
      p
    };
    const fn = BUILDERS[id] || BUILDERS.mesh;
    return fn(o);
  };

  window.LocalArt = LA;
})();
