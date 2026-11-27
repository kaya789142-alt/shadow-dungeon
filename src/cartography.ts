import { zones } from './data'
import { regionGrid, regionNeighbor } from './overworld'

const landmarks=[
 'town','forest','field','grave','cave','mountain','cave','town','town','grave','mountain','cave','cave'
]
const glyphs:Record<string,string>={
 town:'<path d="M-13 8V-5h5v-7h5v7h6v-7h5v7h5v13H3v-5h-6v5Z"/>',
 forest:'<path d="M-13 7-7-5-5 1 0-13 7 1 9-5 15 7Z"/>',
 field:'<path d="M-14 6q7-13 14 0 7-13 14 0M-10 9H12"/>',
 grave:'<path d="M-11 9h22m-17-1V-4a6 6 0 0 1 12 0V8M0-6V4m-3-7h6"/>',
 cave:'<path d="M-14 9-8-3 0-13 11-3 15 9H6V3Q0-7-6 3V9Z"/>',
 mountain:'<path d="M-16 9-5-9 1-1 6-13 16 9ZM3-6l4 1 3-2"/>'
}
const coords=(i:number)=>{
 const p=regionGrid[i]
 return [40+p.x*80,p.y?166:57]
}
export function realmChart(current:number,objective:number|undefined,visited:Record<number,number[]>,selected:number){
 const roads=zones.flatMap((_,i)=>(['east','south'] as const).map(direction=>{
  const next=regionNeighbor(i,direction)
  if(next===undefined)return ''
  const [x,y]=coords(i),[tx,ty]=coords(next)
  return `<path d="M${x} ${y} Q${(x+tx)/2+(x===tx?13:0)} ${(y+ty)/2+(y===ty?-13:0)} ${tx} ${ty}"/>`
 })).join('')
 const markers=zones.map(([name,level],i)=>{
  const [x,y]=coords(i), seen=i===current||!!visited[i]?.length, task=i===objective
  return `<button class="realm-marker ${seen?'visited':''} ${i===current?'current':''}" style="--mx:${x/640*100}%;--my:${y/226*100}%"
   data-action="map-zone:${i}" aria-pressed="${i===selected}" aria-label="${name}，${i===current?'所在區域':seen?'已探索':'未探索'}，等級 ${level}${task?'，任務目標':''}">
   <svg aria-hidden="true" viewBox="-18 -17 36 33">${glyphs[landmarks[i]]}</svg>${task?'<i aria-hidden="true">◆</i>':''}<span>${name}</span></button>`
 }).join('')
 return `<div class="realm-scroll"><div class="realm-chart">
  <svg class="realm-ink" viewBox="0 0 640 226" preserveAspectRatio="none" aria-hidden="true">
   <rect x="6" y="6" width="628" height="214" rx="7" />
   <path class="realm-river" d="M536-4Q468 29 502 63T429 123Q359 155 398 232"/>
   <g class="realm-roads">${roads}</g>
   <g transform="translate(584 72)" class="realm-compass"><circle r="19"/><path d="M0-29 7 0 0 29-7 0ZM-24 0H24"/></g>
  </svg>${markers}</div></div><p class="realm-legend">金圈為所在區域 · ◆ 任務目標 · 深色地標已探索</p>`
}
