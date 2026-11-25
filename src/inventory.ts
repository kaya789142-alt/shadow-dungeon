import { jobs } from './data.ts'
import type { Gear, Material } from './data.ts'
import type { Hero } from './model.ts'

export const bagLimit=60
export const categories=['weapon','armor','consumables','materials','quest'] as const
export type Category=typeof categories[number]
export const categoryNames:Record<Category,string>={weapon:'武器',armor:'防具與飾品',consumables:'消耗品',materials:'材料',quest:'任務道具'}
export const gearCategory=(gear:Gear):Category=>gear.slot===0?'weapon':'armor'
export const itemCategory=(key:Material):Category=>key==='shard'?'quest':key==='book'||key==='weapon'||key==='armor'||key==='bless'||key==='protect'?'materials':'consumables'
export type Drop={x:number;y:number; gold:number; material?:Material; gear?:Gear}
export const defaultPickup={enabled:true,range:100,minGrade:0,groups:[...categories] as Category[]}
export const compatibleGear=(hero:Hero,gear:Gear)=>gear.slot!==0||gear.job===hero.job
export const jobRequirement=(gear:Gear)=>gear.slot===0?jobs[gear.job??0].name:'全職業'
export const fullBag=(hero:Hero)=>hero.bag.length>=bagLimit
export const gearLocked=(hero:Hero,gear:Gear)=>hero.locks.includes(gear.uid)
export const materialLocked=(hero:Hero,key:Material)=>hero.locks.includes(key)
export function sortBag(bag:Gear[]){
 bag.sort((a,b)=>a.slot-b.slot||b.grade-a.grade||b.plus-a.plus||b.tier-a.tier||a.uid.localeCompare(b.uid))
}
function eligible(hero:Hero,drop:Drop,auto:boolean){
 const takeGear=!!drop.gear&&(!auto||hero.pickup.groups.includes(gearCategory(drop.gear))&&drop.gear.grade>=hero.pickup.minGrade)
 const takeMaterial=!!drop.material&&(!auto||hero.pickup.groups.includes(itemCategory(drop.material)))
 return {takeGear,takeMaterial}
}
export function canCollect(hero:Hero,drop:Drop,auto:boolean){
 const {takeGear,takeMaterial}=eligible(hero,drop,auto)
 return drop.gold>0||takeMaterial||takeGear&&!fullBag(hero)
}
export function collectDrop(hero:Hero,drop:Drop,auto=false){
 const result={gold:0,gear:undefined as Gear|undefined,material:undefined as Material|undefined,full:false}
 const drops=hero.drops[hero.zone]
 if(!drops?.includes(drop))return result
 const {takeGear,takeMaterial}=eligible(hero,drop,auto)
 result.gold=drop.gold;hero.gold+=drop.gold;drop.gold=0
 if(takeMaterial&&drop.material){
  result.material=drop.material
  hero.items[drop.material]++
  delete drop.material
 }
 if(takeGear&&drop.gear){
  result.full=fullBag(hero)
  if(!result.full){
   result.gear=drop.gear
   hero.bag.push(drop.gear)
   delete drop.gear
  }
 }
 if(!drop.gear&&!drop.material&&!drop.gold)drops.splice(drops.indexOf(drop),1)
 return result
}
