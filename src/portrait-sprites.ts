import Phaser from 'phaser'
import type { Pose } from './art'

const adventurers=['knight','archer','mage','assassin','paladin']
const townsfolk=['arms','armor','herbs','scribe','smith','warehouse','navigator','herald','merchant','tutor']
const beasts=['slime','wolf','guard','spider','wraith','dragon']
const path=(name:string)=>import.meta.env.BASE_URL+'art/'+name+'.webp'
export const playerArt=(job:number)=>path(adventurers[job])
export const townArt=(job:number)=>townsfolk[job]
export const heroArt=(job:number)=>adventurers[job]

export function creatureArt(name:string,region:number,boss=false){
 if(/蝕月皇|黑暗魔王/.test(name))return 'eclipse-emperor'
 if(boss&&region===1)return 'wood-behemoth'
 if(boss&&region===3)return 'necromancer'
 if(/火焰惡魔/.test(name))return 'flame-demon'
 if(/蛛/.test(name))return 'spider'
 if(/龍|飛蜥|暮翼/.test(name))return 'dragon'
 if(/史萊姆/.test(name))return 'slime'
 if(/狼|野獸|幻獸/.test(name))return 'wolf'
 if(/幽靈|法師|祭司|死靈|秘法|咒師/.test(name))return 'wraith'
 if(boss)return ['wolf','guard','wraith','guard','spider','dragon','guard','dragon'][region%8]
 return beasts[[2,1,2,2,3,2,2,2,2,2,1,2,2][region]??2]
}

export function preloadPortraits(scene:Phaser.Scene){
 for(const name of [...adventurers,...adventurers.map(job=>job+'-back'),...townsfolk,...beasts,'cottage-blue','cottage-red','cottage-green','spruce','boulder','arch','eclipse-emperor','necromancer','wood-behemoth','flame-demon'])scene.load.image(name,path(name))
}

export class PortraitSprites {
 private images=new Map<object|string,Phaser.GameObjects.Image>()
 private drawn=new Set<object|string>()
 private feet:Phaser.GameObjects.Image[]=[]
 constructor(private scene:Phaser.Scene){}
 begin(){this.drawn.clear();for(const foot of this.feet)foot.setVisible(false)}
 end(){for(const [key,image] of this.images)if(!this.drawn.has(key))image.setVisible(false)}
 reset(){for(const image of [...this.images.values(),...this.feet])image.destroy();this.images.clear();this.feet=[]}
 draw(key:object|string,name:string,x:number,y:number,height:number,pose:Pose,time:number,direction:number){
  if(!this.scene.textures.exists(name))return false
  const rear=direction>=5&&direction<=7&&this.scene.textures.exists(name+'-back')
  const texture=rear?name+'-back':name
  let image=this.images.get(key)
  if(!image){
   image=this.scene.add.image(x,y,texture).setOrigin(.5,1)
   this.images.set(key,image)
  }else if(image.texture.key!==texture)image.setTexture(texture)
  this.drawn.add(key)
  const source=image.texture.getSourceImage()
  if(!(source instanceof HTMLImageElement))return false
  const {width:sourceWidth,height:sourceHeight}=source
  const width=height*sourceWidth/sourceHeight
  const heading=Math.cos(direction*Math.PI/4)
  const facing=heading<-.2?-1:1
  const moving=pose==='run'||pose==='walk'
  const cycle=time*(pose==='run'?17:12)
  const step=moving?Math.sin(cycle):0
  const swell=pose==='idle'?Math.sin(time*3)*.6:0
  const stretch=pose==='hurt'?.95:1
  const rise=pose==='cast'?Math.sin(time*19)*2-3:moving?-Math.abs(step)*2.2:swell
  const lunge=pose==='attack'?facing*6:pose==='hurt'?-facing*3:step*1.2
  const angle=pose==='dead'?-facing*77:pose==='attack'?facing*12:pose==='hurt'?-facing*9:step*2.1
  const narrow=direction===2||direction===6?.86:direction===0||direction===4?.94:1
  const walk=key==='hero'&&moving&&adventurers.includes(name)
  const cut=Math.round(sourceHeight*.80)
  const split=Math.round(sourceWidth*.51)
  const depth=1+y/2000
  image.setFrame('__BASE').setVisible(true).setDepth(depth).setFlipX(facing<0).setAngle(angle)
   .setPosition(x+lunge,y+rise).setDisplaySize(width*narrow,height*stretch+Math.abs(step)*.9)
   .setAlpha(pose==='dead'?.72:1)
  if(walk){
   const atlas=image.texture
   if(!atlas.has('upper')){
    atlas.add('upper',0,0,0,sourceWidth,cut+7)
    atlas.add('foot-left',0,0,cut,split,sourceHeight-cut)
    atlas.add('foot-right',0,split,cut,sourceWidth-split,sourceHeight-cut)
   }
   const scaleX=width*narrow/sourceWidth, scaleY=height/sourceHeight
   image.setFrame('upper').setDisplaySize(width*narrow,(cut+7)*scaleY).setY(y+rise-(sourceHeight-cut-7)*scaleY)
   const sizes=[split,sourceWidth-split]
   for(const leg of [0,1]){
    const frame=leg===0?'foot-left':'foot-right', side=leg===0?-1:1
    const foot=this.feet[leg]??(this.feet[leg]=this.scene.add.image(x,y,texture,frame).setOrigin(.5,1))
    const swing=step*side
    foot.setTexture(texture,frame).setVisible(true).setFlipX(facing<0).setDepth(depth-.0001)
     .setDisplaySize(sizes[leg]*scaleX,(sourceHeight-cut)*scaleY)
     .setPosition(x+lunge+facing*(side*width*narrow*.25+swing*1.7),y+rise-Math.max(0,swing)*2.5)
   }
  }
  return true
 }
}
