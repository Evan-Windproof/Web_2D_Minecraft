'use strict';
(() => {
const canvas = document.querySelector('#world'), ctx = canvas.getContext('2d');
const TILE = 32, W = 240, H = 80, KEY = 'blocklands-world-v1';
const blocks = [null, {name:'草方块',color:'#73994b'}, {name:'泥土',color:'#9b7250'}, {name:'石头',color:'#89939a'}, {name:'木材',color:'#b28b53'}, {name:'树叶',color:'#4e8250'}];
let map, player, selected = 1, camera = {x:0,y:0}, width, height, keys = new Set(), target = null, touchPlace = false, dirty = false;
let seed = 1, timer;
const rand = () => {seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296;};
function generate(){
 seed = Date.now() >>> 0; map = Array.from({length:H},()=>Array(W).fill(0));
 const tops=[];for(let x=0;x<W;x++){const top=34+Math.floor(Math.sin(x*.055)*5+Math.sin(x*.19)*2);tops[x]=top;for(let y=top;y<H;y++)map[y][x]=y===top?1:y<top+5?2:3;}
 for(let x=8;x<W-5;x+=7+Math.floor(rand()*8)){let y=tops[x];for(let a=-2;a<=2;a++)for(let b=-6;b<=-3;b++)if(Math.abs(a)+(b===-6?1:0)<3)map[y+b][x+a]=5;for(let b=1;b<=4;b++)map[y-b][x]=4;}
 player={x:4*TILE,y:(tops[4]-3)*TILE,vx:0,vy:0};dirty=true;
}
function valid(data){return data && data.version===1 && Array.isArray(data.map)&&data.map.length===H&&data.map.every(r=>Array.isArray(r)&&r.length===W&&r.every(v=>Number.isInteger(v)&&v>=0&&v<=5))&&data.player&&Number.isFinite(data.player.x)&&Number.isFinite(data.player.y)&&data.player.x>=0&&data.player.x<W*TILE-22&&data.player.y>=0&&data.player.y<H*TILE-42;}
try{const data=JSON.parse(localStorage.getItem(KEY));if(valid(data)){map=data.map;player={x:data.player.x,y:data.player.y,vx:0,vy:0};}else generate();}catch{generate();}
function toast(message){document.querySelector('#status').textContent=message;document.querySelector('#status').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>document.querySelector('#status').classList.remove('visible'),2400);}
function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,map,player:{x:player.x,y:player.y}}));dirty=false;toast('世界已保存在此浏览器');}catch{toast('保存失败：浏览器存储不可用或空间不足');}}
function resize(){width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;}
addEventListener('resize',resize);resize();
const toolbar=document.querySelector('#toolbar');blocks.slice(1).forEach((b,i)=>{const button=document.createElement('button');button.className='slot';button.innerHTML=`<b>${i+1}</b><i style="background:${b.color}"></i>${b.name}`;button.onclick=()=>select(i+1);toolbar.append(button);});
function select(n){selected=n;[...toolbar.children].forEach((el,i)=>{el.classList.toggle('selected',i+1===n);el.setAttribute('aria-pressed',String(i+1===n));});}select(1);
function tile(x,y){if(x<0||x>=W||y>=H)return 3;if(y<0)return 0;return map[y][x];}
function solid(x,y){return [1,2,3,4].includes(tile(x,y));}
function collision(x,y){for(let a=Math.floor(x/TILE);a<=Math.floor((x+21)/TILE);a++)for(let b=Math.floor(y/TILE);b<=Math.floor((y+41)/TILE);b++)if(solid(a,b))return true;return false;}
let grounded=false;
function physics(dt){player.vx=((keys.has('KeyD')||keys.has('ArrowRight'))?190:0)-((keys.has('KeyA')||keys.has('ArrowLeft'))?190:0);if((keys.has('Space')||keys.has('KeyW')||keys.has('ArrowUp'))&&grounded){player.vy=-400;grounded=false;}player.vy=Math.min(650,player.vy+1050*dt);const steps=Math.ceil(Math.max(Math.abs(player.vx*dt),Math.abs(player.vy*dt))/6)||1;for(let s=0;s<steps;s++){const nx=player.x+player.vx*dt/steps;if(!collision(nx,player.y))player.x=nx;const ny=player.y+player.vy*dt/steps;if(!collision(player.x,ny)){player.y=ny;grounded=false;}else{grounded=player.vy>=0;player.vy=0;}}dirty=true;camera.x=Math.max(0,Math.min(W*TILE-width,player.x-width/2));camera.y=Math.max(0,Math.min(H*TILE-height,player.y-height*.48));}
function reachable(t){return t&&t.x>=0&&t.x<W&&t.y>=0&&t.y<H&&Math.hypot((t.x+.5)*TILE-player.x-11,(t.y+.5)*TILE-player.y-21)<TILE*5;}
function edit(place){if(!reachable(target)){toast('请靠近一些：操作范围为 5 格');return;}const {x,y}=target;if(y===H-1){toast('世界底部无法破坏');return;}if(place){if(map[y][x])return;if(x*TILE<player.x+22&&(x+1)*TILE>player.x&&y*TILE<player.y+42&&(y+1)*TILE>player.y)return;map[y][x]=selected;}else map[y][x]=0;dirty=true;}
function aim(e){const r=canvas.getBoundingClientRect();target={x:Math.floor((e.clientX-r.left+camera.x)/TILE),y:Math.floor((e.clientY-r.top+camera.y)/TILE)};}
canvas.addEventListener('pointermove',aim);canvas.addEventListener('pointerleave',()=>target=null);canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerdown',e=>{e.preventDefault();aim(e);edit(e.pointerType==='touch'?touchPlace:e.button===2);});
canvas.addEventListener('wheel',e=>{e.preventDefault();select((selected-1+(e.deltaY>0?1:4))%5+1);},{passive:false});
addEventListener('keydown',e=>{if(['Space','ArrowLeft','ArrowRight','ArrowUp'].includes(e.code))e.preventDefault();keys.add(e.code);if(/^[1-5]$/.test(e.key))select(Number(e.key));});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{keys.clear();last=performance.now();});
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.key);});
document.querySelector('#mode').onclick=e=>{touchPlace=!touchPlace;e.target.textContent='模式：'+(touchPlace?'放置':'挖掘');};document.querySelector('#save').onclick=save;document.querySelector('#reset').onclick=()=>{if(confirm('生成新世界？当前世界将被替换，保存后无法恢复旧世界。')){generate();toast('新的旅程开始了');}};document.querySelector('#play').onclick=()=>document.querySelector('#instructions').hidden=true;document.querySelector('#help').onclick=()=>{const el=document.querySelector('#instructions');el.hidden=!el.hidden;};
function drawBlock(id,x,y,wx,wy){ctx.fillStyle=blocks[id].color;ctx.fillRect(x,y,TILE,TILE);ctx.fillStyle='#00000010';ctx.fillRect(x,y+29,TILE,3);ctx.fillRect(x+29,y,3,TILE);if(id===1){ctx.fillStyle='#a5c76a';ctx.fillRect(x,y,32,6);ctx.fillStyle='#906848';ctx.fillRect(x,y+12,29,17);}if(id===4){ctx.fillStyle='#765830';ctx.fillRect(x+7,y,3,32);ctx.fillRect(x+23,y,2,32);}for(let i=0;i<3;i++){const n=Math.abs((wx*71+wy*137+i*37)%23);ctx.fillStyle=i%2?'#ffffff19':'#00000015';ctx.fillRect(x+n+2,y+(n*7%23)+5,4,3);}}
function render(now){const dt=Math.min((now-last)/1000,.04);last=now;physics(dt);const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#9dcfe4');sky.addColorStop(1,'#e5efd0');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);ctx.fillStyle='#fff5cf';ctx.beginPath();ctx.arc(width*.78,120,35,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffffff70';for(let i=0;i<7;i++){let x=((i*281-camera.x*.15)%(width+300)+width+300)%(width+300)-150;ctx.fillRect(x,160+i%3*44,110,18);ctx.fillRect(x+28,148+i%3*44,60,17);}for(let y=Math.max(0,Math.floor(camera.y/TILE));y<Math.min(H,Math.ceil((camera.y+height)/TILE));y++)for(let x=Math.max(0,Math.floor(camera.x/TILE));x<Math.min(W,Math.ceil((camera.x+width)/TILE));x++)if(map[y][x])drawBlock(map[y][x],Math.floor(x*TILE-camera.x),Math.floor(y*TILE-camera.y),x,y);
 const px=Math.round(player.x-camera.x),py=Math.round(player.y-camera.y);ctx.fillStyle='#0002';ctx.fillRect(px-3,py+42,28,4);ctx.fillStyle='#283a55';ctx.fillRect(px+2,py+29,7,13);ctx.fillRect(px+13,py+29,7,13);ctx.fillStyle='#df9a65';ctx.fillRect(px+3,py,17,16);ctx.fillStyle='#49372c';ctx.fillRect(px+2,py-2,19,6);ctx.fillStyle='#27322e';ctx.fillRect(px+15,py+7,3,3);ctx.fillStyle='#e6bb60';ctx.fillRect(px+1,py+16,21,16);ctx.fillStyle='#d59163';ctx.fillRect(px-3,py+18,5,14);ctx.fillRect(px+22,py+18,5,14);
 if(target&&target.x>=0&&target.x<W&&target.y>=0&&target.y<H){ctx.strokeStyle=reachable(target)?'#fff8d4':'#df8075';ctx.lineWidth=2;ctx.strokeRect(target.x*TILE-camera.x+1,target.y*TILE-camera.y+1,30,30);}requestAnimationFrame(render);}
let last=performance.now();requestAnimationFrame(render);setInterval(()=>{if(dirty)save();},60000);
})();
