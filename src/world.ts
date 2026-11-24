import Phaser from 'phaser'
import { chest, drawWorld, entry, exit, HEIGHT, npcPoints, refuge, rng, secret, WIDTH } from './art'
import type { Obstacle, Pose } from './art'
import { allMonsters, elements, jobElements, jobs, morphs, pets, qualityColors, quests, rules, safeZone, vendors, zoneRoutes, zones } from './data'
import type { Gear, Material } from './data'
import { attributes, giveXp, makeGear, makeRelic, qualityRoll, record, rollover, spawn } from './model'
import type { Hero } from './model'
import { sound, soundtrack, victory } from './sound'
import { clearPath, distance as dist, makeRoute } from './navigation'
import type { Point } from './navigation'
import { WorldText } from './world-text'
import { DisplayResolution } from './display'
import { artKeys, creatureArt, heroArt, missingPortraits, PortraitSprites, preloadPortraits, townArt } from './portrait-sprites'

type Monster={definition:typeof allMonsters[number]; x:number;y:number; home:Point; hp:number; max:number; hitAt:number; sleep:number; frozen:number; angry:boolean; hurt:number; tell?:{end:number;x:number;y:number; angle:number; phase:number}}
type Loot={x:number;y:number; gold:number; material:Material; gear?:Gear}
type Strike='slash'|'arrow'|'spell'|'ring'
const riftPoint={x:900,y:535}
const elementColors=[0xff995f,0x99dfff,0xffd477,0xc785e7,0xffe0a4]
type Burst={x:number;y:number;end:number;start:number;color:number;radius:number;source?:Point;style:Strike}
export type WorldCallbacks={message:(text:string,style?:string)=>void; npc:(index:number)=>void; refresh:()=>void; death:()=>void; failed:(reason:string)=>void; ready:()=>void}
const angle=(a:Point,b:Point)=>Math.atan2(b.y-a.y,b.x-a.x)
const inside=(x:number,y:number)=>x>24&&x<WIDTH-24&&y>28&&y<HEIGHT-24
const colorNumber=(hex:string)=>parseInt(hex.slice(1),16)
export class World extends Phaser.Scene {
 hero:Hero
 callbacks:WorldCallbacks
 activePlay=false
 blocked=false
 auto=false
 assetCount=0
 joystick:Point={x:0,y:0}
 target?:Monster
 destination?:Point
 mobs:Monster[]=[]
 loot:Loot[]=[]
 obstacles:Obstacle[]=[]
 cooldowns:number[]=[0,0,0,0,0]
 lastAttack=-10
 shieldUntil=0
 shield=0
 hiddenUntil=0
 morph?:{id:number;end:number}
 pet?:{id:number;end:number;x:number;y:number;hit:number}
 dead=false
 clock=0
 private lastTick=0
 private lastCombat=-10
 private background?:Phaser.GameObjects.Image
 private display?:DisplayResolution
 private portraits!:PortraitSprites
 private heading=1
 private graphics!:Phaser.GameObjects.Graphics
 private battleEffects!:Phaser.GameObjects.Graphics
 private worldText!:WorldText
 private mapCache=new Map<number,Obstacle[]>()
 private riftGuards:Monster[]=[]
 private running=false
 private bursts:Burst[]=[]
 private keys?:Record<string,Phaser.Input.Keyboard.Key>
 private pose:Pose='idle'
 private poseUntil=0
 private facing=1
 private moving=false
 private clickMarker?:Point
 private clickUntil=0
 private interaction?:()=>void
 private interactionPoint?:Point
 private previewFrames=0
 private steerSide=1
 private route:Point[]=[]
 private routeGoal?:Point
 private routeAt=-10

 constructor(hero:Hero,callbacks:WorldCallbacks){super('world');this.hero=hero;this.callbacks=callbacks}
 preload(){preloadPortraits(this)}
 create(){
  const missing=missingPortraits(this)
  if(missing.length){
   this.callbacks.failed('角色或場景圖像：'+missing.join('、'))
   this.scene.pause()
   return
  }
  this.assetCount=artKeys.length+1
  document.querySelector<HTMLElement>('#game')!.dataset.art=String(this.assetCount)
  this.graphics=this.add.graphics()
  this.battleEffects=this.add.graphics().setDepth(3)
  this.portraits=new PortraitSprites(this)
  this.worldText=new WorldText(document.querySelector<HTMLElement>('#world-text')!)
  this.cameras.main.setBounds(0,0,WIDTH,HEIGHT).setRoundPixels(true)
  this.display=new DisplayResolution(this,document.querySelector<HTMLElement>('#game')!,()=>this.hero.preferences.detail,()=>this.resize())
  this.resize()
  this.keys=this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT') as typeof this.keys
  this.input.keyboard?.addCapture(['SPACE','UP','DOWN','LEFT','RIGHT'])
  this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{
   if(!this.activePlay||this.blocked||this.dead)return
   const p=this.cameras.main.getWorldPoint(pointer.x,pointer.y)
   this.point(p)
  })
  this.enter(this.hero.zone,{x:this.hero.x,y:this.hero.y},true)
  const stats=attributes(this.hero)
  this.hero.hp=Math.min(stats.hp,this.hero.hp)
  this.hero.mp=Math.min(stats.mp,this.hero.mp)
  if(this.hero.hp<=0)this.revive()
  this.callbacks.ready()
 }
 resize(){
  const ratio=this.display?.ratio??1
  this.cameras.main.setSize(this.scale.width,this.scale.height)
  this.cameras.main.setZoom(ratio*Math.max(.74,Math.min(1.32,this.scale.width/ratio/1060,this.scale.height/ratio/440)))
  this.cameras.main.centerOn(this.hero.x,this.hero.y)

 }
 applyDetail(){this.display?.select()}
 enter(zone:number,position?:Point,silent=false){
  this.hero.zone=zone
  this.portraits.reset()
  this.lastCombat=-10
  this.background?.destroy()
  const cached=this.mapCache.get(zone)
  const map=cached
   ?{world:this.add.image(0,0,'map-'+zone).setOrigin(0).setDisplaySize(WIDTH,HEIGHT).setDepth(-2),obstacles:cached}
   :drawWorld(this,zone)
  this.mapCache.delete(zone)
  this.mapCache.set(zone,map.obstacles)
  const mapLimit=navigator.maxTouchPoints>0?1:2
  if(this.mapCache.size>mapLimit){
   const oldest=this.mapCache.keys().next().value!
   this.mapCache.delete(oldest);this.textures.remove('map-'+oldest)
  }
  this.background=map.world;this.obstacles=map.obstacles
  document.querySelector<HTMLElement>('#game')!.dataset.maps=String(this.mapCache.size)
  const point=position??(safeZone(zone)?spawn:entry)
  Object.assign(this.hero,point)
  if(!this.passable(this.hero.x,this.hero.y))Object.assign(this.hero,safeZone(zone)?spawn:entry)
  this.destination=undefined;this.target=undefined;this.interaction=undefined;this.interactionPoint=undefined
  this.riftGuards=[];this.loot=[];this.bursts=[];this.clickMarker=undefined;this.steerSide=1;this.route=[];this.routeGoal=undefined
  if(this.pet)Object.assign(this.pet,{x:this.hero.x-24,y:this.hero.y+18})
  this.worldText.reset()
  if(safeZone(zone)){
   npcPoints.forEach((p,i)=>this.label(p.x,p.y-81-(i%2)*31,vendors[i],i===7?'#e9c780':'#cbc4c7'))
   this.label(715,526,'燼燈泉 · 恢復','#a9ced1')
  }else{
   this.label(chest.x,chest.y-25,this.hero.chests.includes(zone)?'空寶箱':'失落寶箱','#e4bf7b')
   this.label(secret.x,secret.y-87,this.hero.hidden.includes(zone)?'隱密神龕':'刻印石門','#d6b2eb')
   this.label(refuge.x,refuge.y-46,'隱密神龕','#d6b2eb')
  }
  const [back,next]=zoneRoutes(zone)
  if(back>=0)this.label(entry.x,entry.y-96,zones[back][0],'#b1dce1')
  if(next>=0)this.label(exit.x,exit.y-96,zones[next][0],'#e7bd86')
  if(zone>=9)this.label(riftPoint.x,riftPoint.y-43,'不穩定的裂隙','#f0b4ff')
  if(!silent)record(this.hero,'visit')
  this.populate(zone)
  this.resize();this.explore()
  if(!silent){this.callbacks.message('抵達 '+zones[zone][0]);this.callbacks.refresh()}
 }
 private label(x:number,y:number,text:string,color:string){this.worldText.label({x,y},text,color)}
 private populate(zone:number){
  const random=rng(zone*25+551)
  const defs=allMonsters.filter(m=>m.zone===zone)
  this.mobs=[]
  if(safeZone(zone))return
  const safe=(p:Point)=>this.passable(p.x,p.y)&&dist(p,chest)>50&&dist(p,secret)>60&&dist(p,refuge)>115&&dist(p,exit)>80&&(zone<9||dist(p,riftPoint)>95)&&this.mobs.every(m=>dist(p,m)>58)
  const points:Point[]=[{x:292,y:530},{x:373,y:555},{x:467,y:521},{x:1200,y:590}]
  for(let i=0;i<defs.length;i++){
   const def=defs[i]
   const count=def.boss||def.rank==='精英'?1:def.rank==='稀有'?2:6
   for(let n=0;n<count;n++){
    let p= n===0&&points[i]?points[i]:{x:260+random()*990,y:155+random()*730}
    for(let j=0;j<32&&!safe(p);j++)p={x:245+random()*1010,y:150+random()*740}
    if(!safe(p))continue
    if(def.rank==='世界魔王'&&(this.hero.stats.eclipseRespawn??0)>Math.floor(Date.now()/1000)){
     const max=(40+def.level*12+def.level**1.32*2.9)*11.5
     this.mobs.push({definition:def,home:p,...p,max,hp:0,hitAt:0,sleep:this.clock+this.hero.stats.eclipseRespawn-Math.floor(Date.now()/1000),frozen:0,angry:false,hurt:-10})
     continue
    }
    const max=(40+def.level*12+def.level**1.32*2.9)*(def.rank==='世界魔王'?11.5:def.boss?6.2:def.rank==='精英'?2.35:def.rank==='稀有'?1.7:1)
    this.mobs.push({definition:def,home:p,...p,max,hp:max,hitAt:0,sleep:0,frozen:0,angry:false,hurt:0})
   }
  }
 }
 private passable(x:number,y:number){return inside(x,y)&&this.obstacles.every(o=>Math.hypot(o.x-x,o.y-y)>o.r+6)}
 private walk(entity:Point,dx:number,dy:number){
  const x=entity.x,y=entity.y
  if(this.passable(entity.x+dx,entity.y))entity.x+=dx
  if(this.passable(entity.x,entity.y+dy))entity.y+=dy
  return dist(entity,{x,y})>.01
 }
 private direction(x:number,y:number){return (Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8}
 private go(goal:Point,speed:number,dt:number,reach=10){
  const passable=(x:number,y:number)=>this.passable(x,y)
  if(!this.routeGoal||dist(this.routeGoal,goal)>34||this.clock>=this.routeAt){
   this.routeGoal={x:goal.x,y:goal.y};this.routeAt=this.clock+.48
   const direct=dist(this.hero,goal)<28||clearPath(this.hero,goal,passable)
   this.route=direct?[]:makeRoute(this.hero,goal,WIDTH,HEIGHT,passable,reach)
  }
  if(this.route[0]&&dist(this.hero,this.route[0])<8)this.route.shift()
  const point=this.route[0]??goal
  const a=angle(this.hero,point), stride=Math.min(speed*dt,dist(this.hero,point))
  if(stride<1)return false
  this.heading=this.direction(Math.cos(a),Math.sin(a))
  this.facing=Math.cos(a)<-.12?-1:Math.cos(a)>.12?1:this.facing
  if(this.walk(this.hero,Math.cos(a)*stride,Math.sin(a)*stride))return true
  for(const offset of [1.05,1.52,-1.05,-1.52]){
   const heading=a+offset*this.steerSide
   if(this.walk(this.hero,Math.cos(heading)*stride,Math.sin(heading)*stride))return true
  }
  this.steerSide*=-1
  return false
 }
 private approach(point:Point,action:()=>void){
  this.target=undefined;this.destination=point;this.interaction=action;this.interactionPoint=point;this.routeGoal=undefined
 }
 point(p:Point){
  const mob=this.mobs.filter(m=>m.hp>0&&Math.hypot(m.x-p.x,m.y-19-p.y)<(m.definition.boss?44:29)).sort((a,b)=>dist(p,a)-dist(p,b))[0]
  if(mob){this.lock(mob);return}
  const near=(q:Point,size=41)=>dist(p,q)<size||dist(p,{x:q.x,y:q.y-34})<size
  const zone=this.hero.zone
  if(safeZone(zone)){
   const i=npcPoints.findIndex(q=>near(q,27))
   if(i>=0){this.approach(npcPoints[i],()=>this.callbacks.npc(i));return}
   if(near({x:774,y:510},34)){this.approach({x:774,y:510},()=>this.restore());return}
  }
  const [back,next]=zoneRoutes(zone)
  if(back>=0&&near(entry,53)){this.approach(entry,()=>this.travel(back,true));return}
  if(next>=0&&near(exit,53)){this.approach(exit,()=>this.travel(next));return}
  if(zone>=9&&near(riftPoint,42)){this.approach(riftPoint,()=>this.activateRift());return}
  if(!safeZone(zone)&&near(chest,33)){this.approach(chest,()=>this.openChest());return}
  if(!safeZone(zone)&&near(secret,61)){this.approach(secret,()=>this.discover());return}
  const item=this.loot.find(item=>near(item,24))
  if(item){this.approach(item,()=>this.collect(item));return}
  if(this.hero.preferences.click==='interact')return
  this.target=undefined;this.interaction=undefined;this.interactionPoint=undefined
  this.destination={x:Phaser.Math.Clamp(p.x,26,WIDTH-26),y:Phaser.Math.Clamp(p.y,30,HEIGHT-26)}
  this.routeGoal=undefined;this.clickMarker=this.destination;this.clickUntil=this.clock+.46
 }
 travel(zone:number,back=false){
  if(!zones[zone])return false
  if(this.hero.level<zones[zone][1]){this.callbacks.message('需要等級 '+zones[zone][1],'warn');return false}
  this.enter(zone,safeZone(zone)?spawn:back?{x:exit.x-73,y:exit.y+6}:{x:entry.x+62,y:entry.y})
  return true
 }
 restore(){
  const stats=attributes(this.hero);this.hero.hp=stats.hp;this.hero.mp=stats.mp
  this.callbacks.message('燼燈泉恢復了生命與魔力');sound('heal');this.burst(this.hero,0x85d2bc,52)
 }
 revive(){
  this.dead=false;this.auto=false;this.pose='idle';this.hiddenUntil=0;this.shieldUntil=0;this.morph=undefined;this.pet=undefined
  this.enter(0,spawn,true);this.restore();this.callbacks.refresh()
 }
 lock(mob:Monster){
  this.target=mob;this.destination=undefined;this.interaction=undefined;this.interactionPoint=undefined
 }
 private nearest(range:number){
  return this.mobs.filter(m=>m.hp>0&&dist(this.hero,m)<range).sort((a,b)=>dist(this.hero,a)-dist(this.hero,b))[0]
 }
 attack(){
  if(!this.activePlay||this.blocked||this.dead)return
  const target=this.target??this.nearest(340)
  if(target){this.lock(target);this.basic(target)}
  else if(this.clock-this.lastAttack>.3){this.lastAttack=this.clock;this.setPose('attack');this.burst(this.hero,0xd5a86c,30);sound('hit')}
 }
 private line(a:Point,b:Point){
  const length=dist(a,b)
  for(let i=18;i<length-12;i+=13){
   const t=i/length
   if(this.obstacles.some(o=>Math.hypot(o.x-(a.x+(b.x-a.x)*t),o.y-(a.y+(b.y-a.y)*t))<o.r))return false
  }
  return true
 }
 private basic(mob:Monster){
  const stats=attributes(this.hero), job=jobs[this.hero.job]
  if(dist(this.hero,mob)>job.range||!this.line(this.hero,mob)||this.clock-this.lastAttack<stats.interval/(this.morph?morphs[this.morph.id][3]:1))return
  this.lastAttack=this.clock;this.facing=mob.x<this.hero.x?-1:1;this.heading=this.direction(mob.x-this.hero.x,mob.y-this.hero.y);this.setPose('attack')
  const style=this.hero.job===1?'arrow':this.hero.job===2?'spell':'slash'
  this.burst(mob,job.color,50,this.hero,style)
  sound(style==='arrow'?'arrow':style==='spell'?'magic':'hit')
  this.hit(mob,this.hero.job===2?stats.magic:stats.attack,this.hero.job===2)
 }
 cast(index:number){
  const job=jobs[this.hero.job], skill=job.skills[index], rank=this.hero.skills[index]
  if(!skill||!this.activePlay||this.blocked||this.dead)return
  if(!rank){this.callbacks.message('請先向技能導師學習 '+skill.name,'warn');return}
  if(this.cooldowns[index]>this.clock)return
  if(this.hero.mp<skill.mana){this.callbacks.message('魔力不足','warn');return}
  const offensive=['hit','freeze','area','dash'].includes(skill.effect)
  const target=this.target??this.nearest(skill.range)
  const valid=target&&dist(this.hero,target)<=skill.range&&this.line(this.hero,target)
  if(offensive&&skill.effect!=='area'&&!valid){this.callbacks.message('目標不在技能範圍內','warn');return}
  this.hero.mp-=skill.mana;this.cooldowns[index]=this.clock+skill.cooldown
  this.setPose('cast');record(this.hero,'cast');sound('magic')
  const stats=attributes(this.hero), boost=1+(rank-1)*.18
  if(skill.effect==='heal'){this.hero.hp=Math.min(stats.hp,this.hero.hp+stats.hp*skill.power*boost);this.burst(this.hero,0x94f0b9,65)}
  else if(skill.effect==='shield'){this.shield=skill.power;this.shieldUntil=this.clock+5*boost;this.burst(this.hero,0xffd27c,69)}
  else if(skill.effect==='stealth'){this.hiddenUntil=this.clock+5*boost;this.target=undefined;this.burst(this.hero,0xae82da,55)}
  else if(skill.effect==='summon'){this.pet={id:skill.power,end:this.clock+52*boost,x:this.hero.x-22,y:this.hero.y+15,hit:0};this.burst(this.hero,0x8feeb4,65)}
  else{
   const magic=this.hero.job===2||this.hero.job===4
   const damage=(magic?stats.magic:stats.attack)*skill.power*boost
   const center=valid&&job.range>100?target:this.hero
   const victims=skill.effect==='area'?this.mobs.filter(m=>m.hp>0&&dist(center,m)<(job.range>100?115:skill.range)&&this.line(this.hero,m)):valid?[target]:[]
   if(skill.effect==='dash'&&valid){
    const a=angle(this.hero,target)
    for(let traveled=0;dist(this.hero,target)>45&&traveled<skill.range;traveled+=10)if(!this.walk(this.hero,Math.cos(a)*10,Math.sin(a)*10))break
   }
   this.burst(skill.effect==='area'?center:valid?target:this.hero,job.color,skill.effect==='area'?100:48,valid?this.hero:undefined,skill.effect==='area'?'ring':magic?'spell':job.range>100?'arrow':'slash')
   for(const mob of victims){
    if(skill.effect==='freeze')mob.frozen=this.clock+2.1*boost
    this.hit(mob,damage,magic,skill.effect==='freeze'?1:undefined)
   }
  }
  this.callbacks.refresh()
 }
 private hit(mob:Monster,power:number,magic:boolean,spellElement?:number){
  if(mob.hp<=0)return
  this.lastCombat=this.clock
  const hero=this.hero, stats=attributes(hero), weapon=hero.worn[0]
  this.hiddenUntil=0;mob.angry=true
  const enemyEvasion=mob.definition.rank==='稀有'?.055:mob.definition.rank==='世界魔王'?.075:.015
  if(Math.random()>stats.hit-enemyEvasion){this.float(mob,'未命中','#e1d7de');return}
  const critical=Math.random()<stats.crit+(hero.job===3?.06:0)
  const element=spellElement??(weapon?.identified?weapon.element:undefined)??(magic?jobElements[hero.job]:undefined)
  const weakness=(mob.definition.zone+mob.definition.id)%5
  const elemental=element===undefined?0:Math.round(power*(element===weakness?.27:.10))
  const defense=mob.definition.level*(magic?.42:.79)
  const damage=Math.max(2,Math.round((power*(.88+Math.random()*.25)*(this.pet?.id===1?1.13:1)-defense)*(critical?1.75:1)))+elemental
  const dealt=Math.min(mob.hp,damage)
  mob.hp-=dealt;mob.hurt=this.clock+.21
  if(hero.preferences.shake&&critical)this.cameras.main.shake(92,.002,true)
  this.float(mob,(critical?'爆擊 ':'')+damage+(elemental?'  '+elements[element!]+' +'+elemental:''),critical?'#ffd78d':magic?'#e5baff':'#fff0d7',critical)
  if(stats.leech>0&&hero.hp<stats.hp){
   const heal=Math.min(stats.hp-hero.hp,Math.ceil(dealt*stats.leech))
   hero.hp+=heal
   if(heal>=3)this.float(hero,'吸血 +'+Math.ceil(heal),'#a7efb0')
  }
  if(!mob.hp)this.kill(mob)
 }
  private kill(mob:Monster){
  const def=mob.definition, hero=this.hero
  mob.sleep=this.riftGuards.includes(mob)?Infinity:this.clock+(def.rank==='世界魔王'?125:def.boss?46:def.rank==='稀有'?35:14);mob.tell=undefined
  if(def.rank==='世界魔王')hero.stats.eclipseRespawn=Math.floor(Date.now()/1000)+125
  if(this.target===mob)this.target=undefined
  const first=!hero.bestiary[def.id]
  hero.bestiary[def.id]=(hero.bestiary[def.id]??0)+1
  record(hero,'kill',1,def.id)
  if(this.riftGuards.includes(mob)&&this.riftGuards.every(guard=>guard.hp<=0))this.resolveRift()
  if(def.boss){
   record(hero,'boss',1,def.id)
   victory()
   if(first)record(hero,'bossUnique')
   this.callbacks.message(def.id===27?'黑暗魔王已敗退，古老封印重獲安寧。':'已擊敗 '+def.name,'gold')
  }
  this.reward(Math.round((21+def.level*6)*(def.rank==='世界魔王'?14:def.boss?7:def.rank==='精英'?1.8:1)))
  const roll=Math.random()
  const [shard,red,armor,weapon]=rules.materialCuts
  const material:Material=def.boss?'bless':roll<rules.book?'book':roll<shard?'shard':roll<red?'red':roll<armor?'armor':roll<weapon?'weapon':'blue'
  const grade=qualityRoll(Math.random(),def.rank==='世界魔王'?4:def.boss?2:def.rank==='精英'?1:0)
  const slot=Math.floor(Math.random()*9)
  const gear=def.zone>=9&&(def.boss||grade>=3)?makeRelic(slot,grade,def.level,hero.job,def.zone-8):
   def.boss||Math.random()<rules.drop?makeGear(slot,grade,def.level,slot===0?hero.job:undefined):undefined
  this.loot.push({x:mob.x,y:mob.y,gold:(11+def.level*4)*(def.boss?8:1),material,gear})
  if(gear&&grade>=3){sound('loot');this.callbacks.message('高品質裝備已掉落！','gold');this.burst(mob,colorNumber(qualityColors[grade]),91)}
  else sound('death')
  this.callbacks.refresh()
 }
 reward(xp:number){
  const count=giveXp(this.hero,xp)
  if(count){victory();this.burst(this.hero,0xffcb71,95);this.callbacks.message('提升至等級 '+this.hero.level,'gold')}
 }
 pickup(){
  if(!this.activePlay||this.blocked||this.dead)return
  const close=this.loot.filter(item=>dist(this.hero,item)<94)
  for(const item of close)this.collect(item)
  if(close.length)return
  const point=this.loot.filter(item=>dist(this.hero,item)<310).sort((a,b)=>dist(this.hero,a)-dist(this.hero,b))[0]
  if(point)this.approach(point,()=>this.collect(point))
 }
 private collect(item:Loot){
  const index=this.loot.indexOf(item)
  if(index<0)return
  this.loot.splice(index,1)
  this.hero.gold+=item.gold;this.hero.items[item.material]++
  if(item.material==='shard')record(this.hero,'shard')
  if(item.gear)this.hero.bag.push(item.gear)
  this.callbacks.message('拾取 '+item.gold+' 金幣'+(item.gear?'與裝備':''),item.gear&&item.gear.grade>=2?'gold':'')
  sound('loot');this.callbacks.refresh()
 }
 private openChest(){
  const zone=this.hero.zone
  if(this.hero.chests.includes(zone)){this.callbacks.message('這個寶箱已經打開');return}
  this.hero.chests.push(zone);record(this.hero,'chest')
  this.loot.push({...chest,gold:75*zone,material:'protect',gear:zone>=9?makeRelic((zone+2)%8+1,3,zones[zone][1],this.hero.job,zone-8):makeGear((zone+2)%9,2,zones[zone][1])})
  this.collect(this.loot[this.loot.length-1])
  this.callbacks.message('發現失落寶箱','gold')
 }
 private discover(){
  const zone=this.hero.zone
  Object.assign(this.hero,refuge)
  this.cameras.main.centerOn(refuge.x,refuge.y)
  if(this.hero.hidden.includes(zone)){this.callbacks.message('抵達隱密神龕');return}
  this.hero.hidden.push(zone);record(this.hero,'hidden');this.reward(zones[zone][1]*23)
  this.hero.items.shard+=3;record(this.hero,'shard',3)
  this.burst(secret,zones[zone][4],83);this.callbacks.message('發現隱藏區域，獲得影晶碎片','gold');this.callbacks.refresh()
 }
 usePotion(kind:'red'|'blue'){
  if(this.dead)return
  const stats=attributes(this.hero), key=kind==='red'?'hp':'mp'
  if(!this.hero.items[kind]){this.callbacks.message('藥水不足','warn');return}
  if(this.hero[key]>=stats[key]&&!safeZone(this.hero.zone))return
  this.hero.items[kind]--;this.hero[key]=Math.min(stats[key],this.hero[key]+stats[key]*.46)
  record(this.hero,'potion');sound('heal');this.burst(this.hero,kind==='red'?0xeb7282:0x7ba9e6,45);this.callbacks.refresh()
 }
 transform(id?:number){
  if(!this.hero.items.morph){this.callbacks.message('需要變身卷軸','warn');return}
  const index=id??Math.floor(Math.random()*morphs.length)
  if(id!==undefined&&!this.hero.morphs.includes(id))return
  this.hero.items.morph--
  if(!this.hero.morphs.includes(index))this.hero.morphs.push(index)
  this.morph={id:index,end:this.clock+120}
  this.callbacks.message('變身為 '+morphs[index][0]+'，持續 120 秒','gold');sound('magic')
  this.burst(this.hero,morphs[index][1],70);this.callbacks.refresh()
 }
 burst(point:Point,color:number,radius:number,source?:Point,style:Strike='ring'){
  this.bursts.push({x:point.x,y:point.y,color,radius,style,start:this.clock,end:this.clock+.42,source:source?{x:source.x,y:source.y}:undefined})
 }
 private float(p:Point,text:string,color:string,critical=false){
  this.worldText.damage(p,text,color,critical,this.previewFrames)
 }
 private setPose(pose:Pose){this.pose=pose;this.poseUntil=this.clock+.29}
 private hurt(mob:Monster,multiplier=1){
  if(this.dead||this.hiddenUntil>this.clock)return
  this.lastCombat=this.clock
  const stats=attributes(this.hero)
  if(Math.random()<stats.evade){this.float(this.hero,'閃避','#c7dade');return}
  const level=mob.definition.level
  const shield=this.shieldUntil>this.clock?this.shield:0
  const damage=Math.max(1,Math.round(((8+level*3.1)*multiplier-stats.defense)* (1-shield)*(this.pet?.id===2?.82:1)))
  this.hero.hp=Math.max(0,this.hero.hp-damage)
  this.float(this.hero,String(damage),'#ff9d94');this.setPose('hurt')
  if(this.hero.hp===0){
   this.dead=true;this.auto=false;this.hero.gold=Math.floor(this.hero.gold*.94);sound('death');this.callbacks.death()
  }
 }
 private hazard(mob:Monster, p:Point){
  const t=mob.tell!
  const dx=p.x-t.x,dy=p.y-t.y,cos=Math.cos(t.angle),sin=Math.sin(t.angle)
  const along=dx*cos+dy*sin, across=dx*-sin+dy*cos
  const length=145+t.phase*23
  switch(mob.definition.pattern){
   case 0:return Math.hypot(dx,dy)<115+t.phase*22
   case 1:return along>=0&&along<length+45&&Math.abs(across)<32+t.phase*7
   case 2:return Math.hypot(dx,dy)<length&&Math.hypot(dx,dy)>43
   case 3:return Math.hypot(dx,dy)<length&&(Math.abs(dx)<37||Math.abs(dy)<37)
   case 5:return Math.hypot(dx,dy)<length+36&&(Math.abs(dx)<25+t.phase*11||Math.abs(dy)<25+t.phase*11||Math.hypot(dx,dy)>105)
   default:return Math.hypot(dx,dy)<length&&Math.abs(Math.atan2(across,along))<.68+t.phase*.18
  }
 }
 private think(mob:Monster,dt:number){
  if(mob.hp<=0){
   if(this.clock>=mob.sleep){Object.assign(mob,mob.home);mob.hp=mob.max;mob.angry=false;mob.hitAt=this.clock+1}
   return
  }
  if(mob.tell){
   if(this.clock>=mob.tell.end){
    if(this.hazard(mob,this.hero))this.hurt(mob,2.3+mob.tell.phase*.55)
    this.burst(mob,0xff7668,130);mob.tell=undefined;sound('hit')
   }
   return
  }
  if(mob.frozen>this.clock)return
  const d=dist(mob,this.hero), home=dist(mob,mob.home), def=mob.definition
  if(d<(def.boss?249:136)&&this.hiddenUntil<=this.clock)mob.angry=true
  if(home>420||d>465||this.hiddenUntil>this.clock)mob.angry=false
  if(!mob.angry){
   if(home>5){const a=angle(mob,mob.home);this.walk(mob,Math.cos(a)*64*dt,Math.sin(a)*64*dt)}
   return
  }
  const phase=mob.hp<mob.max*.35?2:mob.hp<mob.max*.67?1:0
  if(def.boss&&d<242&&this.clock>mob.hitAt){
   const center=def.pattern===2||def.pattern===0?this.hero:mob
   mob.tell={end:this.clock+(1.32-phase*.15),x:center.x,y:center.y,angle:angle(mob,this.hero),phase}
   mob.hitAt=this.clock+3.3-phase*.37
   if(phase===2&&Math.random()<.44)this.callbacks.message(def.name+' 正在聚集暗影','warn')
   return
  }
  const range=def.ranged?139:def.boss?76:38
  if(d>range||!this.line(mob,this.hero)){
   const a=angle(mob,this.hero), speed=(def.boss?79:76)+phase*9+this.hero.zone*1.7
   for(const offset of [0,.8,-.8,1.55,-1.55])if(this.walk(mob,Math.cos(a+offset)*speed*dt,Math.sin(a+offset)*speed*dt))break
  }else if(this.clock>mob.hitAt){
   mob.hitAt=this.clock+1.2
   this.hurt(mob,def.rank==='精英'?1.4:def.rank==='稀有'?1.2:1)
   this.burst(this.hero,def.color,21,def.ranged?mob:undefined)
  }
 }
 private explore(){
  const zone=this.hero.zone, x=Math.min(9,Math.floor(this.hero.x/WIDTH*10)), y=Math.min(9,Math.floor(this.hero.y/HEIGHT*10))
  const explored=this.hero.explored[zone]??=[]
  const tile=y*10+x
  if(!explored.includes(tile))explored.push(tile)
 }
 private interactNear(){
  const point=this.interactionPoint
  if(!point||dist(this.hero,point)>56)return false
  const action=this.interaction
  this.interaction=undefined;this.interactionPoint=undefined;this.destination=undefined
  action?.();return true
 }
 get boss(){return this.mobs.find(m=>m.definition.boss&&m.hp>0&&(m.angry||this.target===m))}
 update(_time:number,delta:number){
  const dt=Math.min(delta/1000,.05)
  this.previewFrames+=dt
  this.display?.sample(delta,this.activePlay&&!this.blocked)
  if(this.activePlay&&!this.blocked&&!this.dead){
   this.clock+=dt
   const hero=this.hero, stats=attributes(hero)
   if(this.morph&&this.morph.end<=this.clock)this.morph=undefined
   if(this.pet&&this.pet.end<=this.clock)this.pet=undefined
   const k=this.keys
   const dx=this.joystick.x+Number(!!(k?.D.isDown||k?.RIGHT.isDown))-Number(!!(k?.A.isDown||k?.LEFT.isDown))
   const dy=this.joystick.y+Number(!!(k?.S.isDown||k?.DOWN.isDown))-Number(!!(k?.W.isDown||k?.UP.isDown))
   const speed=187*(this.morph?morphs[this.morph.id][2]:1)*(this.pet?.id===0?1.09:1)
   this.moving=false;this.running=false
   if(dx||dy){
    const norm=Math.max(1,Math.hypot(dx,dy))
    this.destination=undefined;this.interaction=undefined;this.interactionPoint=undefined;this.target=undefined
    this.running=!!k?.SHIFT.isDown||Math.hypot(this.joystick.x,this.joystick.y)>.9
    const stride=speed*(this.running?1.21:1)
    this.moving=this.walk(hero,dx/norm*stride*dt,dy/norm*stride*dt)
    this.heading=this.direction(dx,dy)
    if(dx)this.facing=dx>0?1:-1
   }else if(!this.interactNear()){
    if(this.auto&&!this.target&&!this.destination){
     const loot=this.loot.find(item=>dist(hero,item)<125)
     if(loot)this.approach(loot,()=>this.collect(loot))
     else this.target=this.nearest(460)
    }
    if(this.target){
     const job=jobs[hero.job]
     if(this.target.hp<=0)this.target=undefined
     else if(dist(hero,this.target)>job.range-7||!this.line(hero,this.target))this.moving=this.go(this.target,speed,dt,Math.min(48,jobs[hero.job].range-12))
     else this.basic(this.target)
    }else if(this.destination){
     if(dist(hero,this.destination)<5)this.destination=undefined
     else this.moving=this.go(this.destination,speed,dt,this.interactionPoint?47:10)
    }
   }
   if(this.moving&&!hero.stats.move)record(hero,'move')
   for(const mob of this.mobs)this.think(mob,dt)
   if(this.pet&&!this.dead){
    const p=this.pet, target=this.target??this.nearest(95), goal=target??{x:hero.x-this.facing*27,y:hero.y+16}
    if(dist(p,goal)>23){const a=angle(p,goal);this.walk(p,Math.cos(a)*speed*dt,Math.sin(a)*speed*dt)}
    if(dist(p,hero)>240){p.x=hero.x-20;p.y=hero.y+15}
    if(target&&dist(p,target)<50&&this.clock>p.hit){p.hit=this.clock+1.07;this.hit(target,stats.magic*.42,true)}
   }
   if(this.clock-this.lastTick>.24){
    this.lastTick=this.clock
    if(!this.dead)hero.hp=Math.min(stats.hp,hero.hp+(safeZone(hero.zone)?5:.25))
    hero.mp=Math.min(stats.mp,hero.mp+(safeZone(hero.zone)?4:.65))
    this.explore()
   }
   if(this.target?.hp)this.lastCombat=this.clock
   soundtrack(this.boss?'boss':this.clock-this.lastCombat<3?'battle':safeZone(hero.zone)?'village':
    hero.zone===1||hero.zone===10?'forest':hero.zone===3?'graveyard':'dungeon')
  }else{this.moving=false;if(!this.activePlay)soundtrack('title')}
  const camera=this.cameras.main
  const cx=camera.scrollX+camera.width/2,cy=camera.scrollY+camera.height/2
  camera.centerOn(Phaser.Math.Linear(cx,this.hero.x,1-Math.exp(-dt*10)),Phaser.Math.Linear(cy,this.hero.y-15,1-Math.exp(-dt*10)))
  this.renderWorld()
 }
 navigateQuest(){
  const point=this.questPoint
  if(!point||this.dead)return false
  this.point(point)
  this.clickMarker=point;this.clickUntil=this.clock+2
  return true
 }
 get questPoint():Point|undefined {
  const quest=quests.find(q=>q.id===this.hero.tracking)
  if(!quest||this.hero.claims[quest.id])return undefined
  const zone=this.hero.zone
  if(quest.zone!==undefined&&quest.zone!==zone){
   const [back,next]=zoneRoutes(zone)
   if(quest.zone>=8&&zone<8)return zone===0?undefined:entry
   if(quest.zone<8&&zone>=8)return entry
   return quest.zone>zone&&next>=0?exit:back>=0?entry:undefined
  }
  if(quest.event==='chest')return chest
  if(quest.event==='hidden')return secret
  if(quest.event==='rift'&&zone>=9)return riftPoint
  if(quest.event==='kill'||quest.event==='boss')return this.mobs.find(m=>m.hp>0&&(quest.event==='boss'?m.definition.boss:quest.target===undefined||m.definition.id===quest.target))
  return undefined
 }
 blink(){
  if(!this.hero.items.blink){this.callbacks.message('需要瞬間移動卷軸','warn');return false}
  if(safeZone(this.hero.zone)){this.callbacks.message('瞬間移動卷軸只可在野外使用','warn');return false}
  for(let i=0;i<30;i++){
   const a=Math.random()*Math.PI*2, x=this.hero.x+Math.cos(a)*200,y=this.hero.y+Math.sin(a)*200
   if(!this.passable(x,y)||this.mobs.some(m=>m.hp>0&&dist(m,{x,y})<85))continue
   this.hero.items.blink--;Object.assign(this.hero,{x,y})
   this.target=undefined;this.destination=undefined;this.interaction=undefined;this.interactionPoint=undefined
   this.burst(this.hero,0xba96ff,91);sound('magic');this.explore();this.callbacks.refresh();return true
  }
  this.callbacks.message('附近找不到安全的落點','warn');return false
 }
 private activateRift(){
  rollover(this.hero)
  if(!!this.hero.stats['riftDay'+this.hero.zone]){this.callbacks.message('今天已淨化這道裂隙');return}
  if(this.riftGuards.some(m=>m.hp>0)){this.callbacks.message('擊退裂隙守衛以完成淨化');return}
  const definition=allMonsters.find(m=>m.zone===this.hero.zone&&m.rank==='精英')
  if(!definition)return
  const max=130+definition.level*17
  this.riftGuards=[-1,1].map(side=>{
   const home={x:riftPoint.x+side*70,y:riftPoint.y+side*19}
   return {definition,home,...home,hp:max,max,hitAt:this.clock+1,sleep:0,frozen:0,angry:true,hurt:0}
  })
  this.mobs=[...this.mobs.filter(m=>Number.isFinite(m.sleep)),...this.riftGuards]
  this.callbacks.message('裂隙開啟！擊退兩名守衛','warn');sound('magic')
 }
 private resolveRift(){
  const zone=this.hero.zone
  this.hero.stats['riftDay'+zone]=1;record(this.hero,'rift')
  this.loot.push({...riftPoint,gold:zone*93,material:'blink',gear:makeRelic(7,3,zones[zone][1],this.hero.job,zone-8)})
  this.callbacks.message('裂隙已淨化，遺物落在祭壇附近','gold');this.burst(riftPoint,0xe9acf6,116);sound('loot')
 }
 private ambient(){
  const g=this.graphics, zone=this.hero.zone, t=this.previewFrames
  if(safeZone(zone)){
   for(let i=0;i<6;i++){
    const x=758+i*7, progress=(t*1.25+i*.17)%1
    g.lineStyle(1.4,0xcaf5e6,.11+(1-progress)*.45).strokeEllipse(x,477+Math.sin(i*2+t*3)*3,6+progress*14,2+progress*4)
    const drop=(i*.26+t*2)%1
    g.fillStyle(0xd2f7ed,.45).fillCircle(774+Math.sin(i)*2+drop*6,444+drop*30,1+drop*.55)
   }
   for(const [x,y] of [[475,487],[638,480],[912,480],[1120,487],[631,606],[911,606]]){
    for(let j=3;j>0;j--)g.fillStyle(0xff9e52,.023+j*.006).fillEllipse(x,y-16,j*27+Math.sin(t*9+x)*5,j*21)
    g.fillStyle(0xffb36a,.7).fillTriangle(x-4,y-27,x+Math.sin(t*12+x)*3,y-39,x+4,y-27)
   }
  }
  if(!safeZone(zone)&&zone>=3&&this.hero.preferences.detail!=='balanced'&&!this.display?.reduced){
   for(let i=0;i<6;i++){
    const x=235+i*202+Math.sin(t*.46+i)*62,y=410+i%3*113+Math.sin(t*.44+i)*16
    g.fillStyle(zone===5?0xff976b:0xb2b9ce,.028).fillEllipse(x,y,171+i%3*25,24+i%2*6)
    g.fillStyle(zone===5?0xfe6c53:0xbbc5e5,.029).fillEllipse(x+10,y-2,116,18)
   }
  }
  if(zone===10&&this.hero.preferences.detail!=='balanced'&&!this.display?.reduced){
   for(let i=0;i<16;i++){
    const x=200+i*66+(t*7)%38, y=239+Math.sin(x/149)*17
    g.lineStyle(1,0x9fddd4,.27+.18*Math.sin(t*2+i)).lineBetween(x,y-4+(i%5)*4,x+17,y-4+(i%5)*4)
   }
  }
  if(zone>=9){
   const c=zones[zone][4]
   for(let i=0;i<3;i++)g.lineStyle(2,c,.37-i*.075).strokeEllipse(riftPoint.x,riftPoint.y-3,42+i*16+Math.sin(t*3)*9,17+i*6)
   for(let i=0;i<8;i++)g.fillStyle(c,.55).fillCircle(riftPoint.x+Math.sin(t*2+i*2)*25,riftPoint.y-(t*(19+i)+i*9)%43,1.5)
  }
 }
  private renderWorld(){
  const g=this.graphics, hero=this.hero, zone=hero.zone, accent=zones[zone][4]
  g.clear()
  for(const p of [entry,exit]){
   const pulse=(Math.sin(this.previewFrames*3.3)+1)/2
   g.lineStyle(1,accent,.25+pulse*.35).strokeEllipse(p.x,p.y,48+pulse*22,13+pulse*8)
   g.fillStyle(accent,.3+pulse*.4).fillRect(p.x-1,p.y-35+Math.sin(this.previewFrames*2)*13,2,4)
  }
  for(let i=0;i<(this.display?.reduced?13:hero.preferences.detail==='ultra'?65:hero.preferences.detail==='high'?39:13);i++){
   const x=(i*131+Math.sin(this.previewFrames*.3+i)*58+WIDTH)%WIDTH
   const y=(i*79-this.previewFrames*(6+i%7)+HEIGHT*100)%HEIGHT
   g.fillStyle(zone===0?0xffa762:accent,.14+.32*(.5+.5*Math.sin(this.previewFrames+i))).fillRect(Math.round(x),Math.round(y),i%5===0?3:2,2)
  }
  if(this.clickMarker&&this.clock<this.clickUntil)g.lineStyle(1,0xe8c798,.7).strokeEllipse(this.clickMarker.x,this.clickMarker.y,27,12)
  if(!safeZone(zone)){
   const open=hero.chests.includes(zone)
   g.fillStyle(0x211721).fillRect(chest.x-15,chest.y-14,30,15)
   g.fillStyle(open?0x745644:0xbc824b).fillRect(chest.x-13,chest.y-13,26,10)
   g.fillStyle(0xe7b460).fillRect(chest.x-2,chest.y-11,4,5)
  }
  for(const item of this.loot){
   const c=item.gear?colorNumber(qualityColors[item.gear.grade]):0xf4bc72
   if(item.gear&&item.gear.grade>=3)for(let i=5;i>=1;i--)g.fillStyle(c,.065).fillRect(item.x-i*3,item.y-86,i*6,87)
   g.fillStyle(c,.34).fillEllipse(item.x,item.y,25,10);g.fillStyle(c).fillRect(item.x-3,item.y-5,7,5)
  }
  for(const mob of this.mobs){
   if(!mob.tell)continue
   const t=mob.tell
   for(let y=t.y-195;y<t.y+195;y+=10)for(let x=t.x-195;x<t.x+195;x+=10){
    if(this.hazard(mob,{x,y}))g.fillStyle(0xff7065,.16+.08*Math.sin(this.previewFrames*12)).fillRect(x,y,9,9)
   }
  }
  const focus=this.target?.hp?this.target:this.boss
  this.worldText.target(focus&&{x:focus.x,y:focus.y-(focus.definition.boss?150:104)},focus?focus.definition.name+' · 等級 '+focus.definition.level:'')
  this.worldText.update(this.cameras.main,this.previewFrames,this.display?.ratio??1,hero)
  this.ambient()
  this.portraits.begin()
  const visible=(p:Point)=>{
   const camera=this.cameras.main, dx=p.x-(camera.scrollX+camera.width/2),dy=p.y-(camera.scrollY+camera.height/2)
   return Math.abs(dx)<camera.width/camera.zoom/2+130&&Math.abs(dy)<camera.height/camera.zoom/2+130
  }
  const actors:{y:number;render:()=>void}[]=[]
  if(safeZone(zone))npcPoints.forEach((p,i)=>actors.push({y:p.y,render:()=>{
   if(!visible(p))return
   g.fillStyle(0x130f16,.38).fillEllipse(p.x,p.y+1,37,13)
   this.portraits.draw('npc'+i,townArt(i),p.x,p.y,i===4?83:74,'idle',this.previewFrames+i*.4,1)
   if(i===7)g.fillStyle(0xffc778).fillRect(p.x-1,p.y-66,3,7).fillRect(p.x-1,p.y-57,3,2)
  }}))
  for(const mob of this.mobs){
   if(!visible(mob)||mob.hp<=0&&this.clock>mob.hurt+1.05)continue
   actors.push({y:mob.y,render:()=>{
    const d=mob.definition
    if(d.rank==='精英'&&mob.hp>0)g.lineStyle(1,0xe6af77,.8).strokeEllipse(mob.x,mob.y,39,15)
    if(this.target===mob)g.lineStyle(2,0xf0a572,.9).strokeEllipse(mob.x,mob.y+2,d.boss?62:36,13)
    const pose:Pose=mob.hp<=0?'dead':mob.hurt>this.clock?'hurt':mob.tell?'cast':mob.hitAt-this.clock>.93&&mob.angry?'attack':mob.angry?'walk':'idle'
    const facing=this.direction(hero.x-mob.x,hero.y-mob.y)
    const art=creatureArt(d.name,d.zone,d.boss), height=d.boss?122:art==='slime'?46:art==='spider'?61:74
    g.fillStyle(0x100d16,.48).fillEllipse(mob.x,mob.y+1,height*.61,height*.23)
    this.portraits.draw(mob,art,mob.x,mob.y,height,pose,this.previewFrames+d.id*.4,facing)
    if(mob.hp>0&&(this.target===mob||mob.angry)){
     const width=d.boss?78:39,y=mob.y-height-7
     g.fillStyle(0x211824).fillRect(mob.x-width/2,y,width,4)
     g.fillStyle(d.color).fillRect(mob.x-width/2+1,y+1,(width-2)*mob.hp/mob.max,2)
    }
   }})
  }
  if(this.pet){
   const p=this.pet
   const key=['wolf','wraith','guard'][p.id]
   actors.push({y:p.y,render:()=>{
    this.portraits.draw('pet',key,p.x,p.y,47,'walk',this.previewFrames,1)
   }})
  }
  actors.push({y:hero.y,render:()=>{
   g.lineStyle(1,0xe6bd85,.76).strokeEllipse(hero.x,hero.y+2,42,14)
   g.fillStyle(0xe7ad6d,.15).fillEllipse(hero.x,hero.y+2,41,13)
   const mix=this.morph?morphs[this.morph.id]:undefined
   const pose:Pose=this.dead?'dead':this.poseUntil>this.clock?this.pose:this.moving?(this.running?'run':'walk'):'idle'
   const name=mix?['guard','guard','wolf','wraith','guard','dragon'][this.morph!.id]:heroArt(hero.job)
   g.fillStyle(0x120e16,.49).fillEllipse(hero.x,hero.y+1,43,13)
   this.portraits.draw('hero',name,hero.x,hero.y,87,pose,this.previewFrames,this.heading)
   const weapon=hero.worn[0], armor=hero.worn[3]
   if(armor&&armor.grade>=3)g.lineStyle(2,colorNumber(qualityColors[armor.grade]),.6).strokeEllipse(hero.x,hero.y+2,46,16)
   if(weapon&&(weapon.plus>=4||weapon.element!==undefined)){
    const c=weapon.element!==undefined&&weapon.identified?elementColors[weapon.element]:colorNumber(qualityColors[weapon.grade])
    const x=hero.x+this.facing*21,y=hero.y-27+Math.sin(this.previewFrames*12)*5
    g.lineStyle(2,c,.73).lineBetween(x-3,y+8,x+this.facing*10,y-5)
    g.fillStyle(c,.5).fillCircle(x+this.facing*8,y-3,3)
   }
   if(this.shieldUntil>this.clock)g.lineStyle(2,0xffd489,.45).strokeEllipse(hero.x,hero.y-17,55,63)
   if(this.hiddenUntil>this.clock)g.fillStyle(0x59517c,.4).fillEllipse(hero.x,hero.y-16,42,42)
  }})
  actors.sort((a,b)=>a.y-b.y).forEach(a=>a.render())
  this.portraits.end()
  this.battleEffects.clear()
  this.bursts=this.bursts.filter(effect=>effect.end>this.clock)
  for(const effect of this.bursts){
   const t=(this.clock-effect.start)/(effect.end-effect.start), size=effect.radius*(.22+.78*t)
   if(this.hero.preferences.detail!=='balanced'&&!this.display?.reduced){
    for(let band=3;band>=1;band--)this.battleEffects.fillStyle(effect.color,(1-t)*.032).fillEllipse(effect.x,effect.y-13,size+band*13,size*.47+band*8)
   }
   this.battleEffects.lineStyle(2,effect.color,(1-t)*.78).strokeEllipse(effect.x,effect.y-7,size*1.3,size*.78)
   if(effect.style==='slash'){
    const facing=effect.source&&effect.x<effect.source.x?-1:1
    this.battleEffects.lineStyle(4,effect.color,(1-t)*.78).beginPath().arc(effect.x-facing*11,effect.y-22,15+size*.56,facing<0?1.8:-1.35,facing<0?4.55:1.35).strokePath()
   }
   if(effect.source&&t<.63&&effect.style!=='slash'){
    if(effect.style==='arrow'){
     const direction=angle(effect.source,effect), x=Phaser.Math.Linear(effect.source.x,effect.x,t/.63),y=Phaser.Math.Linear(effect.source.y,effect.y,t/.63)-20
     this.battleEffects.lineStyle(2,0xffe5ad,.98).lineBetween(x-Math.cos(direction)*18,y-Math.sin(direction)*18,x,y)
     continue
    }
    const x=Phaser.Math.Linear(effect.source.x,effect.x,t/.63),y=Phaser.Math.Linear(effect.source.y,effect.y,t/.63)-15
    this.battleEffects.lineStyle(2,effect.color,(1-t)*.8).lineBetween(effect.source.x,effect.source.y-15,x,y)
    this.battleEffects.fillStyle(effect.color,.88).fillCircle(x,y,4)
   }
   for(let i=0;i<7;i++)this.battleEffects.fillStyle(effect.color,1-t).fillRect(effect.x+Math.cos(i*.91)*size*.58,effect.y-12+Math.sin(i*.91)*size*.43,3,3)
  }
 }
}
