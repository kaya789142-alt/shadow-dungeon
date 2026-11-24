import type Phaser from 'phaser'
import type { Point } from './navigation'

type Label={node:HTMLSpanElement;point:Point;start?:number}
export class WorldText {
 private staticLabels:Label[]=[]
 private floating:Label[]=[]
 private focus:Label
 constructor(private layer:HTMLElement){
  this.focus={node:this.node('focus'),point:{x:0,y:0}}
  this.focus.node.hidden=true
 }
 private node(style:string,text='',color=''){
  const node=document.createElement('span')
  node.className='world-text '+style
  node.textContent=text
  node.style.color=color
  this.layer.append(node)
  return node
 }
 reset(){
  for(const entry of [...this.staticLabels,...this.floating])entry.node.remove()
  this.staticLabels=[];this.floating=[];this.focus.node.hidden=true
 }
 label(point:Point,text:string,color:string){
  this.staticLabels.push({node:this.node('',text,color),point})
 }
 damage(point:Point,text:string,color:string,critical:boolean,clock:number){
  if(this.floating.length>=22)this.floating.shift()?.node.remove()
  this.floating.push({node:this.node(critical?'damage critical':'damage',text,color),point:{x:point.x,y:point.y-56},start:clock})
 }
 target(point?:Point,text=''){
  this.focus.node.hidden=!point
  if(!point)return
  this.focus.point=point
  if(this.focus.node.textContent!==text)this.focus.node.textContent=text
 }
 update(camera:Phaser.Cameras.Scene2D.Camera,elapsed:number){
  const zoom=camera.zoom, width=camera.width, height=camera.height
  // Phaser zooms around the camera viewport centre.
  const originX=camera.scrollX+width/2, originY=camera.scrollY+height/2
  const project=(point:Point)=>({
   x:(point.x-originX)*zoom+width/2,
   y:(point.y-originY)*zoom+height/2
  })
  const place=(label:Label,x:number,y:number)=>{
   label.node.style.transform=`translate3d(${Math.round(x)}px,${Math.round(y)}px,0) translate(-50%,-50%)`
  }
  for(const entry of [...this.staticLabels,...(this.focus.node.hidden?[]:[this.focus])]){
   const {x,y}=project(entry.point)
   entry.node.style.visibility=x<55||x>width-55||y<16||y>height-16?'hidden':'visible'
   place(entry,x,y)
  }
  this.floating=this.floating.filter(entry=>{
   const time=(elapsed-entry.start!)/.76
   if(time>=1){entry.node.remove();return false}
   const point=project(entry.point)
   entry.node.style.opacity=String(1-Math.max(0,(time-.36)/.64))
   place(entry,point.x,point.y-time*48)
   return true
  })
 }
}
