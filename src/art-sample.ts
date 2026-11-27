import type { Gear } from './data'

const directory=import.meta.env.BASE_URL+'art-sample/'
export const sampleArt=(name:string)=>directory+name+'.webp'
export const sampleAtlas=directory+'equipment.json'
export const directionalAtlas=directory+'directions.json'
export const directionalTexture='sample-directions'
export const sampleGround=['sample-inn','sample-house','sample-forge','sample-oak','sample-fountain','sample-gate']
export const sampleActors=['sample-knight-idle','sample-wolf','sample-smith','sample-warden']

type Placement={slot:number;x:number;y:number;size:number;rotate:number;rear?:boolean}
const resting:Placement[]=[
 {slot:6,x:.24,y:.47,size:.63,rotate:3,rear:true},
 {slot:5,x:.57,y:.88,size:.31,rotate:7},
 {slot:3,x:.49,y:.37,size:.45,rotate:0},
 {slot:9,x:.49,y:.53,size:.28,rotate:4},
 {slot:2,x:.51,y:.155,size:.28,rotate:3},
 {slot:7,x:.50,y:.28,size:.14,rotate:0},
 {slot:4,x:.36,y:.58,size:.16,rotate:-10},
 {slot:8,x:.355,y:.62,size:.065,rotate:-15},
 {slot:0,x:.255,y:.67,size:.62,rotate:6},
 {slot:1,x:.72,y:.49,size:.48,rotate:3}
]
const walk:Partial<Record<number,Partial<Placement>>>={
 0:{x:.30,y:.62,rotate:15},1:{x:.72,y:.48},4:{x:.35,y:.56},8:{x:.33,y:.59},5:{x:.56,y:.89}
}
const strike:Partial<Record<number,Partial<Placement>>>={
 0:{x:.80,y:.49,size:.67,rotate:42},1:{x:.32,y:.43},2:{x:.62,y:.18},3:{x:.56,y:.40},
 4:{x:.72,y:.51},8:{x:.75,y:.51},5:{x:.47,y:.89},6:{x:.27,y:.45},7:{x:.59,y:.31},9:{x:.53,y:.54}
}
const strikeHands=[
 [.91,.24,66],[.61,.48,47],[.48,.50,25],[.38,.50,-37],
 [.11,.24,-66],[.19,.28,-52],[.75,.28,42],[.82,.24,58],
] as const
export function photographedKit(worn:Record<number,Gear>,pose:'idle'|'walk'|'strike'='idle',direction?:number){
 const changes=pose==='walk'?walk:pose==='strike'?strike:undefined
 return resting.flatMap(part=>{
  const gear=worn[part.slot]
  if(!gear)return []
  const placement={...part,...changes?.[part.slot]}
  if(direction!==undefined&&(direction>=3&&direction<=5)){
   placement.x=1-placement.x
   placement.rotate=-placement.rotate
  }
  if(part.slot===0&&pose==='strike'&&direction!==undefined){
   const [x,y,rotate]=strikeHands[direction]
   Object.assign(placement,{x,y,rotate})
  }
  return [{...placement,gear}]
 })
}
export function atlasCell(slot:number){
 return `--atlas-x:${slot%5*25}%;--atlas-y:${slot>=5?100:0}%`
}
export function photographedDoll(worn:Record<number,Gear>,rear:boolean){
 return photographedKit(worn).filter(part=>!!part.rear===rear).map(part=>
  `<i aria-hidden="true" class="photo-equipped" data-worn-layer="${part.slot}" style="${atlasCell(part.slot)};--x:${part.x*100}%;--y:${part.y*100}%;--span:${part.size*165}%;--turn:${part.rotate}deg"></i>`
 ).join('')
}
