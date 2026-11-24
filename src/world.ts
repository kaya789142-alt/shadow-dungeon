import Phaser from 'phaser'
import { chest, drawWorld, entry, exit, HEIGHT, npcPoints, refuge, rng, secret, sprite, WIDTH } from './art'
import type { Obstacle, Pose } from './art'
import { jobs, monsters, morphs, pets, qualityColors, rules, vendors, zones } from './data'
import type { Gear, Material } from './data'
import { attributes, giveXp, makeGear, qualityRoll, record, spawn } from './model'
import type { Hero } from './model'
import { sound, soundtrack } from './sound'
import { clearPath, distance as dist, makeRoute } from './navigation'
import type { Point } from './navigation'

type Monster={definition:typeof monsters[number]; x:number;y:number; home:Point; hp:number; max:number; hitAt:number; sleep:number; frozen:number; angry:boolean; hurt:number; tell?:{end:number;x:number;y:number; angle:number; phase:number}}
type Loot={x:number;y:number; gold:number; material:Material; gear?:Gear}
type Burst={x:number;y:number;end:number;start:number;color:number;radius:number;source?:Point}
export type WorldCallbacks={message:(text:string,style?:string)=>void; npc:(index:number)=>void; refresh:()=>void; death:()=>void; ready:()=>void}
const angle=(a:Point,b:Point)=>Math.atan2(b.y-a.y,b.x-a.x)
const inside=(x:number,y:number)=>x>24&&x<WIDTH-24&&y>28&&y<HEIGHT-24
const colorNumber=(hex:string)=>parseInt(hex.slice(1),16)
export class World extends Phaser.Scene {
 hero:Hero
 callbacks:WorldCallbacks
 activePlay=false
 blocked=false
 auto=false
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
 private background?:Phaser.GameObjects.Image
 private graphics!:Phaser.GameObjects.Graphics
 private labels!:Phaser.GameObjects.Container
 private fx: Phaser.GameObjects.Text[]=[]
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
 create(){
  this.graphics=this.add.graphics()
  this.labels=this.add.container().setDepth(4)
  this.cameras.main.setBounds(0,0,WIDTH,HEIGHT).setRoundPixels(true)
  this.scale.on('resize',()=>this.resize())
  this.keys=this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as typeof this.keys
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
  this.cameras.main.setZoom(Math.max(.74,Math.min(1.32,this.scale.width/1060,this.scale.height/440)))
  this.cameras.main.centerOn(this.hero.x,this.hero.y)
 }
 enter(zone:number,position?:Point,silent=false){
  this.hero.zone=zone
  this.background?.destroy()
  if(this.textures.exists('map-'+zone))this.textures.remove('map-'+zone)
  const map=drawWorld(this,zone)
  this.background=map.world;this.obstacles=map.obstacles
  const point=position??(zone===0?spawn:entry)
  Object.assign(this.hero,point)
  if(!this.passable(this.hero.x,this.hero.y))Object.assign(this.hero,zone===0?spawn:entry)
  this.destination=undefined;this.target=undefined;this.interaction=undefined;this.interactionPoint=undefined
  this.loot=[];this.bursts=[];this.clickMarker=undefined;this.steerSide=1;this.route=[];this.routeGoal=undefined
  if(this.pet)Object.assign(this.pet,{x:this.hero.x-24,y:this.hero.y+18})
  for(const text of this.fx)text.destroy()
  this.fx=[]
  this.labels.removeAll(true)
  if(zone===0){
   npcPoints.forEach((p,i)=>this.label(p.x,p.y-51,vendors[i],i===7?'#e9c780':'#cbc4c7'))
   this.label(774,523,'燼燈泉 · 恢復','#a9ced1')
  }else{
   this.label(chest.x,chest.y-25,this.hero.chests.includes(zone)?'空寶箱':'失落寶箱','#e4bf7b')
   this.label(secret.x,secret.y-87,this.hero.hidden.includes(zone)?'隱密神龕':'刻印石門','#d6b2eb')
   this.label(refuge.x,refuge.y-46,'隱密神龕','#d6b2eb')
  }
  if(zone>0)this.label(entry.x,entry.y-96,zones[zone-1][0],'#b1dce1')
  if(zone<7)this.label(exit.x,exit.y-96,zones[zone+1][0],'#e7bd86')
  this.populate(zone)
  this.resize();this.explore()
  if(!silent){this.callbacks.message('抵達 '+zones[zone][0]);this.callbacks.refresh()}
 }
 private label(x:number,y:number,text:string,color:string){
  this.labels.add(this.add.text(x,y,text,{fontFamily:'sans-serif',fontSize:11,color,backgroundColor:'#17151dcc',padding:{x:5,y:2}}).setOrigin(.5))
 }
 private populate(zone:number){
  const random=rng(zone*25+551)
  const defs=monsters.filter(m=>m.zone===zone)
  this.mobs=[]
  if(!zone)return
  const safe=(p:Point)=>this.passable(p.x,p.y)&&dist(p,chest)>50&&dist(p,secret)>60&&dist(p,refuge)>115&&dist(p,exit)>80&&this.mobs.every(m=>dist(p,m)>58)
  const points:Point[]=[{x:292,y:530},{x:373,y:555},{x:467,y:521},{x:1200,y:590}]
  for(let i=0;i<defs.length;i++){
   const def=defs[i]
   const count=def.boss||def.rank==='精英'?1:def.rank==='稀有'?2:6
   for(let n=0;n<count;n++){
    let p= n===0&&points[i]?points[i]:{x:260+random()*990,y:155+random()*730}
    for(let j=0;j<32&&!safe(p);j++)p={x:245+random()*1010,y:150+random()*740}
    if(!safe(p))continue
    const max=(40+def.level*12+def.level**1.32*2.9)*(def.boss?6.2:def.rank==='精英'?2.35:def.rank==='稀有'?1.7:1)
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
  if(zone===0){
   const i=npcPoints.findIndex(q=>near(q,27))
   if(i>=0){this.approach(npcPoints[i],()=>this.callbacks.npc(i));return}
   if(near({x:774,y:510},34)){this.approach({x:774,y:510},()=>this.restore());return}
  }
  if(zone>0&&near(entry)){this.approach(entry,()=>this.travel(zone-1,true));return}
  if(zone<7&&near(exit)){this.approach(exit,()=>this.travel(zone+1));return}
  if(zone>0&&near(chest,33)){this.approach(chest,()=>this.openChest());return}
  if(zone>0&&near(secret)){this.approach(secret,()=>this.discover());return}
  const item=this.loot.find(item=>near(item,24))
  if(item){this.approach(item,()=>this.collect(item));return}
  this.target=undefined;this.interaction=undefined;this.interactionPoint=undefined
  this.destination={x:Phaser.Math.Clamp(p.x,26,WIDTH-26),y:Phaser.Math.Clamp(p.y,30,HEIGHT-26)}
  this.routeGoal=undefined;this.clickMarker=this.destination;this.clickUntil=this.clock+.46
 }
 travel(zone:number,back=false){
  if(!zones[zone])return false
  if(this.hero.level<zones[zone][1]){this.callbacks.message('需要等級 '+zones[zone][1],'warn');return false}
  this.enter(zone,zone===0?spawn:back?{x:exit.x-73,y:exit.y+6}:{x:entry.x+62,y:entry.y})
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
  this.lastAttack=this.clock;this.facing=mob.x<this.hero.x?-1:1;this.setPose('attack')
  this.burst(mob,job.color,32,job.range>100?this.hero:undefined);sound('hit')
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
   this.burst(skill.effect==='area'?center:valid?target:this.hero,job.color,skill.effect==='area'?100:48,valid&&job.range>100?this.hero:undefined)
   for(const mob of victims){
    if(skill.effect==='freeze')mob.frozen=this.clock+2.1*boost
    this.hit(mob,damage,magic)
   }
  }
  this.callbacks.refresh()
 }
 private hit(mob:Monster,power:number,magic:boolean){
  if(mob.hp<=0)return
  this.hiddenUntil=0;mob.angry=true
  const stats=attributes(this.hero)
  if(Math.random()>stats.hit){this.float(mob,'未命中','#b9b0bc');return}
  const crit=Math.random()<stats.crit
  const defense=mob.definition.level*(magic?.42:.79)
  const damage=Math.max(2,Math.round((power*(.88+Math.random()*.25)*(this.pet?.id===1?1.13:1)-defense)*(crit?1.75:1)))
  mob.hp=Math.max(0,mob.hp-damage);mob.hurt=this.clock+.19
  this.float(mob,(crit?'暴擊 ':'')+damage,crit?'#ffd78d':magic?'#d9adff':'#fff0d7')
  if(!mob.hp)this.kill(mob)
 }
 private kill(mob:Monster){
  const def=mob.definition, hero=this.hero
  mob.sleep=this.clock+(def.boss?46:14);mob.tell=undefined
  if(this.target===mob)this.target=undefined
  const first=!hero.bestiary[def.id]
  hero.bestiary[def.id]=(hero.bestiary[def.id]??0)+1
  record(hero,'kill',1,def.id)
  if(def.boss){
   record(hero,'boss',1,def.id)
   if(first)record(hero,'bossUnique')
   this.callbacks.message(def.id===27?'黑暗魔王已敗退，古老封印重獲安寧。':'已擊敗 '+def.name,'gold')
  }
  this.reward(Math.round((21+def.level*6)*(def.boss?7:1)))
  const roll=Math.random()
  const [shard,red,armor,weapon]=rules.materialCuts
  const material:Material=def.boss?'bless':roll<rules.book?'book':roll<shard?'shard':roll<red?'red':roll<armor?'armor':roll<weapon?'weapon':'blue'
  const grade=qualityRoll(Math.random(),def.boss?2:def.rank==='精英'?1:0)
  const slot=Math.floor(Math.random()*9)
  const gear=def.boss||Math.random()<rules.drop?makeGear(slot,grade,def.level,slot===0?hero.job:undefined):undefined
  this.loot.push({x:mob.x,y:mob.y,gold:(11+def.level*4)*(def.boss?8:1),material,gear})
  if(gear&&grade>=3){sound('loot');this.callbacks.message('高品質裝備已掉落！','gold');this.burst(mob,colorNumber(qualityColors[grade]),91)}
  else sound('death')
  this.callbacks.refresh()
 }
 reward(xp:number){
  const count=giveXp(this.hero,xp)
  if(count){sound('level');this.burst(this.hero,0xffcb71,95);this.callbacks.message('提升至等級 '+this.hero.level,'gold')}
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
  this.loot.push({...chest,gold:75*zone,material:'protect',gear:makeGear((zone+2)%9,2,zones[zone][1])})
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
  if(this.hero[key]>=stats[key]&&this.hero.zone!==0)return
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
 burst(point:Point,color:number,radius:number,source?:Point){
  this.bursts.push({x:point.x,y:point.y,color,radius,start:this.clock,end:this.clock+.42,source:source?{x:source.x,y:source.y}:undefined})
 }
 private float(p:Point,text:string,color:string){
  const obj=this.add.text(p.x,p.y-46,text,{fontFamily:'monospace',fontStyle:'bold',fontSize:17,color,stroke:'#251b24',strokeThickness:4}).setOrigin(.5).setDepth(7)
  this.fx.push(obj)
  this.tweens.add({targets:obj,y:p.y-83,alpha:0,duration:740,onComplete:()=>{obj.destroy();this.fx=this.fx.filter(item=>item!==obj)}})
 }
 private setPose(pose:Pose){this.pose=pose;this.poseUntil=this.clock+.29}
 private hurt(mob:Monster,multiplier=1){
  if(this.dead||this.hiddenUntil>this.clock)return
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
  if(this.activePlay&&!this.blocked&&!this.dead){
   this.clock+=dt
   const hero=this.hero, stats=attributes(hero)
   if(this.morph&&this.morph.end<=this.clock)this.morph=undefined
   if(this.pet&&this.pet.end<=this.clock)this.pet=undefined
   const k=this.keys
   const dx=this.joystick.x+Number(!!(k?.D.isDown||k?.RIGHT.isDown))-Number(!!(k?.A.isDown||k?.LEFT.isDown))
   const dy=this.joystick.y+Number(!!(k?.S.isDown||k?.DOWN.isDown))-Number(!!(k?.W.isDown||k?.UP.isDown))
   const speed=187*(this.morph?morphs[this.morph.id][2]:1)*(this.pet?.id===0?1.09:1)
   this.moving=false
   if(dx||dy){
    const norm=Math.max(1,Math.hypot(dx,dy))
    this.destination=undefined;this.interaction=undefined;this.interactionPoint=undefined;this.target=undefined
    this.moving=this.walk(hero,dx/norm*speed*dt,dy/norm*speed*dt)
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
    if(!this.dead)hero.hp=Math.min(stats.hp,hero.hp+(hero.zone===0?5:.25))
    hero.mp=Math.min(stats.mp,hero.mp+(hero.zone===0?4:.65))
    this.explore()
   }
   soundtrack(this.boss?'boss':hero.zone===0?'village':hero.zone===1?'forest':'dungeon')
  }else this.moving=false
  const camera=this.cameras.main
  const cx=camera.scrollX+camera.width/2,cy=camera.scrollY+camera.height/2
  camera.centerOn(Phaser.Math.Linear(cx,this.hero.x,Math.min(1,dt*9)),Phaser.Math.Linear(cy,this.hero.y-15,Math.min(1,dt*9)))
  this.renderWorld()
 }
 private renderWorld(){
  const g=this.graphics, hero=this.hero, zone=hero.zone, accent=zones[zone][4], frame=Math.floor(this.previewFrames*7)
  g.clear()
  for(const p of [entry,exit]){
   const pulse=(Math.sin(this.previewFrames*3.3)+1)/2
   g.lineStyle(1,accent,.25+pulse*.35).strokeEllipse(p.x,p.y,48+pulse*22,13+pulse*8)
   g.fillStyle(accent,.3+pulse*.4).fillRect(p.x-1,p.y-35+Math.sin(this.previewFrames*2)*13,2,4)
  }
  for(let i=0;i<41;i++){
   const x=(i*131+Math.sin(this.previewFrames*.3+i)*58+WIDTH)%WIDTH
   const y=(i*79-this.previewFrames*(6+i%7)+HEIGHT*100)%HEIGHT
   g.fillStyle(zone===0?0xffa762:accent,.14+.32*(.5+.5*Math.sin(this.previewFrames+i))).fillRect(Math.round(x),Math.round(y),i%5===0?3:2,2)
  }
  if(this.clickMarker&&this.clock<this.clickUntil)g.lineStyle(1,0xe8c798,.7).strokeEllipse(this.clickMarker.x,this.clickMarker.y,27,12)
  if(zone>0){
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
  const actors:{y:number;render:()=>void}[]=[]
  if(zone===0)npcPoints.forEach((p,i)=>actors.push({y:p.y,render:()=>{
   sprite(g,p.x,p.y,[0xc98276,0xa69b87,0xacb58a,0xb298d1,0xb9906e,0x9d9bae,0x7eb4ba,0xd7af7c,0xb085ab,0xad9bce][i],i%5,'idle',frame+i,1)
   if(i===7)g.fillStyle(0xffc778).fillRect(p.x-1,p.y-66,3,7).fillRect(p.x-1,p.y-57,3,2)
  }}))
  for(const mob of this.mobs){
   if(mob.hp<=0&&this.clock>mob.hurt+1.05)continue
   actors.push({y:mob.y,render:()=>{
    const d=mob.definition
    if(d.rank==='精英'&&mob.hp>0)g.lineStyle(1,0xe6af77,.8).strokeEllipse(mob.x,mob.y,39,15)
    if(this.target===mob)g.lineStyle(2,0xf0a572,.9).strokeEllipse(mob.x,mob.y+2,d.boss?62:36,13)
    sprite(g,mob.x,mob.y,d.color,5+d.id,mob.hp<=0?'dead':mob.hurt>this.clock?'hurt':mob.tell?'cast':mob.angry?'walk':'idle',frame+d.id,mob.x>hero.x?-1:1,d.boss)
    if(mob.hp>0&&(this.target===mob||mob.angry)){
     const width=d.boss?60:32,y=mob.y-(d.boss?61:37)
     g.fillStyle(0x211824).fillRect(mob.x-width/2,y,width,4)
     g.fillStyle(d.color).fillRect(mob.x-width/2+1,y+1,(width-2)*mob.hp/mob.max,2)
    }
   }})
  }
  if(this.pet){const p=this.pet;actors.push({y:p.y,render:()=>sprite(g,p.x,p.y,pets[p.id][1],7+p.id,'walk',frame,1)})}
  actors.push({y:hero.y,render:()=>{
   g.lineStyle(1,0xe6bd85,.76).strokeEllipse(hero.x,hero.y+2,42,14)
   g.fillStyle(0xe7ad6d,.15).fillEllipse(hero.x,hero.y+2,41,13)
   const mix=this.morph?morphs[this.morph.id]:undefined
   sprite(g,hero.x,hero.y,mix?mix[1]:jobs[hero.job].color,mix?6+this.morph!.id:hero.job,this.dead?'dead':this.poseUntil>this.clock?this.pose:this.moving?'walk':'idle',frame,this.facing,false,!!mix)
   if(this.shieldUntil>this.clock)g.lineStyle(2,0xffd489,.45).strokeEllipse(hero.x,hero.y-17,55,63)
   if(this.hiddenUntil>this.clock)g.fillStyle(0x59517c,.4).fillEllipse(hero.x,hero.y-16,42,42)
  }})
  actors.sort((a,b)=>a.y-b.y).forEach(a=>a.render())
  this.bursts=this.bursts.filter(effect=>effect.end>this.clock)
  for(const effect of this.bursts){
   const t=(this.clock-effect.start)/(effect.end-effect.start), size=effect.radius*(.22+.78*t)
   g.lineStyle(2,effect.color,(1-t)*.78).strokeEllipse(effect.x,effect.y-7,size*1.3,size*.78)
   if(effect.source&&t<.63){
    const x=Phaser.Math.Linear(effect.source.x,effect.x,t/.63),y=Phaser.Math.Linear(effect.source.y,effect.y,t/.63)-15
    g.lineStyle(2,effect.color,(1-t)*.8).lineBetween(effect.source.x,effect.source.y-15,x,y)
    g.fillStyle(effect.color,.88).fillCircle(x,y,4)
   }
   for(let i=0;i<7;i++)g.fillStyle(effect.color,1-t).fillRect(effect.x+Math.cos(i*.91)*size*.58,effect.y-12+Math.sin(i*.91)*size*.43,3,3)
  }
 }
}
