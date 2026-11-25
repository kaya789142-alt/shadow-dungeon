import { zoneRoutes, zones } from './data.ts'

export const regionWidth=1500
export const regionHeight=1024
export const roadY=535
export const onRoad=(y:number)=>Math.abs(y-roadY)<48
export const landNeighbor=(zone:number,direction:-1|1)=>{
 const candidate=zoneRoutes(zone)[direction<0?0:1]
 return candidate>=0&&zoneRoutes(candidate)[direction<0?1:0]===zone?candidate:undefined
}
export function crossing(zone:number,level:number,x:number,y:number){
 if(!onRoad(y)||x>=0&&x<regionWidth)return undefined
 const direction=x<0?-1:1
 const next=landNeighbor(zone,direction)
 if(next===undefined||level<zones[next][1])return undefined
 const shift=direction*regionWidth
 return {zone:next,x:x-shift,y,shift}
}
