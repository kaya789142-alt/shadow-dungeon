import type { Gear } from './data.ts'

export function daylight(seconds:number,zone:number){
 const position=(seconds+52)%240/240
 const sun=(1+Math.cos((position-.25)*2*Math.PI))*.5
 const open=zone===0||zone===1||zone===2||zone===3||zone===8||zone===10
 const front=Math.floor(seconds/48)
 const weather=!open?'室內':front%4===1?'細雨':front%4===2?'薄霧':'晴朗'
 return {sun,open,weather,light:!open?'地底':sun>.66?'白晝':sun>.35?'暮光':'夜間'}
}

export function guardedDamage(raw:number,shield:Gear|undefined,roll:number){
 const chance=shield?Math.min(.28,.12+shield.grade*.018+shield.plus*.004):0
 const blocked=roll<chance
 return {blocked,damage:Math.max(1,Math.round(raw*(blocked?.55:1)))}
}

export function setBonus(worn:Record<number,Gear>){
 const counts=new Map<string,number>()
 for(const gear of Object.values(worn)){
  const key=gear.relic===undefined?'quality-'+gear.grade:'relic-'+gear.relic
  counts.set(key,(counts.get(key)??0)+1)
 }
 const pieces=Math.max(0,...counts.values())
 return {pieces,defense:pieces>=3?4:0,damage:pieces>=5?5:0}
}

export function trapState(seconds:number,index:number){
 const time=seconds+index*1.7
 const phase=time%4
 return {cycle:Math.floor(time/4),warning:phase>=2.1&&phase<3,active:phase>=3&&phase<3.5}
}
