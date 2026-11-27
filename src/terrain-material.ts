type Point=[number,number]
const tint=(hex:number,alpha:number)=>`rgba(${hex>>16},${hex>>8&255},${hex&255},${alpha})`
function shape(c:CanvasRenderingContext2D,points:Point[]){
 c.beginPath()
 points.forEach(([x,y],i)=>i===0?c.moveTo(x,y):c.lineTo(x,y))
 c.closePath()
}
export function cobble(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,shade:number,r:()=>number){
 const contour:Point[]=[[x+2,y+1],[x+w-4,y],[x+w-1,y+3],[x+w,y+h-3],[x+w-3,y+h],[x+3,y+h],[x,y+h-2],[x,y+3]]
 shape(c,contour)
 const gradient=c.createLinearGradient(x,y,x+3,y+h)
 gradient.addColorStop(0,tint(0xad9f88,.43*shade))
 gradient.addColorStop(.28,tint(0x827e76,.3*shade))
 gradient.addColorStop(.86,tint(0x191923,.29))
 gradient.addColorStop(1,tint(0x16151b,.65))
 c.fillStyle=gradient;c.fill()
 c.strokeStyle=tint(0x262329,.45);c.lineWidth=.55;c.stroke()
 c.fillStyle=tint(0xbab197,.24)
 for(let i=0;i<4;i++)c.fillRect(x+3+r()*(w-8),y+2+r()*(h-3),.8+r()*2,.36+r()*.5)
 if(r()>.81){
  c.beginPath();c.moveTo(x+w*.3,y+1);c.lineTo(x+w*.5,y+h*.42);c.lineTo(x+w*.49,y+h*.68);c.lineTo(x+w*.64,y+h)
  c.strokeStyle=tint(0x282329,.62);c.lineWidth=.45;c.stroke()
 }
}
export function roofMaterial(c:CanvasRenderingContext2D,x:number,y:number,r:()=>number){
 c.save()
 shape(c,[[x-80,y-61],[x-48,y-120],[x+49,y-120],[x+80,y-61]])
 c.clip()
 const ridge=c.createLinearGradient(x,y-120,x,y-59)
 ridge.addColorStop(0,tint(0xb9a391,.27));ridge.addColorStop(.48,tint(0x68586b,.1));ridge.addColorStop(1,tint(0x1d171b,.48))
 c.fillStyle=ridge;c.fillRect(x-85,y-123,170,66)
 for(let row=0;row<11;row++){
  const ty=y-121+row*5.65
  for(let col=0;col<15;col++){
   const tx=x-87+col*11.7+(row%2)*5.85
   c.beginPath();c.roundRect(tx,ty,11.4,5.6,[.7,.7,2,2])
   c.fillStyle=tint(r()>.64?0xc29c80:0x201921,.12+r()*.23);c.fill()
   c.strokeStyle=tint(0xdac4a1,.16+r()*.15);c.lineWidth=.55;c.stroke()
   c.beginPath();c.moveTo(tx+1.2,ty+3.9);c.quadraticCurveTo(tx+5,ty+5.4,tx+10,ty+4)
   c.strokeStyle=tint(0x231b22,.43);c.stroke()
  }
 }
 c.restore()
 for(const offset of [-59,-31,30,56]){
  for(let i=0;i<3;i++){
   c.beginPath()
   c.moveTo(x+offset+i*1.1,y-50);c.bezierCurveTo(x+offset+i-1,y-33,x+offset+i+2,y-21,x+offset+i,y-1)
   c.strokeStyle=tint(i===1?0xa88461:0x1d1819,.35);c.lineWidth=.5;c.stroke()
  }
 }
 for(const offset of [-46,35]){
  const glow=c.createRadialGradient(x+offset+6,y-32,1,x+offset+6,y-32,29)
  glow.addColorStop(0,tint(0xffc284,.21));glow.addColorStop(1,tint(0xff9144,0))
  c.fillStyle=glow;c.fillRect(x+offset-24,y-62,60,60)
 }
}

export function groundPatches(c:CanvasRenderingContext2D,zone:number,available:(x:number,y:number)=>boolean,random:()=>number){
 for(let i=0;i<250;i++){
  const x=138+random()*1224,y=94+random()*836
  if(!available(x,y))continue
  const green=random()>.44
  const radius=12+random()*30
  const wash=c.createRadialGradient(x,y,0,x,y,radius)
  const color=green?(zone===0?0x697a4a:0x71845a):0x9d7c58
  wash.addColorStop(0,tint(color,green?.26:.21))
  wash.addColorStop(1,tint(color,0))
  c.fillStyle=wash;c.fillRect(x-radius,y-radius,radius*2,radius*2)
  if(!green)continue
  c.strokeStyle=tint(0x9ca56a,.29)
  c.lineWidth=.65;c.beginPath()
  for(let blade=0;blade<9;blade++){
   const gx=x+(random()-.5)*radius,gy=y+(random()-.5)*radius*.5
   c.moveTo(gx,gy);c.quadraticCurveTo(gx-1,gy-2,gx+(random()-.5)*5,gy-3-random()*5)
  }
  c.stroke()
 }
}
