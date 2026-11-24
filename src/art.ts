import Phaser from 'phaser'
import { safeZone, zones } from './data'

import { drawAdventurer } from './actor-art'

export const WIDTH=1500, HEIGHT=1024, TILE=32
export type Obstacle={x:number;y:number;r:number}
export const entry={x:115,y:540}
export const exit={x:1380,y:535}
export const chest={x:1072,y:362}
export const secret={x:1154,y:752}
export const refuge={x:1382,y:848}
export const npcPoints=[
 {x:596,y:436},{x:684,y:436},{x:772,y:436},{x:860,y:436},{x:948,y:436},
 {x:596,y:650},{x:684,y:650},{x:772,y:650},{x:860,y:650},{x:948,y:650}
]
export function rng(seed:number){
 return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296}
}
const color=(a:number,b:number,t:number)=>Phaser.Display.Color.GetColor(
 Math.round((a>>16)*(1-t)+(b>>16)*t),
 Math.round(((a>>8)&255)*(1-t)+((b>>8)&255)*t),
 Math.round((a&255)*(1-t)+(b&255)*t))
function ink(g:Phaser.GameObjects.Graphics,c:number,x:number,y:number,w:number,h:number,a=1){g.fillStyle(c,a).fillRect(Math.round(x),Math.round(y),w,h)}
function oval(g:Phaser.GameObjects.Graphics,c:number,x:number,y:number,w:number,h:number,a=1){g.fillStyle(c,a).fillEllipse(x,y,w,h)}
function polygon(g:Phaser.GameObjects.Graphics,c:number,points:number[][]){
 g.fillStyle(c).fillPoints(points.map(([x,y])=>new Phaser.Math.Vector2(x,y)),true)
}
function grass(g:Phaser.GameObjects.Graphics,x:number,y:number,c:number,u:number){
 ink(g,c,x,y,2,4,.64);ink(g,c,x+2,y-2,2,5,.78);ink(g,c,x+4,y+1,2,3,.65)
 if(u>.86)ink(g,0xb99466,x+2,y-3,2,2,.68)
}
function pine(g:Phaser.GameObjects.Graphics,x:number,y:number,s:number,tone:number,r:()=>number){
 oval(g,0x0d141b,x+6,y+3,64*s,24*s,.64)
 ink(g,0x3e322e,x-4*s,y-30*s,8*s,35*s)
 for(let i=0;i<4;i++){
  const cy=y-(10+i*13)*s, w=(31-i*5)*s
  polygon(g,0x111d24,[[x-w-4,cy+4],[x-w*.59,cy-11*s],[x-5,cy-33*s],[x+4,cy-33*s],[x+w*.73,cy-11*s],[x+w+3,cy+4],[x+w*.5,cy+6],[x-w*.54,cy+6]])
  polygon(g,color(tone,0x111a24,i*.07),[[x-w,cy],[x-w*.63,cy-8*s],[x,cy-32*s],[x+w*.56,cy-9*s],[x+w,cy],[x+w*.41,cy+4],[x-w*.46,cy+4]])
  polygon(g,color(tone,0xb2ae80,.15),[[x-w*.76,cy-2],[x,cy-29*s],[x-w*.27,cy-5*s],[x+w*.15,cy-6],[x-w*.08,cy+1]])
  for(let j=0;j<5;j++){
   const off=(r()-.5)*w
   ink(g,color(tone,0xb0a97b,.23),x+off,cy-4-r()*4,3*s,1.5*s,.5)
  }
 }
}
function stone(g:Phaser.GameObjects.Graphics,x:number,y:number,s:number,tone:number){
 oval(g,0x14151d,x,y+3,44*s,15*s,.55)
 polygon(g,0x20232b,[[x-22*s,y],[x-18*s,y-18*s],[x-3*s,y-25*s],[x+13*s,y-22*s],[x+22*s,y-7*s],[x+17*s,y+3*s],[x-13*s,y+5*s]])
 polygon(g,tone,[[x-18*s,y-6*s],[x-13*s,y-17*s],[x-3*s,y-22*s],[x+11*s,y-19*s],[x+18*s,y-8*s],[x+6*s,y-4*s]])
 polygon(g,color(tone,0x131620,.44),[[x+11*s,y-19*s],[x+20*s,y-7*s],[x+16*s,y+2*s],[x+5*s,y+2*s],[x+6*s,y-4*s]])
 ink(g,color(tone,0xe4bf87,.16),x-10*s,y-15*s,9*s,2*s)
}
function torch(g:Phaser.GameObjects.Graphics,x:number,y:number,c=0xf5a34e){
 for(let i=6;i>0;i--)oval(g,c,x,y-22,15+i*13,10+i*10,.026)
 ink(g,0x231c24,x-3,y-23,7,26);ink(g,0x9a7455,x-1,y-19,2,20)
 ink(g,0x3b2831,x-7,y-23,14,5);ink(g,0xcf673b,x-4,y-33,9,11)
 ink(g,c,x-2,y-36,5,12);ink(g,0xffe69a,x,y-31,3,6)
}
function house(g:Phaser.GameObjects.Graphics,x:number,y:number,tone:number,r:()=>number){
 oval(g,0x12151d,x,y+3,165,43,.48)
 ink(g,0x25232a,x-67,y-75,134,77);ink(g,0x554850,x-61,y-58,122,56)
 for(let row=0;row<6;row++)for(let col=0;col<8;col++){
  const bx=x-59+col*15+(row%2)*5
  if(bx+13<x+63)ink(g,color(0x686067,0x3a343e,r()*.7),bx,y-58+row*9,13,7)
 }
 for(const dx of [-59,-31,30,56]){ink(g,0x2b252e,x+dx,y-55,5,56);ink(g,0x887075,x+dx,y-55,1,55)}
 polygon(g,0x181923,[[x-87,y-58],[x-52,y-125],[x+51,y-125],[x+85,y-59],[x+75,y-48],[x-78,y-48]])
 polygon(g,tone,[[x-80,y-61],[x-48,y-120],[x+49,y-120],[x+80,y-61]])
 for(let row=0;row<8;row++){
  const span=50+row*4, by=y-119+row*8
  ink(g,color(tone,0x191a24,.33),x-span,by+6,span*2,2)
  for(let col=-span+4;col<span-9;col+=11)ink(g,color(tone,0xba9a8a,r()*.22),x+col+(row%2)*4,by,8,4,.73)
 }
 ink(g,0x908077,x-78,y-59,156,3);ink(g,0x332734,x-79,y-55,158,5)
 ink(g,0x251d26,x-14,y-35,28,36);ink(g,0x342832,x-10,y-32,20,32)
 ink(g,0x9f7851,x+5,y-15,3,3)
 for(const dx of [-46,35]){
  oval(g,0xef9c52,x+dx+6,y-28,62,46,.075)
  ink(g,0x28222b,x+dx-3,y-43,20,21);ink(g,0xbd6e43,x+dx,y-40,14,14)
  ink(g,0xf6c575,x+dx+2,y-38,10,10);ink(g,0x71503d,x+dx+6,y-41,2,16);ink(g,0x71503d,x+dx,y-34,14,2)
 }
}
function fountain(g:Phaser.GameObjects.Graphics,x:number,y:number){
 oval(g,0x131720,x,y+9,118,53,.5)
 oval(g,0x262836,x,y+1,106,54)
 oval(g,0x777082,x,y-5,106,52)
 oval(g,0xb0958d,x,y-7,99,45)
 oval(g,0x252b3c,x,y-7,86,35)
 oval(g,0x365d66,x,y-7,75,29)
 for(let i=0;i<9;i++)ink(g,i%2?0x779c99:0x4d777e,x-31+i*7,y-8+Math.sin(i*2)*8,5+(i%3)*2,1)
 ink(g,0x252932,x-8,y-35,16,31);ink(g,0x8c8594,x-6,y-39,12,33)
 oval(g,0x444959,x,y-39,39,13);oval(g,0x8b8497,x,y-43,35,9)
 ink(g,0xafaaa8,x-3,y-60,6,18);ink(g,0xbecee0,x-1,y-61,2,6)
 for(const d of [-1,1])for(let i=0;i<6;i++)ink(g,0x87b8c5,x+d*(13+i*1.5),y-42+i*i*.8,2,2,.8)
}
function gate(g:Phaser.GameObjects.Graphics,x:number,y:number,c:number){
 for(let i=6;i>0;i--)oval(g,c,x,y-14,38+i*13,30+i*10,.023)
 oval(g,0x141724,x,y+3,87,34,.72)
 for(const side of [-1,1]){
  ink(g,0x433d51,x+side*26-8,y-63,15,61);ink(g,0x857587,x+side*26-8,y-64,4,62)
  for(let i=0;i<5;i++)ink(g,0x272738,x+side*26-7,y-58+i*12,14,2)
 }
 g.lineStyle(10,0x726379).beginPath().arc(x,y-61,26,Math.PI,2*Math.PI).strokePath()
 g.lineStyle(2,c,.8).beginPath().arc(x,y-59,20,Math.PI,2*Math.PI).strokePath()
 oval(g,c,x,y-34,35,64,.18)
 for(let i=0;i<8;i++)ink(g,c,x-14+(i*17)%31,y-65+i*8,2,4,.5)
 oval(g,c,x,y,58,17,.24);g.lineStyle(1,c,.75).strokeEllipse(x,y,56,16)
}
export function drawWorld(scene:Phaser.Scene,zone:number){
 const g=scene.add.graphics(), r=rng(540+zone*127), [, ,ground,dark,accent]=zones[zone], obstacles:Obstacle[]=[]
 const settlement=safeZone(zone)
 const organic=settlement||zone===1||zone===2||zone===10
 const path=(x:number,y:number)=>Math.abs(y-535-Math.sin(x/165)*12)<(settlement?52:32)
 const plaza=(x:number,y:number)=>settlement&&x>486&&x<1110&&y>290&&y<727
 ink(g,dark,0,0,WIDTH,HEIGHT)
 for(let y=0;y<HEIGHT;y+=16)for(let x=0;x<WIDTH;x+=16){
  const u=r(), near=path(x,y), square=plaza(x,y)
  let tile=color(dark,ground,.3+u*.7)
  if(near||square)tile=color(settlement?0x3c3740:ground,settlement?0x6b5660:0x9c755b,(near?.37:.13)+u*.2)
  ink(g,tile,x,y,16,16)
  if(near||square){
   const shift=(y%32)/4
   ink(g,color(tile,0x201d2a,.37),x,y+15,16,1,.62)
   ink(g,color(tile,0x201d2a,.35),x+shift,y,1,15,.54)
   if(u>.58)ink(g,color(tile,0xb2a6a0,.26),x+3+shift,y+2,7,1,.61)
  }else if(u>.28){
   if(organic)grass(g,x+3+r()*10,y+3+r()*9,color(ground,settlement?0x7b7162:0x80a969,.36),u)
   else{ink(g,color(ground,accent,.16),x+5,y+5,4,2,.6);ink(g,dark,x+8,y+7,5,2,.8)}
  }
 }
 if(zone===10){
  for(let x=128;x<1300;x+=5){
   const y=239+Math.sin(x/149)*17
   ink(g,0x182831,x,y-25,5,53)
   ink(g,color(0x294c50,0x4d7270,r()*.63),x,y-19,5,39)
   if(r()>.45)ink(g,0x7a9279,x,y+13-r()*26,5,2,.44)
  }
 }
 const props:{x:number;y:number;s:number}[]=[]
 for(let i=0;i<230;i++){
  const x=25+r()*(WIDTH-50),y=35+r()*(HEIGHT-55)
  if(zone===10&&Math.abs(y-239-Math.sin(x/149)*17)<36||path(x,y)||plaza(x,y)||Math.hypot(x-refuge.x,y-refuge.y)<86||Math.hypot(x-chest.x,y-chest.y)<63||Math.hypot(x-secret.x,y-secret.y)<64||Math.hypot(x-1200,y-590)<105)continue
  if(props.some(p=>Math.hypot(p.x-x,p.y-y)<42))continue
  props.push({x,y,s:.55+r()*.64})
 }
 for(const {x,y,s} of props.sort((a,b)=>a.y-b.y)){
  if(organic&&r()>.18)pine(g,x,y,s,color(settlement?0x344744:0x344e44,ground,r()*.5),r)
  else if(zone===3){
   oval(g,0x171a24,x,y+1,38*s,13*s,.5)
   ink(g,0x38394a,x-10*s,y-26*s,20*s,30*s);ink(g,0x626276,x-8*s,y-29*s,15*s,25*s)
   ink(g,0x353244,x-4*s,y-19*s,7*s,2*s);ink(g,0x353244,x-1*s,y-22*s,2*s,10*s)
  }else stone(g,x,y,s,color(ground,accent,.22))
  obstacles.push({x,y:y-5,r:12*s})
 }
 if(settlement){
  for(const [x,y,c] of [[568,424,0x514653],[752,401,0x53465d],[944,420,0x61434b],[1054,648,0x574254],[519,650,0x55424d]]){
   house(g,x,y,c,r);obstacles.push({x,y:y-24,r:37})
  }
  fountain(g,774,510);obstacles.push({x:774,y:501,r:35})
  for(const [x,y] of [[475,487],[1120,487],[508,583],[1063,560],[638,480],[912,480],[631,606],[911,606]])torch(g,x,y)
  for(const [x,y] of [[567,384],[755,353],[943,372],[520,611],[1054,600]]){
   for(let i=0;i<4;i++)ink(g,0x1b1c24,x-60+i*4,y+10+i*4,12,2,.6)
   ink(g,0xa48562,x+26,y+10,12,15,.77);ink(g,0x695047,x+28,y+11,8,14)
  }
  for(let i=0;i<10;i++){
   const x=559+i*46
   ink(g,0x1c2029,x,700,35,6);ink(g,0x625762,x,696,33,5);ink(g,0x4b414d,x+2,701,7,7)
  }
 }else{
  for(let i=0;i<7;i++){
   const x=257+i*152,y=512+Math.sin(i*3)*52
   if(zone===5){oval(g,0xff7044,x,y+80,83,25,.23);ink(g,0xda6546,x-28,y+75,55,4,.64)}
   torch(g,x,y,accent)
  }
  if(zone===2){
   for(const [x,y] of [[626,445],[717,409],[789,652],[888,647],[996,437]]){
    polygon(g,0x211b23,[[x-36,y],[x,y-64],[x+36,y],[x,y+8]])
    polygon(g,0x7e4d45,[[x-32,y-2],[x,y-57],[x+30,y-2],[x,y+4]])
    polygon(g,0x482d31,[[x,y-57],[x+30,y-2],[x,y+4]])
    ink(g,0xe6a373,x-1,y-60,2,63);obstacles.push({x,y:y-8,r:19})
   }
  }
  if(zone===9||zone>=11){
   for(const [x,y] of [[551,461],[723,457],[1037,457],[1251,464],[604,624],[822,641],[1001,625]]){
    oval(g,0x151724,x+11,y+4,68,20,.68)
    ink(g,0x25252e,x-15,y-77,32,79);ink(g,0x64737a,x-12,y-70,24,66)
    ink(g,0x99a7a3,x-11,y-69,5,62);ink(g,0x454954,x+4,y-68,7,63)
    for(let i=0;i<6;i++)ink(g,0x353a48,x-12,y-64+i*10,23,2,.74)
    ink(g,0x92958f,x-18,y-72,36,7);ink(g,0x52555c,x-19,y-5,38,9)
    obstacles.push({x,y:y-5,r:18})
   }
  }
  if(zone>=4){
   const c=zone===5?0xff8a55:zone===7?0xdc728b:accent
   for(const [x,y] of [[579,436],[756,668],[936,434],[1113,665],[1241,362]]){
    for(let j=6;j>0;j--)oval(g,c,x,y,16+j*12,12+j*6,.034)
    for(const dx of [-17,0,15]){
     const h=dx===0?39:23
     polygon(g,0x261c31,[[x+dx-10,y],[x+dx-6,y-h+8],[x+dx,y-h],[x+dx+8,y-4],[x+dx+6,y+3]])
     polygon(g,color(ground,c,.65),[[x+dx-7,y-3],[x+dx,y-h+4],[x+dx+5,y-7],[x+dx+1,y]])
     ink(g,color(c,0xffdfbe,.44),x+dx-1,y-h+6,2,10,.7)
    }
    obstacles.push({x,y,r:20})
   }
  }
  for(let i=0;i<10;i++){
   const a=i*Math.PI/5
   stone(g,refuge.x+Math.cos(a)*63,refuge.y+Math.sin(a)*44,.6,color(ground,accent,.43))
  }
  oval(g,accent,refuge.x,refuge.y,102,61,.12)
  g.lineStyle(1,accent,.56).strokeEllipse(refuge.x,refuge.y,86,53)
  gate(g,secret.x,secret.y,accent)
 }
 gate(g,entry.x,entry.y,0x76b1c2);gate(g,exit.x,exit.y,accent)
 if(!scene.textures.exists('map-'+zone))g.generateTexture('map-'+zone,WIDTH,HEIGHT)
 g.destroy()
 const world=scene.add.image(0,0,'map-'+zone).setOrigin(0).setDepth(-2)
 return {world,obstacles}
}
export type Pose='idle'|'walk'|'run'|'attack'|'cast'|'hurt'|'dead'
const variants=[
 ['..bb....bb..','...b....b...','...bbbbbb...','..bbbbbbbb..','..bwbbbbwb..','..bbbbbbbb..','...bddddb...','....dddd....'],
 ['....bbbb....','...bbbbbb...','..bbbbbbbb..','..bwbwbwbb..','..bbbbbbbb..','..bdbdddbb..','..dddddddd..','...d.d.dd...'],
 ['..b......b..','..bb....bb..','...bbbbbb...','..bwb..bwb..','..bbbbbbbb..','...dddddd...','...dd.ddd...','..dd...ddd..'],
 ['..bb....bb..','...bbbbbb...','..bbbbbbbb..','..bwbbbbwb..','..bbbbbbbb..','...bwwwwb...','...dddddd...','..dddddddd..'],
 ['.....bb.....','....bbbb....','...bbbbbb...','..bbbbbbbb..','.....bwb....','....bbbbb...','..dddbbddd..','...dddddd...'],
 ['.b........b.','.bb......bb.','..b.bbbb.b..','...bbbbbb...','..bwbwwbwb..','.bbbbbbbbbb.','..ddd..ddd..','....dddd....']
]
export function sprite(g:Phaser.GameObjects.Graphics,x:number,y:number,c:number,kind:number,pose:Pose,frame:number,facing:number,big=false,transformed=false){
 const s=big?4:2.5, phase=frame%2===0?1:-1
 const bob=pose==='walk'||pose==='run'?phase*2:pose==='attack'?-4:pose==='cast'?-3:pose==='hurt'?2:Math.sin(frame*.6)
 const thrust=pose==='attack'?facing*7:pose==='hurt'?-facing*3:0
 const body=pose==='hurt'?0xffb0a5:c, shadow=color(body,0x151523,.57), highlight=color(body,0xffe6c1,.43)
 oval(g,0x11141b,x,y+2,big?57:32,big?20:12,.65)
 if(kind<5&&!transformed){drawAdventurer(g,x,y,c,kind,pose,frame,facing);return}
 if(pose==='dead'){ink(g,shadow,x-12,y-4,25,5);ink(g,body,x-9,y-8,18,4);return}
 y+=bob
 x+=thrust
 const left=x-6*s, top=y-16*s
 if(kind>=5||transformed){
  const glyph=variants[transformed?kind-6:kind%variants.length]
  glyph.forEach((row,ry)=>Array.from(row).forEach((p,rx)=>{
   if(p!=='.')ink(g,p==='w'?0xffe0a2:p==='d'?shadow:body,left+rx*s,top+ry*s+5*s,Math.ceil(s),Math.ceil(s))
  }))
  if(kind%4!==1){
   ink(g,shadow,x-8*s,y-4*s,4*s,2*s);ink(g,shadow,x+4*s,y-4*s,4*s,2*s)
   ink(g,body,x-6*s,y-2*s+phase,3*s,2*s);ink(g,body,x+3*s,y-2*s-phase,3*s,2*s)
  }
  ink(g,highlight,x-3*s,y-10*s,4*s,1*s,.8)
  for(let i=0;i<4;i++){
   const side=i%2?1:-1, dx=x+side*(4+i%3)*s
   g.lineStyle(1,highlight,.6).lineBetween(dx,y-(4+i)*s,dx+side*4,y-(6+i)*s)
  }
  if(pose==='cast')oval(g,highlight,x,y-19*s,18,7,.53)
  if(big){
   polygon(g,shadow,[[x-14,y-33],[x-32,y-59],[x-41,y-48],[x-51,y-52],[x-36,y-28],[x-19,y-19]])
   polygon(g,shadow,[[x+14,y-33],[x+32,y-59],[x+41,y-48],[x+51,y-52],[x+36,y-28],[x+19,y-19]])
   g.lineStyle(1,highlight,.65).lineBetween(x-15,y-30,x-35,y-55).lineBetween(x+15,y-30,x+35,y-55)
   oval(g,0xffcd90,x-8,y-31,4,2);oval(g,0xffcd90,x+8,y-31,4,2)
  }
  return
 }
}
