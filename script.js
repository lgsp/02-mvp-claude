/* ================================================================
   KaTeX
================================================================ */
document.addEventListener("DOMContentLoaded",()=>{
  rk(document.body);
  initAll();
  generateQCM();
});
function rk(el){
  renderMathInElement(el,{
    delimiters:[{left:"\\[",right:"\\]",display:true},{left:"\\(",right:"\\)",display:false}],
    throwOnError:false
  });
}

/* ================================================================
   CANVAS UTILITIES
================================================================ */
const DPR=window.devicePixelRatio||1;

function setupCanvas(id,h){
  const c=document.getElementById(id); if(!c)return null;
  const W=c.parentElement.clientWidth||500;
  c.width=W*DPR; c.height=h*DPR; c.style.height=h+'px';
  const ctx=c.getContext('2d'); ctx.scale(DPR,DPR);
  c._W=W; c._H=h; return ctx;
}

function tc(mx,my,ox,oy,st){return[ox+mx*st,oy-my*st];}
function tm(cx,cy,ox,oy,st){return[(cx-ox)/st,(oy-cy)/st];}

function drawBg(ctx,W,H,ox,oy,st){
  ctx.clearRect(0,0,W,H);
  // sub-grid
  ctx.strokeStyle='rgba(201,95,42,0.07)'; ctx.lineWidth=.5;
  for(let x=ox%st;x<W;x+=st){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=oy%st;y<H;y+=st){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  // axes
  ctx.strokeStyle='rgba(30,21,9,0.2)'; ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(0,oy);ctx.lineTo(W,oy);ctx.stroke();
  ctx.beginPath();ctx.moveTo(ox,0);ctx.lineTo(ox,H);ctx.stroke();
  // tick labels
  ctx.fillStyle='rgba(30,21,9,0.3)';
  ctx.font='10px Roboto Mono,monospace'; ctx.textAlign='center';
  for(let i=Math.ceil(-ox/st);i<=Math.floor((W-ox)/st);i++){
    if(i===0)continue;
    const x=ox+i*st;
    ctx.beginPath();ctx.moveTo(x,oy-3);ctx.lineTo(x,oy+3);ctx.stroke();
    ctx.fillText(i,x,oy+13);
  }
  ctx.textAlign='right';
  for(let j=Math.ceil(-(H-oy)/st);j<=Math.floor(oy/st);j++){
    if(j===0)continue;
    const y=oy-j*st;
    ctx.beginPath();ctx.moveTo(ox-3,y);ctx.lineTo(ox+3,y);ctx.stroke();
    ctx.fillText(j,ox-6,y+3);
  }
  // O label
  ctx.fillStyle='rgba(30,21,9,0.3)'; ctx.textAlign='right';
  ctx.fillText('O',ox-5,oy+13);
}

function arrow(ctx,x1,y1,x2,y2,col,label,dashed){
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);
  if(len<2)return;
  ctx.save();
  ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineWidth=2.5;
  if(dashed)ctx.setLineDash([6,4]);
  const asz=14,wing=0.40,a=Math.atan2(dy,dx);
  const bx2=x2-asz*Math.cos(a),by2=y2-asz*Math.sin(a);
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(bx2,by2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2,y2);
  ctx.lineTo(x2-asz*Math.cos(a-wing),y2-asz*Math.sin(a-wing));
  ctx.lineTo(x2-asz*Math.cos(a+wing),y2-asz*Math.sin(a+wing));
  ctx.closePath(); ctx.fill();
  if(label){
    const lx=x1+(x2-x1)*.52+(dy/len)*15;
    const ly=y1+(y2-y1)*.52-(dx/len)*15;
    ctx.font='600 9px Roboto Mono,monospace'; ctx.textAlign='center';
    ctx.fillText('→',lx,ly-11);
    ctx.font='bold 13px Spectral,serif'; ctx.textAlign='center';
    ctx.fillText(label,lx,ly);
  }
  ctx.restore();
}

function dot(ctx,x,y,col,label,r=5){
  ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);
  ctx.fillStyle=col;ctx.fill();
  if(label){
    ctx.font='bold 13px Spectral,serif';
    ctx.fillStyle='#1e1509'; ctx.textAlign='center';
    ctx.fillText(label,x,y-r-5);
  }
}

/* ================================================================
   DRAGGABLE POINT HELPER
================================================================ */
function makeDraggable(canvasId,points,onDrag){
  const c=document.getElementById(canvasId); if(!c)return;
  let drag=null;
  function pos(e){
    const r=c.getBoundingClientRect();
    return[(e.touches?e.touches[0].clientX:e.clientX)-r.left,
           (e.touches?e.touches[0].clientY:e.clientY)-r.top];
  }
  function snap(v){return Math.round(v);}
  c.addEventListener('mousedown',e=>{
    const [cx,cy]=pos(e);
    let best=Infinity,bi=-1;
    points.forEach((p,i)=>{
      const[px,py]=tc(p.x,p.y,p.ox,p.oy,p.st);
      const d=Math.hypot(cx-px,cy-py);
      if(d<20&&d<best){best=d;bi=i;}
    });
    drag=bi>=0?bi:null; e.preventDefault();
  });
  c.addEventListener('mousemove',e=>{
    if(drag===null)return;
    const [cx,cy]=pos(e);
    const p=points[drag];
    const[mx,my]=tm(cx,cy,p.ox,p.oy,p.st);
    points[drag].x=snap(mx); points[drag].y=snap(my);
    onDrag(); e.preventDefault();
  });
  c.addEventListener('mouseup',()=>{drag=null;});
  c.addEventListener('touchstart',e=>{
    const [cx,cy]=pos(e);
    let best=Infinity,bi=-1;
    points.forEach((p,i)=>{
      const[px,py]=tc(p.x,p.y,p.ox,p.oy,p.st);
      const d=Math.hypot(cx-px,cy-py);
      if(d<25&&d<best){best=d;bi=i;}
    });
    drag=bi>=0?bi:null; e.preventDefault();
  },{passive:false});
  c.addEventListener('touchmove',e=>{
    if(drag===null)return;
    const [cx,cy]=pos(e);
    const p=points[drag];
    const[mx,my]=tm(cx,cy,p.ox,p.oy,p.st);
    points[drag].x=snap(mx); points[drag].y=snap(my);
    onDrag(); e.preventDefault();
  },{passive:false});
  c.addEventListener('touchend',()=>{drag=null;});
}

/* ================================================================
   TAB SWITCHERS
================================================================ */
const TAB_GROUPS={};
function switchTab(name,btn){
  const panels=['repr','somme','chasles'];
  panels.forEach(p=>document.getElementById('tab-'+p).classList.toggle('active',p===name));
  btn.closest('.tabs').querySelectorAll('.tab-btn').forEach((b,i)=>b.classList.toggle('active',panels[i]===name));
  if(name==='repr')   {drawRepr();}
  if(name==='somme')  {drawSomme();}
  if(name==='chasles'){drawChasles();}
  rk(btn.closest('.tabs'));
}
function switchColTab(name,btn){
  const panels=['tcolin','talign','tpara'];
  panels.forEach(p=>document.getElementById(p).classList.toggle('active',p===name));
  btn.closest('.tabs').querySelectorAll('.tab-btn').forEach((b,i)=>b.classList.toggle('active',panels[i]===name));
  if(name==='tcolin') checkColin();
  if(name==='talign') checkAlign();
  if(name==='tpara')  checkPara();
}

/* ================================================================
   01 — REPR (draggable A, B)
================================================================ */
let rA={x:-3,y:-1}, rB={x:2,y:2};
let rMeta={ox:0,oy:0,st:36};

function drawRepr(){
  const ctx=setupCanvas('cvRepr',300); if(!ctx)return;
  const W=ctx.canvas._W,H=ctx.canvas._H;
  const ox=W/2,oy=H/2,st=36; rMeta={ox,oy,st};
  drawBg(ctx,W,H,ox,oy,st);
  const[ax,ay]=tc(rA.x,rA.y,ox,oy,st);
  const[bx,by]=tc(rB.x,rB.y,ox,oy,st);
  arrow(ctx,ax,ay,bx,by,'#c95f2a','AB');
  dot(ctx,ax,ay,'#1e1509','A');
  dot(ctx,bx,by,'#c95f2a','B');
  const dx=rB.x-rA.x,dy=rB.y-rA.y;
  document.getElementById('infoRepr').className='result-box res-info';
  document.getElementById('infoRepr').innerHTML=`${vec('AB')} = (${dx} ; ${dy}) ‖${vec('AB')}‖ = √(${dx}²+${dy}²) = √${dx*dx+dy*dy} ≈ ${Math.hypot(dx,dy).toFixed(4)}`;
  // update drag points meta
  reprDragPts[0].x=rA.x;reprDragPts[0].y=rA.y;reprDragPts[0].ox=ox;reprDragPts[0].oy=oy;reprDragPts[0].st=st;
  reprDragPts[1].x=rB.x;reprDragPts[1].y=rB.y;reprDragPts[1].ox=ox;reprDragPts[1].oy=oy;reprDragPts[1].st=st;
}
const reprDragPts=[
  {x:-3,y:-1,ox:0,oy:0,st:36},
  {x:2, y:2, ox:0,oy:0,st:36}
];

/* ================================================================
   01 — SOMME (draggable origin+u+v)
================================================================ */
let sO={x:-3,y:-2},sU={x:3,y:1},sV={x:1,y:3};
let sMeta={ox:0,oy:0,st:36};

function drawSomme(){
  const ctx=setupCanvas('cvSomme',300); if(!ctx)return;
  const W=ctx.canvas._W,H=ctx.canvas._H;
  const ox=W/2,oy=H/2,st=36; sMeta={ox,oy,st};
  drawBg(ctx,W,H,ox,oy,st);
  const[o1,o2]=tc(sO.x,sO.y,ox,oy,st);
  const[u1,u2]=tc(sO.x+sU.x,sO.y+sU.y,ox,oy,st);
  const[v1,v2]=tc(sO.x+sV.x,sO.y+sV.y,ox,oy,st);
  const[s1,s2]=tc(sO.x+sU.x+sV.x,sO.y+sU.y+sV.y,ox,oy,st);
  // parallelogram dashes
  ctx.save();ctx.strokeStyle='rgba(30,21,9,0.12)';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);
  ctx.beginPath();ctx.moveTo(u1,u2);ctx.lineTo(s1,s2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(v1,v2);ctx.lineTo(s1,s2);ctx.stroke();
  ctx.restore();
  arrow(ctx,o1,o2,u1,u2,'#c95f2a','u');
  arrow(ctx,o1,o2,v1,v2,'#1a5c8f','v');
  arrow(ctx,u1,u2,s1,s2,'#1a5c8f','v',true);
  arrow(ctx,o1,o2,s1,s2,'#6b3fa0','u+v');
  dot(ctx,o1,o2,'#1e1509','O');
  document.getElementById('infoSomme').className='result-box res-info';
  document.getElementById('infoSomme').innerHTML=`${vec('u')}(${sU.x};${sU.y}) + ${vec('v')}(${sV.x};${sV.y}) = (${sU.x+sV.x};${sU.y+sV.y}) — règle du parallélogramme`;
  sommeDragPts.forEach((p,i)=>{p.ox=ox;p.oy=oy;p.st=st;});
  sommeDragPts[0].x=sO.x;sommeDragPts[0].y=sO.y;
  sommeDragPts[1].x=sO.x+sU.x;sommeDragPts[1].y=sO.y+sU.y;
  sommeDragPts[2].x=sO.x+sV.x;sommeDragPts[2].y=sO.y+sV.y;
}
const sommeDragPts=[
  {x:0,y:0,ox:0,oy:0,st:36},
  {x:3,y:1,ox:0,oy:0,st:36},
  {x:1,y:3,ox:0,oy:0,st:36}
];

/* ================================================================
   01 — CHASLES (draggable A, B, C)
================================================================ */
let cA={x:-3,y:-1},cB={x:1,y:2},cC={x:4,y:-1};
let cMeta={ox:0,oy:0,st:36};

function drawChasles(){
  const ctx=setupCanvas('cvChasles',300); if(!ctx)return;
  const W=ctx.canvas._W,H=ctx.canvas._H;
  const ox=W/2,oy=H/2,st=36; cMeta={ox,oy,st};
  drawBg(ctx,W,H,ox,oy,st);
  const[ax,ay]=tc(cA.x,cA.y,ox,oy,st);
  const[bx,by]=tc(cB.x,cB.y,ox,oy,st);
  const[cx2,cy2]=tc(cC.x,cC.y,ox,oy,st);
  arrow(ctx,ax,ay,bx,by,'#c95f2a','AB');
  arrow(ctx,bx,by,cx2,cy2,'#1a5c8f','BC');
  arrow(ctx,ax,ay,cx2,cy2,'#2e7d4f','AC',true);
  dot(ctx,ax,ay,'#1e1509','A');
  dot(ctx,bx,by,'#c95f2a','B');
  dot(ctx,cx2,cy2,'#1a5c8f','C');
  const abx=cB.x-cA.x,aby=cB.y-cA.y,bcx=cC.x-cB.x,bcy=cC.y-cB.y,acx=cC.x-cA.x,acy=cC.y-cA.y;
  document.getElementById('infoChasles').className='result-box res-info';
  document.getElementById('infoChasles').innerHTML=`${vec('AB')}(${abx};${aby}) + ${vec('BC')}(${bcx};${bcy}) = ${vec('AC')}(${acx};${acy}) ✓`;
  chaslesDragPts.forEach(p=>{p.ox=ox;p.oy=oy;p.st=st;});
  chaslesDragPts[0].x=cA.x;chaslesDragPts[0].y=cA.y;
  chaslesDragPts[1].x=cB.x;chaslesDragPts[1].y=cB.y;
  chaslesDragPts[2].x=cC.x;chaslesDragPts[2].y=cC.y;
}
const chaslesDragPts=[
  {x:-3,y:-1,ox:0,oy:0,st:36},
  {x:1, y:2, ox:0,oy:0,st:36},
  {x:4, y:-1,ox:0,oy:0,st:36}
];

/* ================================================================
   02 — AB⃗ calculator
================================================================ */
function computeAB(){
  const ax=+v('ax'),ay=+v('ay'),bx=+v('bx'),by=+v('by');
  const dx=bx-ax,dy=by-ay,n=Math.hypot(dx,dy);
  setH('ab-result','res-info',`${vec('AB')} = (${bx}−${ax} ; ${by}−${ay}) = (${dx} ; ${dy})<br>‖${vec('AB')}‖ = √(${dx}²+${dy}²) = √${dx*dx+dy*dy} ≈ ${n.toFixed(4)}`);
}

/* ================================================================
   02 — REPERE
================================================================ */
function drawRepere(){
  const ux=+v('ux'),uy=+v('uy'),vx=+v('vx'),vy=+v('vy');
  const ctx=setupCanvas('cvRepere',320); if(!ctx)return;
  const W=ctx.canvas._W,H=ctx.canvas._H;
  const ox=W/2,oy=H/2,st=38;
  drawBg(ctx,W,H,ox,oy,st);
  const[o1,o2]=tc(0,0,ox,oy,st);
  const[u1,u2]=tc(ux,uy,ox,oy,st);
  const[vv1,vv2]=tc(vx,vy,ox,oy,st);
  const[i1,i2]=tc(1,0,ox,oy,st);
  const[j1,j2]=tc(0,1,ox,oy,st);
  arrow(ctx,o1,o2,i1,i2,'rgba(30,21,9,0.3)','i');
  arrow(ctx,o1,o2,j1,j2,'rgba(30,21,9,0.3)','j');
  arrow(ctx,o1,o2,u1,u2,'#c95f2a','u');
  arrow(ctx,o1,o2,vv1,vv2,'#1a5c8f','v');
  dot(ctx,o1,o2,'#1e1509','O');
  const det=ux*vy-uy*vx;
  setH('infoRepere','res-info',`${vec('u')}(${ux};${uy}) ‖${vec('u')}‖≈${Math.hypot(ux,uy).toFixed(3)}  ${vec('v')}(${vx};${vy}) ‖${vec('v')}‖≈${Math.hypot(vx,vy).toFixed(3)}<br>det(${vec('u')},${vec('v')}) = ${ux}×${vy}−${uy}×${vx} = ${det}`);
}

/* ================================================================
   03 — VEC OPERATIONS
================================================================ */
document.getElementById('vec-op').addEventListener('change',function(){
  const s=this.value==='scal';
  document.getElementById('grp-v').style.display=s?'none':'flex';
  document.getElementById('grp-k').style.display=s?'flex':'none';
});
function computeVecOp(){
  const ux=+v('cu-x'),uy=+v('cu-y'),op=v('vec-op');
  if(op==='add'){
    const vx=+v('cv-x'),vy=+v('cv-y');
    setH('vec-op-result','res-info',`${vec('u')}(${ux};${uy}) + ${vec('v')}(${vx};${vy}) = (${ux+vx};${uy+vy})`);
  } else if(op==='sub'){
    const vx=+v('cv-x'),vy=+v('cv-y');
    setH('vec-op-result','res-info',`${vec('u')}(${ux};${uy}) − ${vec('v')}(${vx};${vy}) = (${ux-vx};${uy-vy})`);
  } else {
    const k=+v('ck');
    setH('vec-op-result','res-info',`${k} × ${vec('u')}(${ux};${uy}) = (${k*ux};${k*uy})`);
  }
}

/* ================================================================
   04 — DISTANCE & MILIEU  (pan · zoom · étiquette I draggable)
================================================================ */

// ── Viewport state ─────────────────────────────────────────
const DM = {
  // math coords of the current origin (centre de la vue en coordonnées math)
  cx: 0, cy: 0,
  // pixels per unit
  st: 40,
  // canvas dims (filled by setupDM)
  W: 0, H: 0,
  // draggable label offset from midpoint I, in math units
  lox: 0.4, loy: 0.6,
  // current A,B
  ax:1, ay:3, bx:5, by:7,
  // interaction state
  mode: null,     // null | 'pan' | 'lbl'
  px0: 0, py0: 0, // pointer start canvas px
  cx0: 0, cy0: 0, // viewport origin at drag start
  lox0:0, loy0:0, // label offset at drag start
  // pinch
  pinchD0: 0, st0: 0,
};

function dm_tc(mx,my){ return [DM.W/2+(mx-DM.cx)*DM.st, DM.H/2-(my-DM.cy)*DM.st]; }
function dm_tm(px,py){ return [DM.cx+(px-DM.W/2)/DM.st, DM.cy-(py-DM.H/2)/DM.st]; }

function dm_draw(){
  const c=document.getElementById('cvDM'); if(!c)return;
  const ctx=c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  ctx.save(); ctx.scale(DPR,DPR);

  const W=DM.W, H=DM.H, st=DM.st;
  // ── Grid ─────────────────────────────────────────
  const ox=W/2-DM.cx*st, oy=H/2+DM.cy*st;
  // sub-grid
  ctx.strokeStyle='rgba(201,95,42,0.07)'; ctx.lineWidth=.5;
  const xStart=Math.floor((0-ox)/st)*st+ox%st;
  for(let x=(ox%st+st)%st; x<W; x+=st){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=(oy%st+st)%st; y<H; y+=st){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  // axes
  ctx.strokeStyle='rgba(30,21,9,0.20)'; ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(0,oy);ctx.lineTo(W,oy);ctx.stroke();
  ctx.beginPath();ctx.moveTo(ox,0);ctx.lineTo(ox,H);ctx.stroke();
  // ticks + labels
  ctx.fillStyle='rgba(30,21,9,0.3)'; ctx.font='10px Roboto Mono,monospace';
  ctx.textAlign='center';
  const iMin=Math.ceil(-ox/st), iMax=Math.floor((W-ox)/st);
  for(let i=iMin;i<=iMax;i++){
    if(i===0)continue;
    const x=ox+i*st;
    ctx.beginPath();ctx.moveTo(x,oy-3);ctx.lineTo(x,oy+3);ctx.stroke();
    ctx.fillText(i,x,oy+13);
  }
  ctx.textAlign='right';
  const jMin=Math.ceil(-(H-oy)/st), jMax=Math.floor(oy/st);
  for(let j=jMin;j<=jMax;j++){
    if(j===0)continue;
    const y=oy-j*st;
    ctx.beginPath();ctx.moveTo(ox-3,y);ctx.lineTo(ox+3,y);ctx.stroke();
    ctx.fillText(j,ox-6,y+4);
  }
  ctx.fillStyle='rgba(30,21,9,0.3)'; ctx.textAlign='right';
  ctx.fillText('O',ox-5,oy+13);

  // ── Objects ──────────────────────────────────────
  const {ax,ay,bx,by,lox,loy} = DM;
  const mx=(ax+bx)/2, my=(ay+by)/2;
  const [apx,apy]=dm_tc(ax,ay);
  const [bpx,bpy]=dm_tc(bx,by);
  const [ipx,ipy]=dm_tc(mx,my);
  const [lpx,lpy]=dm_tc(mx+lox, my+loy);

  // Segment AB
  ctx.save(); ctx.strokeStyle='#c95f2a'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.moveTo(apx,apy); ctx.lineTo(bpx,bpy); ctx.stroke(); ctx.restore();

  // Dots
  dot(ctx,apx,apy,'#c95f2a','A');
  dot(ctx,bpx,bpy,'#c95f2a','B');
  dot(ctx,ipx,ipy,'#6b3fa0','I',6);

  // Connector dashed line from I to label
  ctx.save(); ctx.strokeStyle='rgba(107,63,160,0.28)'; ctx.lineWidth=1; ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(ipx,ipy); ctx.lineTo(lpx,lpy); ctx.stroke(); ctx.restore();

  // Label pill
  const txt=`I(${mx};${my})`;
  ctx.font='bold 11px Roboto Mono,monospace';
  ctx.textAlign='center';
  const tw=ctx.measureText(txt).width;
  const pad=6, ph=18, pr=5;
  const lx0=lpx-tw/2-pad, ly0=lpy-13;
  // shadow
  ctx.save(); ctx.shadowColor='rgba(107,63,160,0.15)'; ctx.shadowBlur=6;
  ctx.fillStyle='rgba(255,255,255,0.92)';
  ctx.strokeStyle='#6b3fa0'; ctx.lineWidth=1.2;
  ctx.beginPath();
  ctx.moveTo(lx0+pr,ly0); ctx.lineTo(lx0+tw+pad*2-pr,ly0);
  ctx.arcTo(lx0+tw+pad*2,ly0,lx0+tw+pad*2,ly0+pr,pr);
  ctx.lineTo(lx0+tw+pad*2,ly0+ph-pr);
  ctx.arcTo(lx0+tw+pad*2,ly0+ph,lx0+tw+pad*2-pr,ly0+ph,pr);
  ctx.lineTo(lx0+pr,ly0+ph); ctx.arcTo(lx0,ly0+ph,lx0,ly0+ph-pr,pr);
  ctx.lineTo(lx0,ly0+pr); ctx.arcTo(lx0,ly0,lx0+pr,ly0,pr); ctx.closePath();
  ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.fillStyle='#6b3fa0'; ctx.font='bold 11px Roboto Mono,monospace'; ctx.textAlign='center';
  ctx.fillText(txt,lpx,lpy);

  ctx.restore();
}

function dm_hitLabel(cpx,cpy){
  const {ax,ay,bx,by,lox,loy} = DM;
  const mx=(ax+bx)/2, my=(ay+by)/2;
  const [lpx,lpy]=dm_tc(mx+lox,my+loy);
  return Math.abs(cpx-lpx)<50 && Math.abs(cpy-lpy)<14;
}
function dm_hitNothing(){ return true; } // fallback → pan

function computeDistMid(){
  const ax=+v('dm-ax'),ay=+v('dm-ay'),bx=+v('dm-bx'),by=+v('dm-by');
  const dx=bx-ax,dy=by-ay,dist=Math.hypot(dx,dy),mx=(ax+bx)/2,my=(ay+by)/2;
  setH('dm-result','res-info',
    `AB = √((${bx}−${ax})²+(${by}−${ay})²) = √(${dx*dx}+${dy*dy}) = √${dx*dx+dy*dy} ≈ ${dist.toFixed(4)}<br>Milieu I(${mx} ; ${my})`);

  // (Re)size canvas
  const c=document.getElementById('cvDM'); if(!c)return;
  const W=c.parentElement.clientWidth||500;
  c.width=W*DPR; c.height=340*DPR; c.style.height='340px';
  DM.W=W; DM.H=340;

  // Reset viewport so the midpoint is centred
  DM.ax=ax; DM.ay=ay; DM.bx=bx; DM.by=by;
  DM.cx=mx; DM.cy=my;
  // Auto scale so segment fills ~55% of canvas width
  const span=Math.max(Math.abs(dx),Math.abs(dy),2);
  DM.st=Math.min(80, Math.max(20, Math.floor(W*0.55/(span+2))));
  // Reset label offset
  DM.lox=0.4; DM.loy=0.6;

  dm_draw();
  dm_initEvents();
}

let _dm_events=false;
function dm_initEvents(){
  if(_dm_events)return; _dm_events=true;
  const c=document.getElementById('cvDM');

  // ── Pointer helpers ───────────────────────────────
  function pos(e){
    const r=c.getBoundingClientRect();
    if(e.touches){
      return[(e.touches[0].clientX-r.left),(e.touches[0].clientY-r.top)];
    }
    return[e.clientX-r.left, e.clientY-r.top];
  }
  function pinchDist(e){
    const dx=e.touches[0].clientX-e.touches[1].clientX;
    const dy=e.touches[0].clientY-e.touches[1].clientY;
    return Math.hypot(dx,dy);
  }
  function pinchCentre(e){
    const r=c.getBoundingClientRect();
    return[(e.touches[0].clientX+e.touches[1].clientX)/2-r.left,
           (e.touches[0].clientY+e.touches[1].clientY)/2-r.top];
  }

  // ── Mouse ─────────────────────────────────────────
  c.addEventListener('mousedown',e=>{
    const[cx,cy]=pos(e);
    if(dm_hitLabel(cx,cy)){
      DM.mode='lbl'; DM.px0=cx; DM.py0=cy;
      DM.lox0=DM.lox; DM.loy0=DM.loy;
    } else {
      DM.mode='pan'; DM.px0=cx; DM.py0=cy;
      DM.cx0=DM.cx; DM.cy0=DM.cy;
    }
    e.preventDefault();
  });
  c.addEventListener('mousemove',e=>{
    const[cx,cy]=pos(e);
    c.style.cursor=dm_hitLabel(cx,cy)?'grab':'move';
    if(!DM.mode)return;
    const ddx=cx-DM.px0, ddy=cy-DM.py0;
    if(DM.mode==='pan'){
      DM.cx=DM.cx0-ddx/DM.st;
      DM.cy=DM.cy0+ddy/DM.st;
    } else if(DM.mode==='lbl'){
      DM.lox=DM.lox0+ddx/DM.st;
      DM.loy=DM.loy0-ddy/DM.st;
    }
    dm_draw(); e.preventDefault();
  });
  c.addEventListener('mouseup',()=>{ DM.mode=null; });
  c.addEventListener('mouseleave',()=>{ DM.mode=null; });

  // ── Wheel zoom ────────────────────────────────────
  c.addEventListener('wheel',e=>{
    e.preventDefault();
    const[px,py]=pos(e);
    // math coords under cursor before zoom
    const[mx,my]=dm_tm(px,py);
    const factor=e.deltaY<0?1.12:1/1.12;
    DM.st=Math.min(200,Math.max(8,DM.st*factor));
    // Keep the point under the cursor fixed
    const[nx,ny]=dm_tm(px,py);
    DM.cx+=mx-nx; DM.cy+=my-ny;
    dm_draw();
  },{passive:false});

  // ── Touch pan / pinch-zoom ────────────────────────
  c.addEventListener('touchstart',e=>{
    if(e.touches.length===1){
      const[cx,cy]=pos(e);
      if(dm_hitLabel(cx,cy)){
        DM.mode='lbl'; DM.px0=cx; DM.py0=cy;
        DM.lox0=DM.lox; DM.loy0=DM.loy;
      } else {
        DM.mode='pan'; DM.px0=cx; DM.py0=cy;
        DM.cx0=DM.cx; DM.cy0=DM.cy;
      }
    } else if(e.touches.length===2){
      DM.mode='pinch';
      DM.pinchD0=pinchDist(e);
      DM.st0=DM.st;
      const[pcx,pcy]=pinchCentre(e);
      DM.px0=pcx; DM.py0=pcy;
      DM.cx0=DM.cx; DM.cy0=DM.cy;
    }
    e.preventDefault();
  },{passive:false});

  c.addEventListener('touchmove',e=>{
    if(DM.mode==='pan' && e.touches.length===1){
      const[cx,cy]=pos(e);
      DM.cx=DM.cx0-(cx-DM.px0)/DM.st;
      DM.cy=DM.cy0+(cy-DM.py0)/DM.st;
      dm_draw();
    } else if(DM.mode==='lbl' && e.touches.length===1){
      const[cx,cy]=pos(e);
      DM.lox=DM.lox0+(cx-DM.px0)/DM.st;
      DM.loy=DM.loy0-(cy-DM.py0)/DM.st;
      dm_draw();
    } else if(DM.mode==='pinch' && e.touches.length===2){
      const d=pinchDist(e);
      const[pcx,pcy]=pinchCentre(e);
      // zoom around pinch centre
      const[mx0,my0]=dm_tm(DM.px0,DM.py0);
      DM.st=Math.min(200,Math.max(8,DM.st0*(d/DM.pinchD0)));
      const[mx1,my1]=dm_tm(DM.px0,DM.py0);
      DM.cx+=mx0-mx1; DM.cy+=my0-my1;
      // pan with pinch centre movement
      DM.cx-=(pcx-DM.px0)/DM.st;
      DM.cy+=(pcy-DM.py0)/DM.st;
      DM.px0=pcx; DM.py0=pcy;
      dm_draw();
    }
    e.preventDefault();
  },{passive:false});

  c.addEventListener('touchend',()=>{ DM.mode=null; });

  // ── Double-click recentre ─────────────────────────
  c.addEventListener('dblclick',()=>{
    const{ax,ay,bx,by}=DM;
    DM.cx=(ax+bx)/2; DM.cy=(ay+by)/2;
    dm_draw();
  });
}

/* ================================================================
   05 — COLINÉARITÉ
================================================================ */
function det2(ax,ay,bx,by){return ax*by-ay*bx;}

function checkColin(){
  const ux=+v('cu1'),uy=+v('cu2'),vx=+v('cv1'),vy=+v('cv2');
  const d=det2(ux,uy,vx,vy),ok=Math.abs(d)<1e-9;
  setH('res-colin',ok?'res-ok':'res-ko',`det(${vec('u')},${vec('v')}) = ${ux}×${vy} − ${uy}×${vx} = ${ux*vy} − ${uy*vx} = ${d}<br>${ok?'= 0 → COLINÉAIRES ✓':'≠ 0 → non colinéaires'}`);
  const ctx=setupCanvas('cvColin',260); if(!ctx)return;
  const W=ctx.canvas._W,H=ctx.canvas._H,ox=W/2,oy=H/2,st=38;
  drawBg(ctx,W,H,ox,oy,st);
  const[o1,o2]=tc(0,0,ox,oy,st);
  arrow(ctx,o1,o2,...tc(ux,uy,ox,oy,st),'#c95f2a','u');
  arrow(ctx,o1,o2,...tc(vx,vy,ox,oy,st),'#1a5c8f','v');
  dot(ctx,o1,o2,'#1e1509','O');
}

function checkAlign(){
  const ax=+v('aa1'),ay=+v('aa2'),bx=+v('ab1'),by=+v('ab2'),cx=+v('ac1'),cy=+v('ac2');
  const abx=bx-ax,aby=by-ay,acx=cx-ax,acy=cy-ay;
  const d=det2(abx,aby,acx,acy),ok=Math.abs(d)<1e-9;
  setH('res-align',ok?'res-ok':'res-ko',`${vec('AB')}(${abx};${aby}) ${vec('AC')}(${acx};${acy})<br>det = ${abx}×${acy}−${aby}×${acx} = ${d}<br>${ok?'= 0 → A, B, C ALIGNÉS ✓':'≠ 0 → non alignés'}`);
  const ctx=setupCanvas('cvAlign',260); if(!ctx)return;
  const W=ctx.canvas._W,H=ctx.canvas._H;
  const st=38;
  const cxc=W/2-((ax+cx)/2)*st,cyc=H/2+((ay+cy)/2)*st;
  const ox=clamp(cxc,40,W-40),oy=clamp(cyc,40,H-40);
  drawBg(ctx,W,H,ox,oy,st);
  const[apx,apy]=tc(ax,ay,ox,oy,st);
  const[bpx,bpy]=tc(bx,by,ox,oy,st);
  const[cpx,cpy]=tc(cx,cy,ox,oy,st);
  if(ok){ctx.save();ctx.strokeStyle='rgba(46,125,79,.25)';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(apx,apy);ctx.lineTo(cpx,cpy);ctx.stroke();ctx.restore();}
  arrow(ctx,apx,apy,bpx,bpy,'#c95f2a','AB');
  arrow(ctx,apx,apy,cpx,cpy,'#1a5c8f','AC');
  dot(ctx,apx,apy,'#1e1509','A');
  dot(ctx,bpx,bpy,'#c95f2a','B');
  dot(ctx,cpx,cpy,'#1a5c8f','C');
}

function checkPara(){
  const ax=+v('pa1'),ay=+v('pa2'),bx=+v('pb1'),by=+v('pb2');
  const cx=+v('pc1'),cy=+v('pc2'),dx=+v('pd1'),dy=+v('pd2');
  const abx=bx-ax,aby=by-ay,cdx=dx-cx,cdy=dy-cy;
  const det=det2(abx,aby,cdx,cdy),ok=Math.abs(det)<1e-9;
  setH('res-para',ok?'res-ok':'res-ko',`${vec('AB')}(${abx};${aby}) ${vec('CD')}(${cdx};${cdy})<br>det = ${abx*cdy}−${aby*cdx} = ${det}<br>${ok?'= 0 → (AB) ∥ (CD) ✓':'≠ 0 → non parallèles'}`);
  const ctx=setupCanvas('cvPara',260); if(!ctx)return;
  const W=ctx.canvas._W,H=ctx.canvas._H,ox=W/2,oy=H/2,st=38;
  drawBg(ctx,W,H,ox,oy,st);
  arrow(ctx,...tc(ax,ay,ox,oy,st),...tc(bx,by,ox,oy,st),'#c95f2a','AB');
  arrow(ctx,...tc(cx,cy,ox,oy,st),...tc(dx,dy,ox,oy,st),'#1a5c8f','CD');
  ['A','B','C','D'].forEach((l,i)=>{
    const pts=[{x:ax,y:ay},{x:bx,y:by},{x:cx,y:cy},{x:dx,y:dy}];
    dot(ctx,...tc(pts[i].x,pts[i].y,ox,oy,st),i<2?'#c95f2a':'#1a5c8f',l);
  });
}

/* ================================================================
   07 — HOMOTHÉTIE
================================================================ */
const homoPts=[{x:1,y:0},{x:3,y:0},{x:3,y:2},{x:1,y:2}];
function drawHomo(){
  const oox=+v('hox'),ooy=+v('hoy'),k=+v('hk');
  const ctx=setupCanvas('cvHomo',300); if(!ctx)return;
  const W=ctx.canvas._W,H=ctx.canvas._H,ox=W/2,oy=H/2,st=34;
  drawBg(ctx,W,H,ox,oy,st);
  // original
  const pts=homoPts.map(p=>tc(p.x,p.y,ox,oy,st));
  ctx.save();ctx.fillStyle='rgba(201,95,42,.12)';ctx.strokeStyle='#c95f2a';ctx.lineWidth=2;
  ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();
  ctx.fill();ctx.stroke();ctx.restore();
  // image
  const img=homoPts.map(p=>tc(oox+k*(p.x-oox),ooy+k*(p.y-ooy),ox,oy,st));
  ctx.save();ctx.fillStyle='rgba(26,92,143,.12)';ctx.strokeStyle='#1a5c8f';ctx.lineWidth=2;
  ctx.beginPath();img.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();
  ctx.fill();ctx.stroke();ctx.restore();
  // center
  const[opx,opy]=tc(oox,ooy,ox,oy,st);
  dot(ctx,opx,opy,'#6b3fa0','Ω',6);
  // rays
  homoPts.forEach((p,i)=>{
    ctx.save();ctx.strokeStyle='rgba(107,63,160,.18)';ctx.lineWidth=1;ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.moveTo(opx,opy);ctx.lineTo(...img[i]);ctx.stroke();ctx.restore();
  });
  set('infoHomo','res-violet',
    `Homothétie de centre Ω(${oox};${ooy}), rapport k = ${k}\nRapport des longueurs |k| = ${Math.abs(k)}${k<0?' (inversion du sens)':''}`);
}

/* ================================================================
   PROOF TOGGLE
================================================================ */
function tp(id,btn){
  const b=document.getElementById(id);
  b.classList.toggle('visible');btn.classList.toggle('open');
  if(b.classList.contains('visible'))rk(b);
}

/* ================================================================
   INIT
================================================================ */
function initAll(){
  drawRepr();
  drawSomme();
  drawChasles();
  drawRepere();
  computeDistMid();
  checkColin();
  drawHomo();
  // drag for repr
  makeDraggable('cvRepr',reprDragPts,()=>{rA.x=reprDragPts[0].x;rA.y=reprDragPts[0].y;rB.x=reprDragPts[1].x;rB.y=reprDragPts[1].y;drawRepr();});
  // drag for somme
  makeDraggable('cvSomme',sommeDragPts,()=>{
    sO.x=sommeDragPts[0].x;sO.y=sommeDragPts[0].y;
    sU.x=sommeDragPts[1].x-sO.x;sU.y=sommeDragPts[1].y-sO.y;
    sV.x=sommeDragPts[2].x-sO.x;sV.y=sommeDragPts[2].y-sO.y;
    drawSomme();
  });
  // drag for chasles
  makeDraggable('cvChasles',chaslesDragPts,()=>{
    cA.x=chaslesDragPts[0].x;cA.y=chaslesDragPts[0].y;
    cB.x=chaslesDragPts[1].x;cB.y=chaslesDragPts[1].y;
    cC.x=chaslesDragPts[2].x;cC.y=chaslesDragPts[2].y;
    drawChasles();
  });
}

window.addEventListener('resize',()=>{
  drawRepr();drawSomme();drawChasles();
  drawRepere();computeDistMid();
  checkColin();drawHomo();
});

/* ================================================================
   HELPERS
================================================================ */
function v(id){return document.getElementById(id)?.value??'';}
function set(id,cls,txt){const e=document.getElementById(id);if(!e)return;e.className='result-box '+cls;e.textContent=txt;}
function vec(n){return `<span class="vec-lbl">${n}</span>`;}
function setH(id,cls,h){const e=document.getElementById(id);if(!e)return;e.className='result-box '+cls;e.innerHTML=h;}
function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function ri(a,b){return Math.floor(Math.random()*(b-a+1))+a;}

/* ================================================================
   CHRONO
================================================================ */
let cIv=null,cS=0,cP=false,cV=false;
function toggleChronoVis(){
  cV=!cV;
  document.getElementById('chrono-bar').classList.toggle('hidden',!cV);
  document.getElementById('ctbtn').textContent=cV?'⏱ Masquer chronomètre':'⏱ Afficher chronomètre';
  if(cV&&!cIv)cIv=setInterval(()=>{if(!cP){cS++;updCD();}},1000);
}
function toggleChrono(){cP=!cP;document.getElementById('cpbtn').textContent=cP?'Reprendre':'Pause';}
function resetChrono(){cS=0;cP=false;document.getElementById('cpbtn').textContent='Pause';updCD();}
function updCD(){const m=String(Math.floor(cS/60)).padStart(2,'0'),s=String(cS%60).padStart(2,'0');document.getElementById('chrono-display').textContent=`${m}:${s}`;}

/* ================================================================
   QCM
================================================================ */
let qS=0,qT=0;
function generateQCM(){
  qS=0;qT=0;updQS();
  const c=document.getElementById('qcm-container');c.innerHTML='';
  buildQs().forEach((q,i)=>c.appendChild(renderQ(q,i)));
  rk(c);
}
function updQS(){document.getElementById('qcm-score').textContent=`${qS} / ${qT}`;}

function buildQs(){
  const qs=[];

  // Q1 — Coordonnées de AB⃗
  const ax=ri(-4,4),ay=ri(-3,3),bx=ri(-4,4),by=ri(-3,3);
  const dx=bx-ax,dy=by-ay;
  qs.push({
    q:`Si \\(A(${ax}\\,;\\,${ay})\\) et \\(B(${bx}\\,;\\,${by})\\), quelles sont les coordonnées de \\(\\overrightarrow{AB}\\)&nbsp;?`,
    choices:[`\\(\\binom{${dx}}{${dy}}\\)`,`\\(\\binom{${-dx}}{${-dy}}\\)`,`\\(\\binom{${ax}}{${ay}}\\)`],
    correct:0,
    explanation:`\\(\\overrightarrow{AB}\\binom{x_B-x_A}{y_B-y_A}=\\binom{${bx}-${ax}}{${by}-${ay}}=\\binom{${dx}}{${dy}}\\).`
  });

  // Q2 — Norme
  const ux=ri(-4,4),uy=ri(-4,4),n2=ux*ux+uy*uy;
  qs.push({
    q:`Quelle est la norme de \\(\\vec{u}\\binom{${ux}}{${uy}}\\)&nbsp;?`,
    choices:[`\\(\\sqrt{${n2}}\\approx ${Math.sqrt(n2).toFixed(3)}\\)`,`\\(${Math.abs(ux)+Math.abs(uy)}\\)`,`\\(${n2}\\)`],
    correct:0,
    explanation:`\\(\\|\\vec{u}\\|=\\sqrt{${ux}^2+${uy}^2}=\\sqrt{${n2}}\\approx ${Math.sqrt(n2).toFixed(3)}\\).`
  });

  // Q3 — Somme
  const u1x=ri(-3,3),u1y=ri(-3,3),v1x=ri(-3,3),v1y=ri(-3,3);
  qs.push({
    q:`\\(\\vec{u}\\binom{${u1x}}{${u1y}}+\\vec{v}\\binom{${v1x}}{${v1y}}=\\)?`,
    choices:[`\\(\\binom{${u1x+v1x}}{${u1y+v1y}}\\)`,`\\(\\binom{${u1x*v1x}}{${u1y*v1y}}\\)`,`\\(\\binom{${u1x-v1x}}{${u1y-v1y}}\\)`],
    correct:0,
    explanation:`On additionne composante par composante : \\(\\binom{${u1x}+${v1x}}{${u1y}+${v1y}}=\\binom{${u1x+v1x}}{${u1y+v1y}}\\).`
  });

  // Q4 — Déterminant / colinéarité
  const p=ri(1,4),q=ri(1,4);
  qs.push({
    q:`\\(\\vec{u}\\binom{${p}}{${q}}\\) et \\(\\vec{v}\\binom{${2*p}}{${2*q}}\\) sont-ils colinéaires&nbsp;?`,
    choices:['Oui','Non'],
    correct:0,
    explanation:`\\(\\det(\\vec{u},\\vec{v})=${p}\\times${2*q}-${q}\\times${2*p}=${2*p*q-2*p*q}=0\\) → colinéaires (\\(\\vec{v}=2\\vec{u}\\)).`
  });

  // Q5 — Alignement
  const a5x=ri(-2,1),a5y=ri(-1,2);
  const k5=ri(2,4);
  const b5x=a5x+1,b5y=a5y+2,c5x=a5x+k5,c5y=a5y+2*k5;
  qs.push({
    q:`\\(A(${a5x}\\,;\\,${a5y})\\), \\(B(${b5x}\\,;\\,${b5y})\\), \\(C(${c5x}\\,;\\,${c5y})\\) — alignés&nbsp;?`,
    choices:['Oui','Non'],
    correct:0,
    explanation:`\\(\\overrightarrow{AB}\\binom{${b5x-a5x}}{${b5y-a5y}}\\), \\(\\overrightarrow{AC}\\binom{${c5x-a5x}}{${c5y-a5y}}\\). det = ${(b5x-a5x)*(c5y-a5y)-(b5y-a5y)*(c5x-a5x)} = 0 → alignés.`
  });

  // Q6 — Milieu
  const mAx=ri(-3,3),mAy=ri(-3,3),mBx=ri(-3,3),mBy=ri(-3,3);
  const mIx=(mAx+mBx)/2,mIy=(mAy+mBy)/2;
  qs.push({
    q:`Milieu de \\([AB]\\) avec \\(A(${mAx}\\,;\\,${mAy})\\) et \\(B(${mBx}\\,;\\,${mBy})\\)&nbsp;?`,
    choices:[`\\(\\left(${mIx}\\,;\\,${mIy}\\right)\\)`,`\\(\\left(${mBx-mAx}\\,;\\,${mBy-mAy}\\right)\\)`,`\\(\\left(${mAx+mBx}\\,;\\,${mAy+mBy}\\right)\\)`],
    correct:0,
    explanation:`\\(I\\!\\left(\\dfrac{${mAx}+${mBx}}{2}\\,;\\,\\dfrac{${mAy}+${mBy}}{2}\\right)=\\left(${mIx}\\,;\\,${mIy}\\right)\\).`
  });

  // Q7 — Relation de Chasles
  qs.push({
    q:`Laquelle de ces égalités traduit la relation de Chasles pour 3 points A, B, C&nbsp;?`,
    choices:[
      `\\(\\overrightarrow{AC}=\\overrightarrow{AB}+\\overrightarrow{BC}\\)`,
      `\\(\\overrightarrow{AC}=\\overrightarrow{AB}\\times\\overrightarrow{BC}\\)`,
      `\\(\\overrightarrow{AC}=\\overrightarrow{BA}+\\overrightarrow{BC}\\)`
    ],
    correct:0,
    explanation:`La relation de Chasles est \\(\\overrightarrow{AC}=\\overrightarrow{AB}+\\overrightarrow{BC}\\) : on enchaîne les translations de A vers B, puis de B vers C.`
  });

  return shuffle(qs).slice(0,6);
}

function shuffle(a){
  return a.map(q=>{
    const idx=q.choices.map((c,i)=>({c,i}));
    for(let i=idx.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]];}
    return{...q,choices:idx.map(it=>it.c),correct:idx.findIndex(it=>it.i===q.correct)};
  });
}

function renderQ(q,idx){
  qT++;updQS();
  const card=document.createElement('div');card.className='qcm-q-card';
  const qEl=document.createElement('div');qEl.className='qcm-q';
  qEl.innerHTML=`<strong>${idx+1}.</strong> ${q.q}`;card.appendChild(qEl);
  const ch=document.createElement('div');ch.className='qcm-choices';
  q.choices.forEach((c,ci)=>{
    const btn=document.createElement('button');btn.className='qcm-choice';btn.innerHTML=c;
    btn.onclick=()=>ansQ(ci,q,card,ch);ch.appendChild(btn);
  });
  card.appendChild(ch);return card;
}
function ansQ(chosen,q,card,ch){
  ch.querySelectorAll('.qcm-choice').forEach(b=>b.disabled=true);
  const ok=chosen===q.correct;
  ch.querySelectorAll('.qcm-choice')[chosen].classList.add(ok?'correct':'wrong');
  if(!ok)ch.querySelectorAll('.qcm-choice')[q.correct].classList.add('correct');
  card.classList.add(ok?'answered-ok':'answered-ko');
  if(ok)qS++;updQS();
  const exp=document.createElement('div');exp.className='qcm-expl';
  exp.innerHTML=(ok?'✓ ':'✗ ')+q.explanation;card.appendChild(exp);rk(exp);
}