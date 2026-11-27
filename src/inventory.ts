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
  addItem(hero,drop.material)
  delete drop.material
 }
 if(takeGear&&drop.gear){
  result.full=fullBag(hero)
  if(!result.full){
   result.gear=drop.gear
   drop.gear.acquiredAt=Date.now();hero.bag.push(drop.gear)
   delete drop.gear
  }
 }
 if(!drop.gear&&!drop.material&&!drop.gold)drops.splice(drops.indexOf(drop),1)
 return result
}

export const bagCategories={
 weapon:'武器',armor:'防具',accessories:'飾品',consumables:'消耗品',
 materials:'材料',scrolls:'魔法卷軸',quest:'任務道具'
} as const
export type BagCategory=keyof typeof bagCategories
export const bagGearCategory=(gear:Gear):BagCategory=>gear.slot===7||gear.slot===8?'accessories':gearCategory(gear)
export const bagItemCategory=(item:Material):BagCategory=>{
 if(item==='shard')return 'quest'
 if(item==='red'||item==='blue')return 'consumables'
 if(item==='book')return 'materials'
 return 'scrolls'
}
export function addItem(hero:Hero,item:Material,count=1){
 hero.items[item]+=count
 hero.itemAcquiredAt[item]=Date.now()
}
export const gearSalePrice=(gear:Gear)=>12+gear.grade*22+gear.plus*4+gear.tier
export const canSellGear=(hero:Hero,gear:Gear)=>!gearLocked(hero,gear)&&!Object.values(hero.worn).some(worn=>worn.uid===gear.uid)
export const canSellItem=(hero:Hero,item:Material)=>bagItemCategory(item)!=='quest'&&!materialLocked(hero,item)
export function quoteGearSale(hero:Hero,ids:Iterable<string>){
 const wanted=new Set(ids)
 const gear=hero.bag.filter(item=>wanted.has(item.uid)&&canSellGear(hero,item))
 return {gear,total:gear.reduce((total,item)=>total+gearSalePrice(item),0),rare:gear.some(item=>item.grade>=2)}
}
export function sellQuotedGear(hero:Hero,ids:string[],total:number,rareConfirmed:boolean){
 if(!ids.length||new Set(ids).size!==ids.length)return false
 const quote=quoteGearSale(hero,ids)
 if(quote.gear.length!==ids.length||quote.total!==total||hero.gold+total>1e9||quote.rare&&!rareConfirmed)return false
 const sold=new Set(ids)
 hero.bag=hero.bag.filter(gear=>!sold.has(gear.uid))
 hero.gold+=quote.total
 return true
}
