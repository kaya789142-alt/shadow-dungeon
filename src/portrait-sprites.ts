import Phaser from 'phaser'
import type { Pose } from './art'
import type { Gear } from './data'
import { directionalAtlas, directionalTexture, photographedKit, sampleActors, sampleArt, sampleAtlas, sampleGround } from './art-sample'

export const adventurers=['knight','archer','mage','assassin','paladin']
const townsfolk=['arms','armor','herbs','scribe','smith','warehouse','navigator','herald','merchant','tutor']
const beasts=['slime','wolf','guard','spider','wraith','dragon']
export const artKeys=[...adventurers,...adventurers.map(job=>job+'-back'),...townsfolk,...beasts,
 'cottage-blue','cottage-red','cottage-green','spruce','boulder','arch','eclipse-emperor','necromancer','wood-behemoth',
 'flame-demon','fountain','oak','tomb','dungeon-arch','goblin','bone-archer','moth','tree-spirit','gargoyle','dark-lord']
const directory=import.meta.env.BASE_URL+'art-v22/'
const motionDirectory=import.meta.env.BASE_URL+'art-v31/'
const frames=['stride-a','stride-b','strike','channel','recoil','fall']
export const motionKeys=adventurers.map(job=>'motion-'+job)
const path=(name:string)=>directory+name+'.webp'
export const playerArt=(job:number)=>job===0?sampleArt('sample-knight-idle'):path(adventurers[job])
export const townArt=(job:number)=>job===4?'sample-smith':townsfolk[job]
export const heroArt=(job:number)=>adventurers[job]

export function creatureArt(name:string,region:number,boss=false){
 if(/蝕月皇/.test(name))return 'eclipse-emperor'
 if(/黑暗魔王|黑暗騎士|無面獄主|門扉看守/.test(name))return 'dark-lord'
 if(/哥布林|赤旗|裂旗|炭弓/.test(name))return 'goblin'
 if(/骷髏弓箭/.test(name))return 'bone-archer'
 if(/蛾/.test(name))return 'moth'
 if(/樹魂/.test(name))return 'tree-spirit'
 if(/石像|巨像|血月守衛/.test(name))return 'gargoyle'
 if(boss&&region===1)return 'sample-warden'
 if(boss&&region===3)return 'necromancer'
 if(/火焰惡魔/.test(name))return 'flame-demon'
 if(/蛛/.test(name))return 'spider'
 if(/龍|飛蜥|暮翼/.test(name))return 'dragon'
 if(/史萊姆/.test(name))return 'slime'
 if(/狼|野獸|幻獸/.test(name))return region===1?'sample-wolf':'wolf'
 if(/幽靈|法師|祭司|死靈|秘法|咒師/.test(name))return 'wraith'
 if(boss)return ['wolf','guard','wraith','guard','spider','dragon','guard','dragon'][region%8]
 return beasts[[2,1,2,2,3,2,2,2,2,2,1,2,2][region]??2]
}

export function preloadPortraits(scene:Phaser.Scene){
 for(const name of artKeys)scene.load.image(name,path(name))
 for(const name of [...sampleGround,...sampleActors])scene.load.image(name,sampleArt(name))
 scene.load.atlas('sample-equipment',sampleArt('equipment'),sampleAtlas)
 scene.load.atlas(directionalTexture,sampleArt('directions'),directionalAtlas)
 scene.load.atlas('knight-motion',path('knight-motion'),directory+'knight-motion.json')
 scene.load.image('equipment-art',import.meta.env.BASE_URL+'art-v30/items.webp')
 for(const name of motionKeys)scene.load.atlas(name,motionDirectory+name+'.webp',motionDirectory+name+'.json')
}
export function missingPortraits(scene:Phaser.Scene){
 return [...artKeys,'knight-motion','equipment-art',...motionKeys,...sampleGround,...sampleActors,'sample-equipment',directionalTexture].filter(name=>{
  if(name==='sample-equipment'&&(!scene.textures.exists(name)||Array.from({length:10},(_,slot)=>String(slot)).some(slot=>!scene.textures.get(name).has(slot))))return true
  if(name===directionalTexture&&(!scene.textures.exists(name)||['stride','pass','attack','idle'].some(pose=>Array.from({length:8},(_,i)=>i).some(i=>!scene.textures.get(name).has(pose+'-'+i)))))return true
  const source=scene.textures.exists(name)?scene.textures.get(name).getSourceImage():undefined
  return !(source instanceof HTMLImageElement)||source.naturalWidth<(name==='sample-knight-idle'?150:256)||source.naturalHeight<256||motionKeys.includes(name)&&frames.some(frame=>!scene.textures.get(name).has(frame))
 })
}
export class PortraitSprites {
 private images=new Map<object|string,Phaser.GameObjects.Image>()
 private drawn=new Set<object|string>()
 private feet:Phaser.GameObjects.Image[]=[]
 heroFrame=''
 private poses=new Map<object|string,{pose:Pose;since:number}>()
 constructor(private scene:Phaser.Scene){
  const equipment=scene.textures.get('equipment-art')
  if(!equipment.has('shield'))equipment.add('shield',0,192,0,192,192)
 }
 armor(x:number,y:number,facing:number,pose:Pose,heading:number){
  if(pose==='dead')return
  const key='hero-shield'
  let shield=this.images.get(key)
  if(!shield){shield=this.scene.add.image(x,y,'equipment-art','shield');this.images.set(key,shield)}
  this.drawn.add(key)
  const upper=heading>=5&&heading<=7
  shield.setVisible(true).setPosition(x-facing*17,y-44+(pose==='attack'?-3:0))
   .setDepth(1+y/2000+(upper?-.0002:.0002)).setDisplaySize(28,28).setFlipX(facing<0)
 }
 equipment(worn:Record<number,Gear>,pose:Pose,direction:number){
  const body=this.images.get('hero')
  if(!body||pose==='dead')return []
  const directional=body.texture.key===directionalTexture
  const motion=body.frame.name.startsWith('attack')?'strike':directional&&/^(stride|pass)/.test(body.frame.name)?'walk':'idle'
  const angle=body.rotation, sine=Math.sin(angle),cosine=Math.cos(angle),mirror=body.flipX?-1:1
  const slots:number[]=[]
  for(const part of photographedKit(worn,motion,directional?direction:undefined)){
   // Rear detail art retains its original coat. Small parts stay clear of the back silhouette.
   const rear=direction>=5
   if(rear&&[2,3,4,7,8,9].includes(part.slot))continue
   const dx=(part.x-.5)*body.displayWidth*mirror
   const dy=(part.y-1)*body.displayHeight
   const key='hero-wear-'+part.slot
   let image=this.images.get(key)
   if(!image){image=this.scene.add.image(body.x,body.y,'sample-equipment',String(part.slot));this.images.set(key,image)}
   const size=body.displayHeight*part.size*.91
   image.setPosition(body.x+dx*cosine-dy*sine,body.y+dx*sine+dy*cosine)
    .setVisible(true).setDisplaySize(size,size).setFlipX(directional?direction>=3&&direction<=5:body.flipX)
    .setRotation(angle+Phaser.Math.DegToRad(part.rotate)*mirror)
    .setDepth(body.depth+(part.rear||rear?-.00016:.0001+part.slot*.000006))
   this.drawn.add(key);slots.push(part.slot)
  }
  return slots
 }
 begin(){this.drawn.clear();for(const foot of this.feet)foot.setVisible(false)}
 end(){for(const [key,image] of this.images)if(!this.drawn.has(key))image.setVisible(false)}
 reset(){for(const image of [...this.images.values(),...this.feet])image.destroy();this.images.clear();this.poses.clear();this.feet=[]}
 draw(key:object|string,name:string,x:number,y:number,height:number,pose:Pose,time:number,direction:number){
  let state=this.poses.get(key)
  if(!state||state.pose!==pose){state={pose,since:time};this.poses.set(key,state)}
  const elapsed=Math.max(0,time-state.since)
  const stroke=Math.sin(Math.min(1,elapsed/.29)*Math.PI)
  const recoil=Math.max(.12,1-elapsed*4.4)
  const fall=Math.min(1,elapsed*6)
  const walking=pose==='run'||pose==='walk'
  const rear=direction>=5&&direction<=7&&adventurers.includes(name)
  const frame=adventurers.includes(name)&&!rear?(walking?Math.floor(time*(pose==='run'?11:7))%2?'stride-a':'stride-b':
   pose==='attack'&&elapsed>.045?'strike':pose==='cast'?'channel':pose==='hurt'?'recoil':pose==='dead'?'fall':'__BASE'):'__BASE'
  const directional=name==='knight'&&pose!=='cast'&&pose!=='dead'
  const texture=directional?directionalTexture:frame!=='__BASE'?'motion-'+name:rear?name+'-back':name
  const beat=walking?(Math.floor(time*(pose==='run'?11:7))%2?'stride':'pass'):pose==='attack'&&elapsed>.045?'attack':'idle'
  const spriteFrame=directional?beat+'-'+direction:frame
  const authored=directional?pose!=='hurt':frame!=='__BASE'
  if(key==='hero')this.heroFrame=texture+':'+spriteFrame
  let image=this.images.get(key)
  if(!image){
   image=this.scene.add.image(x,y,texture,spriteFrame).setOrigin(.5,1)
   this.images.set(key,image)
  }else if(image.texture.key!==texture||image.frame.name!==spriteFrame)image.setTexture(texture,spriteFrame)
  this.drawn.add(key)
  const source=image.frame
  const sourceWidth=source.realWidth,sourceHeight=source.realHeight
  const renderedHeight=frame==='fall'?35:height
  const width=renderedHeight*sourceWidth/sourceHeight
  const heading=Math.cos(direction*Math.PI/4)
  const facing=heading<-.2?-1:1
  const moving=pose==='run'||pose==='walk'
  const cycle=time*(pose==='run'?17:12)
  const step=moving?Math.sin(cycle):0
  const swell=pose==='idle'?Math.sin(time*3)*.6:0
  const stretch=pose==='hurt'?.95:1
  const rise=pose==='cast'?-stroke*7:moving?-Math.abs(step)*2.2:swell
  const lunge=pose==='attack'?facing*stroke*12:pose==='hurt'?-facing*recoil*6:step*1.2
  const angle=pose==='dead'?-facing*fall*77:pose==='attack'?facing*stroke*15:pose==='hurt'?-facing*recoil*12:step*2.1
  const narrow=direction===2||direction===6?.86:direction===0||direction===4?.94:1
  const walk=!authored&&key==='hero'&&moving&&adventurers.includes(name)
  const cut=Math.round(sourceHeight*.80)
  const split=Math.round(sourceWidth*.51)
  const depth=1+y/2000
  image.setFrame(spriteFrame).setVisible(true).setDepth(depth).setFlipX(!directional&&facing<0).setAngle(authored?0:angle)
   .setPosition(x+lunge,y+rise).setDisplaySize(width*narrow,renderedHeight*stretch+Math.abs(step)*.9)
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
    const foot=this.feet[leg]??(this.feet[leg]=this.scene.add.image(x,y,texture,spriteFrame).setOrigin(.5,1))
    const swing=step*side
    foot.setTexture(texture,frame).setVisible(true).setFlipX(facing<0).setDepth(depth-.0001)
     .setDisplaySize(sizes[leg]*scaleX,(sourceHeight-cut)*scaleY)
     .setPosition(x+lunge+facing*(side*width*narrow*.25+swing*1.7),y+rise-Math.max(0,swing)*2.5)
   }
  }
 }
}
