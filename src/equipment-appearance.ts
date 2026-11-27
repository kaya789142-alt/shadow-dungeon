import { qualityColors } from './data'
import type { Gear } from './data'

type Anchor = [x:number,y:number,rotation?:number]
type Layer = {slot:number; shape:string; anchors:Anchor[]}

const blade='<path d="M-2-16H2L3 13 0 21-3 13Z"/><path d="M-6-13H6 M0-11V15" fill="none"/>'
const weapons=[
 blade,
 '<path d="M-6-19Q11 0-6 19L-2 0Z" fill="none"/><path d="M-6-19V19M-9 0H8"/>',
 '<path d="M0-14V23"/><path d="M0-23 5-15 0-9-5-15Z"/>',
 '<path d="M-4-9-6 12-2 5 0-8ZM3-6 4 15 8 5 7-8Z"/>',
 '<path d="M0-13V16M-6-12 0-22 5-12 2-7-2-7Z"/>'
]
const layers:Layer[]=[
 {slot:6,shape:'<path d="M1-4Q-11-2-16 18L-18 31-7 36-1 20 7 5Z" fill-opacity=".82"/><path d="M0 1Q-9 8-11 29" fill="none"/>',anchors:[[36,27,9],[37,34,8],[36,35,3],[36,30,5],[35,30,6]]},
 {slot:5,shape:'<path d="M-10-8-6-4-5 1-12 0-14-3ZM4-5 8-3 11 6 6 7 3 4Z"/>',anchors:[[56,162,6],[58,160,7],[53,161,7],[60,162,7],[56,162,5]]},
 {slot:3,shape:'<path d="M-13-9-7-13-1-10 8-12 13-7 8 1 6 11 0 14-8 9-9 0Z" fill-opacity=".88"/><path d="M-8-4 0 2 9-5M-5 4 0 8 6 4" fill="none"/>',anchors:[[51,45,11],[50,45,11],[49,46,9],[51,45,12],[51,44,12]]},
 {slot:9,shape:'<path d="M-13-4-3 0 11-3 10 2 0 5-13 1Z"/><path d="M-3 0 2-1 3 4-2 5Z" fill="#382122"/>',anchors:[[48,63,7],[48,64,6],[45,67,5],[48,65,7],[49,65,8]]},
 {slot:2,shape:'<path d="M-9 0Q-10-12 1-13 8-12 9-3L4 5 1 1-6 5Z"/><path d="M-6-1 6-4M2-3 3 2" fill="none"/>',anchors:[[62,13,15],[59,13,14],[54,15,11],[55,14,13],[61,18,14]]},
 {slot:7,shape:'<path d="M-7-3Q0 5 7-3M0 1 3 5 0 8-3 5Z" fill="none"/>',anchors:[[57,31,12],[57,32,11],[55,34,8],[56,35,10],[56,33,10]]},
 {slot:4,shape:'<path d="M-4-5H4L5 1 2 6H-3L-5 2Z"/><path d="M-3 0H3" fill="none"/>',anchors:[[23,91,8],[34,96,8],[27,94,0],[32,99,5],[29,98,8]]},
 {slot:8,shape:'<circle r="2.6"/><path d="M0-2 1-4 2-2Z"/>',anchors:[[24,96],[36,100],[28,100],[34,104],[28,103]]},
 {slot:0,shape:'',anchors:[[38,108,-35],[87,73,6],[81,47,17],[27,110,27],[37,117,-25]]},
 {slot:1,shape:'<path d="M-8-12 2-15 8-10 7 1 1 13-6 8-8 0Z"/><path d="M2-10V7M-5-2 6-6" fill="none"/>',anchors:[[86,64,12],[75,83,14],[69,68,8],[77,87,11],[80,77,8]]}
]

export function equipmentLayers(job:number,worn:Record<number,Gear>){
 const pieces=layers.flatMap(({slot,shape,anchors})=>{
  const gear=worn[slot]
  if(!gear)return []
  const [x,y,rotation=0]=anchors[job]
  const trim=qualityColors[gear.grade]
  return [`<g data-worn-layer="${slot}" transform="translate(${x} ${y}) rotate(${rotation})" fill="${trim}" stroke="#292026" stroke-width="1.2" stroke-linejoin="round">
   ${slot===0?weapons[job]:shape}${gear.plus?'<circle r="1.4" fill="#fff1b0" stroke="none"/>':''}</g>`]
 })
 return `<svg class="doll-equipment" viewBox="0 0 100 170" preserveAspectRatio="none" aria-hidden="true">${pieces.join('')}</svg>`
}
