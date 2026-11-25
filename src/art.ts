import Phaser from 'phaser'
import { landNeighbor, onRoad, roadY, regionWidth, regionHeight } from './overworld'
import { safeZone, zones } from './data'

import { cobble, roofMaterial } from './terrain-material'

export const WIDTH=regionWidth, HEIGHT=regionHeight, TILE=32
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
 const propsArt:{name:string;x:number;y:number;height:number;width?:number;mirror?:boolean}[]=[]
 const cottages=['cottage-blue','cottage-green','cottage-red','cottage-blue','cottage-red']
 const has=(name:string)=>scene.textures.exists(name)
 const settlement=safeZone(zone)
 const organic=settlement||zone===1||zone===2||zone===10
 const path=(x:number,y:number)=>Math.min(x,WIDTH-x)<172?onRoad(y):
  Math.abs(y-roadY-Math.sin(x/165)*12*Math.min(1,(Math.min(x,WIDTH-x)-172)/104))<(settlement?52:36)
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
  if(organic&&r()>.18){
   const shade=color(settlement?0x344744:0x344e44,ground,r()*.5)
   if(has('spruce')){
    const oak=has('oak')&&(Math.round(x*19+y*17)%5<2)
    propsArt.push({name:oak?'oak':'spruce',x,y,height:(oak?96:103)*s,width:(oak?98:77)*s,mirror:x%2>1})
    for(let i=0;i<40;i++)r()
   }else pine(g,x,y,s,shade,r)
  }
  else if(zone===3&&has('tomb'))propsArt.push({name:'tomb',x,y,height:43*s,width:39*s,mirror:x%2>1})
  else if(zone===3){
   oval(g,0x171a24,x,y+1,38*s,13*s,.5)
   ink(g,0x38394a,x-10*s,y-26*s,20*s,30*s);ink(g,0x626276,x-8*s,y-29*s,15*s,25*s)
   ink(g,0x353244,x-4*s,y-19*s,7*s,2*s);ink(g,0x353244,x-1*s,y-22*s,2*s,10*s)
  }else if(has('boulder'))propsArt.push({name:'boulder',x,y,height:36*s,width:45*s,mirror:x%2>1})
  else stone(g,x,y,s,color(ground,accent,.22))
  obstacles.push({x,y:y-5,r:12*s})
 }
 if(settlement){
  const houses=[[568,424,0x514653],[752,401,0x53465d],[944,420,0x61434b],[1054,648,0x574254],[519,650,0x55424d]]
  for(const [index,[x,y,c]] of houses.entries()){
   const name=cottages[index]
   if(has(name))propsArt.push({name,x,y,height:144,width:155,mirror:index===2||index===4})
   else house(g,x,y,c,r)
   obstacles.push({x,y:y-24,r:37})
  }
  if(has('fountain'))propsArt.push({name:'fountain',x:774,y:513,height:119,width:124})
  else fountain(g,774,510)
  obstacles.push({x:774,y:501,r:35})
  for(const [x,y] of [[487,454],[565,474],[710,439],[840,445],[925,467],[1095,522],[594,674],[646,673],[947,673]]){
   const d=rng(x+y)
   for(let i=0;i<22;i++){
    const px=x+(d()-.5)*28,py=y+(d()-.5)*16
    ink(g,i%3?0x526b46:0x819565,px,py,1,3)
    if(i%6===0)oval(g,i%2?0xf0c67c:0xe89aa0,px,py-1,3,2,.86)
   }
  }
  for(const [x,y,col] of [[508,483,0xa6514a],[1063,560,0x475b85]]){
   ink(g,0x514137,x,y-42,3,44)
   polygon(g,col,[[x+2,y-39],[x+27,y-37],[x+23,y-27],[x+28,y-18],[x+2,y-21]])
   g.lineStyle(1,0xc3a978,.6).lineBetween(x+3,y-35,x+23,y-34)
  }
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
  if(has('arch'))propsArt.push({name:zone>=4&&has('dungeon-arch')?'dungeon-arch':'arch',...secret,height:98,width:84})
 }
 gate(g,entry.x,entry.y,0x76b1c2);gate(g,exit.x,exit.y,accent)
 if(has('arch'))for(const point of [entry,exit])propsArt.push({name:zone>=4&&has('dungeon-arch')?'dungeon-arch':'arch',...point,height:103,width:88})
 const key='map-'+zone
 const texture=scene.textures.createCanvas(key,WIDTH*2,HEIGHT*2)!
 g.setScale(2).generateTexture(key,WIDTH*2,HEIGHT*2)
 g.destroy()
 const c=texture.getContext(), detail=rng(1996+zone*61)
 c.save();c.scale(2,2)
 // Overlay brush detail on the baked geometry; simulation, obstacles and portals remain in logical coordinates.
 for(let i=0;i<10_000;i++){
  const x=detail()*WIDTH,y=detail()*HEIGHT
  if(!path(x,y)&&!plaza(x,y)){
   c.fillStyle=detail()>.56?'#bfc5a51d':'#0e191724'
   c.fillRect(x,y,1+detail()*2,.6+detail()*1.4)
  }
 }
 // Both sides meet with the same trail materials, blending their local palettes inward.
 for(const direction of [-1,1] as const){
  if(landNeighbor(zone,direction)===undefined)continue
  const edge=direction<0?0:WIDTH, inner=edge-direction*112
  for(const [top,height,rgb] of [[0,roadY-48,'43,51,43'],
   [roadY-48,96,'91,81,68'],[roadY+48,HEIGHT-roadY-48,'43,51,43']] as const){
   const blend=c.createLinearGradient(edge,0,inner,0)
   blend.addColorStop(0,'rgba('+rgb+',1)')
   blend.addColorStop(.44,'rgba('+rgb+',.56)')
   blend.addColorStop(1,'rgba('+rgb+',0)')
   c.fillStyle=blend
   c.fillRect(Math.min(edge,inner),top,112,height)
  }
 }
 c.globalAlpha=.58
 if(!organic&&zone!==3){
  c.lineCap='round'
  for(let i=0;i<80;i++){
   const x=detail()*WIDTH,y=detail()*HEIGHT
   if(path(x,y))continue
   c.beginPath();c.moveTo(x,y)
   c.lineTo(x+detail()*14,y+detail()*8-4);c.lineTo(x+19,y-2+detail()*12)
   c.strokeStyle=i%2?'#14151f69':'#9aacc32a';c.lineWidth=detail()*1.1+.4;c.stroke()
  }
 }
 for(const edge of [0,WIDTH-44]){
  for(let i=0;i<6;i++)cobble(c,edge+3,roadY-44+i*15,42,15,.86,detail)
 }
 for(let y=473;y<599;y+=9)for(let x=-10+(Math.floor(y/9)%2)*12;x<WIDTH;x+=24){
  if(!path(x+12,y+4)||settlement&&x>480&&x<1120||x<177||x>1337)continue
  cobble(c,x+detail()*2-1,y+detail()*1.7-1,21+detail()*3,8,.72,detail)
 }
 if(settlement){
  for(let y=458;y<599;y+=8)for(let x=475+(Math.floor(y/8)%2)*11;x<1120;x+=23){
   if(Math.hypot(x-774,y-501)<56||[[475,487],[638,480],[912,480],[1120,487],[508,583],[1063,560]].some(([tx,ty])=>Math.hypot(x-tx,y-ty)<17))continue
   cobble(c,x+detail()*2-1,y+detail()*1.4-1,21+detail()*2,7.5,.76,detail)
  }
  if(!has(cottages[0]))for(const [x,y] of [[568,424],[752,401],[944,420],[1054,648],[519,650]])roofMaterial(c,x,y,detail)
 }
 c.globalAlpha=1
 c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high'
 for(const prop of propsArt.sort((a,b)=>a.y-b.y)){
  const source=scene.textures.get(prop.name).getSourceImage()
  if(!(source instanceof HTMLImageElement))continue
  const width=prop.width??prop.height*source.width/source.height
  c.save();c.translate(prop.x,prop.y)
  const shadow=c.createRadialGradient(3,2,0,3,2,width*.42)
  shadow.addColorStop(0,'#080b0e80');shadow.addColorStop(1,'#080b0e00')
  c.save();c.scale(1,.31);c.fillStyle=shadow;c.fillRect(-width*.6,-width*.44,width*1.2,width);c.restore()
  if(prop.mirror)c.scale(-1,1)
  c.drawImage(source,-width*.5,-prop.height,width,prop.height)
  c.restore()
 }
 c.restore()
 texture.refresh()
 const world=scene.add.image(0,0,key).setOrigin(0).setDisplaySize(WIDTH,HEIGHT).setDepth(-2)
 return {world,obstacles}
}
export type Pose='idle'|'walk'|'run'|'attack'|'cast'|'hurt'|'dead'
