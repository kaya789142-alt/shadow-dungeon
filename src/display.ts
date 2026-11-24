import type Phaser from 'phaser'

export type Detail='balanced'|'high'|'ultra'

export function backingRatio(detail:Detail,dpr:number,width:number,height:number,reduced=false){
 const cap=detail==='ultra'&&!reduced?2.5:detail==='high'&&!reduced?2:1
 const budget=detail==='ultra'?4_000_000:2_800_000
 return Math.max(1,Math.min(cap,dpr,Math.sqrt(budget/Math.max(1,width*height))))
}

export class DisplayResolution {
 ratio=1
 reduced=false
 private slow=0
 private width=0
 private height=0
 private frame=0
 private readonly observer:ResizeObserver
 private readonly scene:Phaser.Scene
 private readonly host:HTMLElement
 private readonly preference:()=>Detail
 private readonly changed:()=>void
 constructor(scene:Phaser.Scene,host:HTMLElement,preference:()=>Detail,changed:()=>void){
  this.scene=scene;this.host=host;this.preference=preference;this.changed=changed
  this.observer=new ResizeObserver(()=>this.schedule())
  this.observer.observe(host)
  window.addEventListener('resize',this.schedule)
  scene.events.once('shutdown',()=>{
   this.observer.disconnect()
   window.removeEventListener('resize',this.schedule)
   cancelAnimationFrame(this.frame)
  })
  this.apply()
 }
 private schedule=()=>{
  cancelAnimationFrame(this.frame)
  this.frame=requestAnimationFrame(()=>this.apply())
 }
 select(){
  this.slow=0
  this.reduced=false
  this.apply()
 }
 sample(ms:number,isActive:boolean){
  if(!isActive||document.hidden||this.ratio<=1||this.reduced)return
  this.slow=ms>36&&ms<120?this.slow+1:Math.max(0,this.slow-2)
  if(this.slow<75)return
  this.reduced=true
  this.schedule()
 }
 private apply(){
  const width=this.host.clientWidth,height=this.host.clientHeight
  if(!width||!height)return
  const ratio=backingRatio(this.preference(),window.devicePixelRatio,width,height,this.reduced)
  if(width===this.width&&height===this.height&&ratio===this.ratio)return
  this.width=width;this.height=height;this.ratio=ratio
  this.scene.scale.resize(Math.round(width*ratio),Math.round(height*ratio))
  const canvas=this.scene.game.canvas
  canvas.style.width=width+'px';canvas.style.height=height+'px'
  const scale=this.scene.scale
  scale.updateBounds()
  scale.displayScale.set(canvas.width/scale.canvasBounds.width,canvas.height/scale.canvasBounds.height)
  this.changed()
 }
}
