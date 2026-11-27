import assert from 'node:assert/strict'
import { test } from 'node:test'
import { activateCharacter, deleteCharacter, roster } from '../src/characters.ts'
import { createHero, load, saveKey } from '../src/model.ts'

test('legacy slot and separate characters survive switching, failure and deletion',()=>{
 const contents=new Map<string,string>()
 let failedWrite=''
 const storage={
  get length(){return contents.size},
  key:(i:number)=>[...contents.keys()][i]??null,
  getItem:(key:string)=>contents.get(key)??null,
  setItem:(key:string,value:string)=>{
   if(key===failedWrite)throw Error('full')
   contents.set(key,value)
  },
  removeItem:(key:string)=>contents.delete(key)
 }
 Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true})
 const legacy:Partial<ReturnType<typeof createHero>>=createHero('原角色',0)
 legacy.gold=485
 delete legacy.characterId
 storage.setItem(saveKey,JSON.stringify(legacy))
 const first=load()!
 const second=createHero('新角色',2)
 assert.equal(first.gold,485)
 failedWrite=saveKey
 assert.throws(()=>activateCharacter(first,second))
 assert.equal(load()!.name,first.name)
 failedWrite=''
 activateCharacter(first,second)
 assert.deepEqual(roster(load()!).map(hero=>hero.name),['新角色','原角色'])
 activateCharacter(second,first)
 assert.equal(load()!.gold,485)
 assert.equal(deleteCharacter(first.characterId,first)?.characterId,second.characterId)
 assert.deepEqual(roster(load()!).map(hero=>hero.name),['新角色'])
 deleteCharacter(second.characterId,second)
 assert.equal(load(),null)
})
