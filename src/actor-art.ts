import Phaser from 'phaser'

type Graphics=Phaser.GameObjects.Graphics
type Pose='idle'|'walk'|'run'|'attack'|'cast'|'hurt'|'dead'
const shade=(c:number,k:number)=>Phaser.Display.Color.GetColor(
 Math.min(255,Math.round((c>>16)*k)),Math.min(255,Math.round(((c>>8)&255)*k)),Math.min(255,Math.round((c&255)*k))
)

export function drawAdventurer(g:Graphics,x:number,y:number,color:number,job:number,pose:Pose,frame:number,facing:number){
 const s=1.16
 const stride=pose==='run'?7:pose==='walk'?4:0
 const gait=Math.sin(frame*Math.PI/3)*stride
 const bob=pose==='run'?-Math.abs(gait)*.44:stride?-Math.abs(gait)*.25:Math.sin(frame*.37)*.75
 const strike=pose==='attack', cast=pose==='cast', fall=pose==='dead'
 const tilt=strike?4:pose==='hurt'?-4:pose==='run'?2:0
 const transform=(px:number,py:number)=>fall
  ?new Phaser.Math.Vector2(x+py*s*.65,y+px*s*.26-3)
  :new Phaser.Math.Vector2(x+(px+tilt*(1-Math.max(0,Math.min(1,py/24))))*s*facing,y+(py-42+bob)*s)
 const poly=(c:number,shape:number[][],outline=0x16151d)=>{
  const points=shape.map(([px,py])=>transform(px,py))
  g.fillStyle(c).fillPoints(points,true)
  if(outline)g.lineStyle(.9,outline,.88).strokePoints(points,true)
 }
 const line=(c:number,width:number,shape:number[][])=>g.lineStyle(width,c,.94).strokePoints(shape.map(([px,py])=>transform(px,py)),false)
 const oval=(c:number,px:number,py:number,w:number,h:number)=>{
  const point=transform(px,py)
  g.fillStyle(c).fillEllipse(point.x,point.y,w*s,h*s)
 }
 const steel=pose==='hurt'?0xf7ac9c:color
 const cloth=shade(steel,.44), plate=shade(steel,.81), gleam=shade(steel,1.28), trim=job===4?0xf4cd87:0x9c8073
 const skin=0xd3a07f, shadeSkin=0x986753
 const cape=job!==1
 if(cape){
  const wave=Math.sin(frame*.78)*(stride?4:2), length=job===2?42:37
  poly(cloth,[[-8,15],[4,14],[6+wave,length],[-3+wave,length-2],[-13+wave,length+3],[-12,24]])
  line(plate,1.1,[[-9,19],[-9+wave,length-2],[-4+wave,length-7]])
 }
 for(const side of [-1,1]){
  const foot=side*5+gait*side*.41, leg=side*4
  poly(side<0?cloth:plate,[[leg-4,28],[leg+3,29],[foot+3,37],[foot-3,40]])
  poly(shade(steel,.36),[[foot-3,36],[foot+3,36],[foot+6,41],[foot+5,43],[foot-4,43]])
  line(trim,.8,[[foot-2,37],[foot+2,37],[foot+4,40]])
 }
 poly(cloth,[[-8,15],[7,14],[11,20],[7,28],[8,34],[-9,34],[-7,27],[-11,21]])
 poly(plate,[[-8,16],[1,15],[8,17],[7,24],[4,29],[-5,28],[-8,22]])
 poly(shade(steel,.99),[[-5,16],[0,17],[5,16],[6,22],[0,25],[-6,22]],0)
 line(gleam,1,[[-6,17],[-2,18],[0,20],[4,18]])
 for(const py of [25,28,32])line(py===28?trim:shade(steel,1.05),1,[[-6,py],[0,py+1],[5,py]])
 poly(trim,[[-1,27],[2,27],[3,29],[1,31],[-2,29]])
 for(const side of [-1,1]){
  const extend=side>0&&strike?13:side>0&&cast?7:0, lift=side>0&&cast?-11:side>0&&strike?-4:0
  const h=side*11+extend, hy=27+lift+gait*side*.3
  poly(side>0?plate:cloth,[[side*7,16],[side*13,18],[side*13,22],[side*8,24],[side*6,21]])
  line(gleam,.9,[[side*7,17],[side*11,18],[side*13,20]])
  poly(cloth,[[side*9,21],[side*12,21],[h+1,hy],[h-2,hy+2],[side*8,25]])
  oval(skin,h,hy,4.5,4)
 }
 poly(shadeSkin,[[-3,10],[4,10],[3,16],[-3,16]])
 poly(skin,[[-5,4],[4,3],[7,7],[6,12],[3,15],[-3,13],[-5,9]])
 poly(shadeSkin,[[3,7],[7,7],[6,12],[3,15],[2,11]],0)
 line(0x221c23,1,[[2,8],[5,8]])
 if(job===0||job===4){
  poly(plate,[[-7,4],[-4,0],[2,-1],[7,2],[8,7],[4,8],[3,5],[-3,6],[-4,11],[-7,10]])
  line(gleam,1.2,[[-6,4],[-3,1],[2,1],[6,3]])
  poly(trim,[[-1,0],[1,-3],[3,-2],[3,4],[1,6]])
 }else{
  poly(cloth,[[-7,5],[-4,0],[0,-2],[6,1],[8,5],[5,6],[2,4],[-3,7],[-4,13],[-8,15]])
  line(gleam,1.1,[[-6,5],[-3,2],[1,0],[5,2]])
  if(job===3)poly(cloth,[[-4,10],[6,10],[4,15],[0,15]])
  if(job===1)poly(skin,[[3,8],[9,5],[7,10],[3,11]])
 }
 const wx=strike?24:cast?18:11, wy=cast?16:strike?23:28
 if(job===1){
  line(0x422731,3,[[wx-3,wy-13],[wx+2,wy-10],[wx+5,wy-3],[wx+5,wy+4],[wx-2,wy+12]])
  line(trim,1,[[wx-3,wy-13],[wx+2,wy-10],[wx+5,wy-3],[wx+5,wy+4],[wx-2,wy+12]])
  line(0xe0cbb2,.75,[[wx-3,wy-13],[wx-(strike?7:3),wy],[wx-2,wy+12]])
 }else if(job===2){
  line(0x211624,4,[[wx-3,wy+12],[wx+2,wy-13]])
  line(0xa47558,1.6,[[wx-3,wy+12],[wx+2,wy-13]])
  poly(plate,[[wx+2,wy-20],[wx+7,wy-16],[wx+3,wy-10],[wx-2,wy-15]])
  line(gleam,1,[[wx+2,wy-18],[wx+4,wy-16],[wx+2,wy-12]])
 }else{
  const blade=job===3?9:job===4?11:15
  poly(0xc9c1b5,[[wx-1,wy-2],[wx+2,wy-5],[wx+blade,wy-blade-4],[wx+blade+2,wy-blade-1],[wx+4,wy-2]])
  line(0xf4ded0,1,[[wx+2,wy-4],[wx+blade,wy-blade-3]])
  line(trim,2,[[wx-2,wy-6],[wx+4,wy+1]])
  if(job===0||job===4){
   poly(cloth,[[-17,20],[-12,17],[-7,20],[-7,28],[-12,33],[-17,29]])
   line(trim,1.2,[[-16,21],[-12,19],[-8,21],[-8,27],[-12,31],[-16,28],[-16,21]])
   line(gleam,1.1,[[-12,21],[-12,28]])
  }else{
   poly(0xa9a2b7,[[-12,28],[-9,29],[-15,38],[-16,34]])
  }
 }
}
