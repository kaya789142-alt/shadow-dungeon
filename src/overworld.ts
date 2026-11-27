import { zones } from './data.ts'

export const regionWidth=1500
export const regionHeight=1024
export const roadY=535
export const roadX=760
export const onRoad=(y:number)=>Math.abs(y-roadY)<48
export const onVerticalRoad=(x:number)=>Math.abs(x-roadX)<51
export const directions=['west','east','north','south'] as const
export type Direction=typeof directions[number]
const moves={west:[-1,0],east:[1,0],north:[0,-1],south:[0,1]} as const
export const regionGrid=zones.map((_,i)=>({x:i<8?i:i-8,y:i<8?1:0}))
export function regionNeighbor(zone:number,direction:Direction){
 const pos=regionGrid[zone]
 if(!pos)return undefined
 const [dx,dy]=moves[direction]
 const id=regionGrid.findIndex(other=>other.x===pos.x+dx&&other.y===pos.y+dy)
 return id>=0?id:undefined
}
export const landNeighbor=(zone:number,sign:-1|1)=>regionNeighbor(zone,sign<0?'west':'east')
export function regionOffset(direction:Direction){
 const [x,y]=moves[direction]
 return {x:x*regionWidth,y:y*regionHeight}
}
export function edgeAt(x:number,y:number,inset=0):Direction|undefined {
 if(x<inset&&onRoad(y))return 'west'
 if(x>=regionWidth-inset&&onRoad(y))return 'east'
 if(y<inset&&onVerticalRoad(x))return 'north'
 if(y>=regionHeight-inset&&onVerticalRoad(x))return 'south'
 return undefined
}
export function edgePoint(direction:Direction,inset=0){
 return {west:{x:inset,y:roadY},east:{x:regionWidth-inset,y:roadY},
  north:{x:roadX,y:inset},south:{x:roadX,y:regionHeight-inset}}[direction]
}
export function crossing(zone:number,level:number,x:number,y:number){
 const direction=edgeAt(x,y)
 if(!direction)return undefined
 const next=regionNeighbor(zone,direction)
 if(next===undefined||level<zones[next][1])return undefined
 const shift=regionOffset(direction)
 return {zone:next,x:x-shift.x,y:y-shift.y,shift:shift.x,...(shift.y?{shiftY:shift.y}:{})}
}
export function nextDirection(from:number,to:number,level:number){
 if(from===to)return undefined
 const path=directions.flatMap(direction=>{
  const zone=regionNeighbor(from,direction)
  return zone!==undefined&&zones[zone][1]<=level?[{zone,direction}]:[]
 })
 const visited=new Set([from,...path.map(step=>step.zone)])
 for(let i=0;i<path.length;i++){
  const step=path[i]
  if(step.zone===to)return step.direction
  for(const direction of directions){
   const zone=regionNeighbor(step.zone,direction)
   if(zone===undefined||visited.has(zone)||zones[zone][1]>level)continue
   visited.add(zone);path.push({zone,direction:step.direction})
  }
 }
 return undefined
}
