import { setBonus } from './epic.ts'
import { achievements, jobs, materialNames, quests, relicNames, rules, slots, zones } from './data.ts'
import type { Detail } from './display.ts'
import type { Gear, Material } from './data.ts'
import { categories, defaultPickup } from './inventory.ts'
import type { Category, Drop } from './inventory.ts'

export const spawn = {x:805,y:552}
export const materials = Object.keys(materialNames) as Material[]
export const day = () => new Intl.DateTimeFormat('sv-SE').format(new Date())
export const defaultPreferences={size:1.15,textRev:3,detail:'high' as Detail,click:'move' as 'move'|'interact',shake:true,ambience:.35,master:1,damageText:true,shadows:true,effects:true}
export type Hero = ReturnType<typeof createHero>
export function createHero(name:string, job:number) {
 return {
  version:1, characterId:globalThis.crypto?.randomUUID?.()??Date.now().toString(36)+Math.random().toString(36).slice(2), name:name.trim().slice(0,16)||'無名旅人', job, level:1, xp:0, gold:180, hp:999, mp:999,
  zone:0, x:spawn.x, y:spawn.y, bag:[makeGear(0,0,1,job),makeGear(3,0,1)],
  worn:{} as Record<number,Gear>, vault:[] as Gear[],
  items:{red:8,blue:6,weapon:3,armor:3,bless:0,protect:1,warp:1,home:2,blink:2,morph:1,identify:2,book:2,shard:0} satisfies Record<Material,number>,
  itemAcquiredAt:{} as Partial<Record<Material,number>>, skills:[1,0,0,0,0], quests:{move:0,potion:0,gear:0,forge:0,learn:0} as Record<string,number>,
  claims:{} as Record<string,boolean>, daily:day(), bestiary:{} as Record<number,number>,
  explored:{} as Record<number,number[]>, chests:[] as number[], hidden:[] as number[], morphs:[] as number[], stats:{} as Record<string,number>,
  title:'', music:.3, sfx:.65, stock:{} as Record<string,number>, tracking:'move', locks:[] as string[], drops:{} as Record<number,Drop[]>, pickup:{...defaultPickup,groups:[...categories]}, coordinates:'region-local' as const, preferences:{...defaultPreferences}
 }
}
export function makeGear(slot:number,grade:number,tier:number,job?:number,random=Math.random):Gear {
 return {uid:globalThis.crypto?.randomUUID?.()??(Date.now().toString(36)+Math.random().toString(36).slice(2)),slot,grade,tier,...(job===undefined?{}:{job}),plus:0,acquiredAt:Date.now(),roll:1+Math.floor(random()*5),identified:grade<2}
}
export function makeRelic(slot:number,grade:number,tier:number,job:number,relic:number){
 return {...makeGear(slot,grade,Math.min(50,tier),slot===0?job:undefined),relic,element:(relic+slot)%5,leech:slot===0||slot>=7?2+grade:0}
}
export const gearPower=(g:Gear)=>3+g.grade*4+g.tier*.8+g.plus*(2+g.tier*.09)+(g.identified?g.roll:0)
export const expNeeded = (level:number) => 42+level*21
export function giveXp(hero:Hero, amount:number){
 hero.xp += amount
 const previous=hero.level
 while(hero.level<rules.maxLevel && hero.xp>=expNeeded(hero.level)){
  hero.xp-=expNeeded(hero.level)
  hero.level++
 }
 if(hero.level===rules.maxLevel) hero.xp=0
 if(hero.level>previous){const stats=attributes(hero);hero.hp=stats.hp;hero.mp=stats.mp}
 return hero.level-previous
}
export function attributes(hero:Hero){
 const job=jobs[hero.job]
 const [str,dex,int,con,spi]=job.stats.map((value,i)=>value+(hero.level-1)*job.growth[i])
 const gear=Object.values(hero.worn)
 const weapon=gear.filter(g=>g.slot===0).reduce((total,g)=>total+gearPower(g),0)
 const set=setBonus(hero.worn)
 const armor=gear.filter(g=>g.slot!==0).reduce((total,g)=>total+gearPower(g),0)
 return { str,dex,int,con,spi,hp:75+con*8+armor*1.4,mp:30+spi*6,attack:9+str*2.2+dex*.55+weapon+set.damage,magic:11+int*2.75+weapon+set.damage,
  leech:Math.min(.25,(hero.job===3?.065:0)+gear.reduce((total,g)=>total+(g.identified?(g.leech??0)/100:0),0)),
  defense:con*.55+armor*.48+set.defense,hit:Math.min(.99,.86+dex*.0022),evade:Math.min(.32,dex*.005),crit:Math.min(.52,.05+dex*.005),interval:job.interval/(1+Math.min(.8,dex*.004)) }
}
export function qualityRoll(random:number, min=0){
 const weights=rules.qualityWeights.slice(min)
 let roll=random*weights.reduce((a,b)=>a+b,0)
 for(const [i,weight] of weights.entries()){roll-=weight;if(roll<0)return min+i}
 return weights.length+min-1
}
export function upgradeInfo(gear:Gear,blessed:boolean){
 const safe=gear.slot===0?rules.safeWeapon:rules.safeArmor
 const risk=gear.plus>=safe
 return {risk,chance:risk?Math.min(.98,rules.upgrade[gear.plus-safe]+(blessed?rules.blessing:0)):1,
  price:25+gear.plus*19,material:(blessed?'bless':gear.slot===0?'weapon':'armor') as Material}
}
export function upgrade(hero:Hero,gear:Gear,blessed=false,protectedItem=false,confirmed=false,random=Math.random){
 if(gear.plus>=rules.maxUpgrade)return '已達強化上限'
 const info=upgradeInfo(gear,blessed)
 if(info.risk&&hero.locks.includes(gear.uid)&&!protectedItem)return '已鎖定的裝備需使用保護卷軸'
 if(info.risk&&!confirmed)return '請確認高風險強化'
 if(hero.items[info.material]<1||hero.gold<info.price||(protectedItem&&hero.items.protect<1))return '金幣或卷軸不足'
 hero.gold-=info.price
 hero.items[info.material]--
 if(protectedItem)hero.items.protect--
 if(random()<info.chance){gear.plus++;record(hero,'forge');return '強化成功'}
 if(protectedItem)return '強化失敗，保護卷軸已生效'
 if(random()<rules.destroy){
  hero.bag=hero.bag.filter(item=>item.uid!==gear.uid)
  for(const [slot,item] of Object.entries(hero.worn))if(item.uid===gear.uid)delete hero.worn[+slot]
  return '強化失敗，裝備已損毀'
 }
 gear.plus=Math.max(0,gear.plus-1)
 return '強化失敗，裝備降級'
}
export function rollover(hero:Hero){
 const today=day()
 if(hero.daily===today)return
 hero.daily=today
 for(const quest of quests.filter(q=>q.daily)){
  delete hero.claims[quest.id]
  delete hero.quests[quest.id]
 }
 for(const key of Object.keys(hero.stats))if(key.startsWith('riftDay'))delete hero.stats[key]
 hero.stock={}
}
export function record(hero:Hero,event:string,amount=1,target?:number){
 rollover(hero)
 hero.stats[event]=(hero.stats[event]??0)+amount
 for(const quest of quests){
  if(quest.event!==event || (quest.zone!==undefined&&quest.zone!==hero.zone) || (quest.target!==undefined&&quest.target!==target) || hero.quests[quest.id]===undefined || hero.claims[quest.id])continue
  hero.quests[quest.id]=Math.min(quest.count,hero.quests[quest.id]+amount)
 }
}
export function achievementTitles(hero:Hero){
 return achievements.filter(item=>(hero.stats[item.event]??0)>=item.count)
}
export const saveKey='shadow-dungeon.v1'
export function save(hero:Hero){localStorage.setItem(saveKey,JSON.stringify(hero))}
const object = (value:unknown):value is Record<string,unknown> => typeof value==='object'&&value!==null&&!Array.isArray(value)
const integer = (value:unknown,min:number,max:number):value is number => typeof value==='number'&&Number.isInteger(value)&&value>=min&&value<=max
const finite = (value:unknown,min:number,max:number):value is number => typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max
const integerRecord = (value:unknown) => object(value)&&Object.values(value).every(v=>integer(v,0,Number.MAX_SAFE_INTEGER))
function validGear(value:unknown):value is Gear {
 return object(value)&&typeof value.uid==='string'&&/^[a-z0-9-]{1,90}$/i.test(value.uid)&&integer(value.slot,0,slots.length-1)&&integer(value.grade,0,5)&&integer(value.tier,1,50)&&integer(value.plus,0,15)&&integer(value.roll,1,5)&&(value.element===undefined||integer(value.element,0,4))
  &&(value.leech===undefined||integer(value.leech,0,12))&&(value.relic===undefined||integer(value.relic,0,relicNames.length-1))&&(value.acquiredAt===undefined||integer(value.acquiredAt,0,Number.MAX_SAFE_INTEGER))&&typeof value.identified==='boolean'&&(value.slot!==0||integer(value.job,0,jobs.length-1))
}
export function decodeSave(json:string):Hero {
 const value:unknown=JSON.parse(json)
 if(!object(value)||value.version!==1||typeof value.name!=='string'||!value.name.trim()||
  !integer(value.job,0,jobs.length-1)||!integer(value.zone,0,zones.length-1)||!integer(value.level,1,rules.maxLevel)||
  !integer(value.xp,0,1e9)||!integer(value.gold,0,1e9)||!finite(value.hp,0,1e6)||!finite(value.mp,0,1e6)||
  !finite(value.x,0,1500)||!finite(value.y,0,1024)||!finite(value.sfx,0,1)||!finite(value.music,0,1)||
  !Array.isArray(value.skills)||value.skills.length!==5||!value.skills.every(v=>integer(v,0,5))||
  !Array.isArray(value.bag)||!value.bag.every(validGear)||!Array.isArray(value.vault)||!value.vault.every(validGear)||
  !object(value.worn)||!Object.entries(value.worn).every(([slot,g])=>validGear(g)&&String(g.slot)===slot&&(g.slot!==0||g.job===value.job))||
  !object(value.items)||!materials.every(k=>k==='blink'&&(value.items as Record<string,unknown>)[k]===undefined||integer((value.items as Record<string,unknown>)[k],0,1e9))||
  !integerRecord(value.quests)||!integerRecord(value.bestiary)||!integerRecord(value.stats)||!integerRecord(value.stock)||
  !object(value.claims)||!Object.values(value.claims).every(v=>typeof v==='boolean')||
  !object(value.explored)||!Object.values(value.explored).every(v=>Array.isArray(v)&&v.every(i=>integer(i,0,99)))||
  !Array.isArray(value.chests)||!value.chests.every(v=>integer(v,0,zones.length-1))||
  !Array.isArray(value.hidden)||!value.hidden.every(v=>integer(v,0,zones.length-1))||
  !Array.isArray(value.morphs)||!value.morphs.every(v=>integer(v,0,5))||
  typeof value.daily!=='string'||typeof value.title!=='string'||typeof value.tracking!=='string')throw new Error('存檔格式或版本無效')
 const drops=value.drops===undefined?{}:value.drops
 if(!object(drops)||!Object.entries(drops).every(([zone,items])=>String(Number(zone))===zone&&integer(Number(zone),0,zones.length-1)&&Array.isArray(items)&&items.every(drop=>
  object(drop)&&finite(drop.x,0,1500)&&finite(drop.y,0,1024)&&integer(drop.gold,0,1e9)&&
  (drop.material===undefined||materials.includes(drop.material as Material))&&(drop.gear===undefined||validGear(drop.gear)))))
  throw new Error('地面戰利品格式無效')
 const ground=Object.values(drops).flat() as unknown as Drop[]
 const allGear=[...value.bag,...value.vault,...Object.values(value.worn),...ground.flatMap(drop=>drop.gear?[drop.gear]:[])] as Gear[]
 if(new Set(allGear.map(g=>g.uid)).size!==allGear.length)throw new Error('存檔含重複的裝備')
 const hero=value as unknown as Hero
 hero.name=hero.name.slice(0,16)
 if(!/^[a-z0-9-]{1,90}$/i.test(typeof value.characterId==='string'?value.characterId:''))hero.characterId=globalThis.crypto?.randomUUID?.()??Date.now().toString(36)+Math.random().toString(36).slice(2)
 hero.items.blink??=0
 const itemDates=object(value.itemAcquiredAt)?value.itemAcquiredAt:{}
 hero.itemAcquiredAt=Object.fromEntries(materials.flatMap(key=>integer(itemDates[key],0,Number.MAX_SAFE_INTEGER)?[[key,itemDates[key]]]:[]))
 hero.coordinates='region-local'
 hero.drops=drops as Hero['drops']
 const allowedLocks=new Set([...materials,...allGear.map(gear=>gear.uid)])
 hero.locks=Array.isArray(value.locks)?[...new Set(value.locks.filter((id):id is string=>typeof id==='string'&&allowedLocks.has(id)))]:[]
 const pickup=object(value.pickup)?value.pickup:{}
 hero.pickup={
  enabled:typeof pickup.enabled==='boolean'?pickup.enabled:defaultPickup.enabled,
  range:finite(pickup.range,65,165)?pickup.range:defaultPickup.range,
  minGrade:integer(pickup.minGrade,0,5)?pickup.minGrade:defaultPickup.minGrade,
  groups:Array.isArray(pickup.groups)?[...new Set(pickup.groups.filter((part):part is Category=>categories.includes(part)))]:[...categories]
 }
 const prefs=object(value.preferences)?value.preferences:{}
 hero.preferences={
  size:finite(prefs.size,1,1.4)&&(prefs.textRev===3||prefs.textRev===2)?prefs.size:defaultPreferences.size,
  textRev:3,
  detail:prefs.detail==='balanced'||prefs.detail==='ultra'?prefs.detail:'high',
  click:prefs.click==='interact'?'interact':'move',
  ambience:finite(prefs.ambience,0,1)?prefs.ambience:defaultPreferences.ambience,
  shake:typeof prefs.shake==='boolean'?prefs.shake:defaultPreferences.shake,
  master:finite(prefs.master,0,1)?prefs.master:1,
  damageText:prefs.damageText!==false,shadows:prefs.shadows!==false,effects:prefs.effects!==false
 }
 rollover(hero)
 return hero
}
export function load(){
 try{const data=localStorage.getItem(saveKey);return data?decodeSave(data):null}catch{return null}
}
