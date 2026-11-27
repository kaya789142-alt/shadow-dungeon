import { decodeSave, save, saveKey } from './model.ts'
import type { Hero } from './model.ts'

const prefix='shadow-dungeon.character.'
function archived(id:string){
 try{
  const raw=localStorage.getItem(prefix+id)
  if(!raw)return undefined
  const hero=decodeSave(raw)
  return hero.characterId===id?hero:undefined
 }catch{return undefined}
}
export function roster(current?:Hero){
 const characters=current?[current]:[]
 for(let i=0;i<localStorage.length;i++){
  const key=localStorage.key(i)
  if(!key?.startsWith(prefix))continue
  const id=key.slice(prefix.length)
  if(id===current?.characterId)continue
  const hero=archived(id)
  if(hero)characters.push(hero)
 }
 return characters
}
export function activateCharacter(current:Hero|undefined,next:Hero){
 if(current&&current.characterId!==next.characterId){
  localStorage.setItem(prefix+current.characterId,JSON.stringify(current))
 }
 // The active slot remains readable by legacy builds and existing export tools.
 save(next)
}
export function deleteCharacter(id:string,current:Hero|undefined){
 localStorage.removeItem(prefix+id)
 if(id!==current?.characterId)return current
 const replacement=roster()[0]
 if(replacement)save(replacement)
 else localStorage.removeItem(saveKey)
 return replacement
}
