import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allMonsters, jobs, monsters, safeZone, zoneRoutes, quests, rules, zones } from '../src/data.ts'
import { attributes, createHero, decodeSave, giveXp, makeGear, makeRelic, qualityRoll, record, rollover, upgrade, upgradeInfo } from '../src/model.ts'

test('five classes, legacy IDs and the new expedition zones remain consistent',()=>{
 assert.equal(jobs.length,5)
 assert.ok(jobs.every(job=>job.skills.length===5))
 assert.equal(zones.length,13)
 assert.equal(allMonsters.length,51)
 assert.deepEqual(allMonsters.slice(0,35),monsters)
 assert.equal(allMonsters[50].rank,'世界魔王')
 assert.deepEqual(zoneRoutes(11),[10,12])
 assert.equal(safeZone(8),true)
 assert.ok(monsters.length>=25)
 assert.equal(new Set(monsters.filter(m=>m.boss).map(m=>m.pattern)).size,5)
 assert.ok(quests.length>=20)
 assert.ok(quests.filter(q=>q.target!==undefined).every(q=>allMonsters[q.target!].zone===q.zone))
})
test('level growth and cap preserve HP and distinct jobs',()=>{
 const mage=createHero('月蝕',2), knight=createHero('鐵壁',0)
 assert.ok(attributes(mage).magic>attributes(knight).magic)
 assert.ok(attributes(knight).hp>attributes(mage).hp)
 assert.equal(giveXp(mage,10000000),49)
 assert.equal(mage.level,rules.maxLevel)
 assert.equal(mage.hp,attributes(mage).hp)
 assert.equal(mage.xp,0)
})
test('weighted drops honor rarity floors',()=>{
 assert.equal(qualityRoll(0),0)
 assert.equal(qualityRoll(.99999),5)
 assert.equal(qualityRoll(0,2),2)
 assert.equal(qualityRoll(0,5),5)
})
test('safe and risky upgrades charge once, require confirmation and respect protection',()=>{
 const hero=createHero('鍛匠',0), weapon=hero.bag[0]
 weapon.plus=5
 assert.equal(upgradeInfo(weapon,false).chance,1)
 assert.equal(upgrade(hero,weapon,false,false,false,()=>.99),'強化成功')
 assert.equal(weapon.plus,6)
 hero.gold=500
 const scrolls=hero.items.weapon
 assert.equal(upgrade(hero,weapon),'請確認高風險強化')
 assert.equal(hero.gold,500)
 assert.equal(hero.items.weapon,scrolls)
 assert.equal(upgrade(hero,weapon,false,true,true,()=>.99),'強化失敗，保護卷軸已生效')
 assert.equal(weapon.plus,6)
 assert.equal(hero.items.protect,0)
 const random=[.99,.1]
 assert.equal(upgrade(hero,weapon,false,false,true,()=>random.shift()!),'強化失敗，裝備已損毀')
 assert.equal(hero.bag.includes(weapon),false)
})
test('quest progress is scoped to region and target, and daily status resets',()=>{
 const hero=createHero('探路者',3)
 hero.quests.hunt0=0
 hero.quests.daily=0
 record(hero,'kill',1,0)
 assert.equal(hero.quests.hunt0,0)
 hero.zone=1
 record(hero,'kill',1,1)
 record(hero,'kill',20,0)
 assert.equal(hero.quests.hunt0,6)
 assert.equal(hero.quests.daily,8)
 hero.daily='1970-01-01';hero.claims.daily=true
 rollover(hero)
 assert.equal(hero.quests.daily,undefined)
 assert.equal(hero.claims.daily,undefined)
})
test('save import validates nested fields, gear IDs and inventory uniqueness',()=>{
 const hero=createHero('旅人',4)
 hero.bag.push(makeGear(8,5,25))
 assert.deepEqual(decodeSave(JSON.stringify(hero)),hero)
 assert.throws(()=>decodeSave(JSON.stringify({...hero,job:10})))
 assert.throws(()=>decodeSave(JSON.stringify({...hero,items:{red:1}})))
 assert.throws(()=>decodeSave(JSON.stringify({...hero,bag:[hero.bag[0],hero.bag[0]]})))
 assert.throws(()=>decodeSave(JSON.stringify({...hero,bag:[{...hero.bag[0],uid:'"><img>'}]})))
})

test('click navigation plans a walk around an impassable wall',async()=>{
 const { clearPath, makeRoute }=await import('../src/navigation.ts')
 const start={x:40,y:90},goal={x:190,y:90}
 const passable=(x:number,y:number)=>x>0&&x<220&&y>0&&y<220&&(!(x>76&&x<124)||y>143)
 assert.equal(clearPath(start,goal,passable),false)
 const route=makeRoute(start,goal,220,220,passable)
 assert.deepEqual(route.at(-1),goal)
 assert.ok(route.some(point=>point.y>143))
 assert.ok(route.every((point,i)=>clearPath(i===0?start:route[i-1],point,passable)))
})

test('V1 save loads with its original equipment, zone and progress and V2 defaults',()=>{
 const original=createHero('延續者',3)
 Object.assign(original,{level:30,zone:6,x:879,y:551,gold:734})
 original.bag[0].plus=5
 original.vault=[makeGear(8,3,29)]
 original.explored[6]=[1,2,35]
 original.quests.hunt5=2
 original.skills=[5,4,3,2,1]
 const {preferences:_,items:{blink:__,...items},...legacy}=original
 const loaded=decodeSave(JSON.stringify({...legacy,items}))
 assert.deepEqual(loaded,{...original,items:{...items,blink:0}})
})
test('new relics round-trip and identified gear contributes bounded leech',()=>{
 const hero=createHero('灰港旅人',0)
 hero.zone=12
 hero.hidden=[12]
 hero.chests=[9,11,12]
 hero.worn[0]=makeRelic(0,5,50,0,4)
 assert.equal(attributes(hero).leech,0)
 hero.worn[0].identified=true
 assert.equal(attributes(hero).leech,.07)
 assert.deepEqual(decodeSave(JSON.stringify(hero)),hero)
 hero.worn[0].element=12
 assert.throws(()=>decodeSave(JSON.stringify(hero)))
})
