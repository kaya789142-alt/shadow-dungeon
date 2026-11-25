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

test('V2.1 graphics presets respect DPR, backing-pixel budget and adaptive fallback',async()=>{
 const {backingRatio}=await import('../src/display.ts')
 assert.equal(backingRatio('balanced',3,1000,600),1)
 assert.equal(backingRatio('high',2,1000,600),2)
 assert.equal(backingRatio('ultra',3,800,600),2.5)
 assert.ok(backingRatio('ultra',3,1200,900)**2*1200*900<=4_000_001)
 assert.equal(backingRatio('ultra',3,1200,900,true),1)
 const old=createHero('清晰',0)
 const current=decodeSave(JSON.stringify({...old,preferences:{...old.preferences,detail:'ultra',size:1.35}}))
 assert.equal(current.preferences.detail,'ultra')
 assert.equal(current.preferences.size,1.35)
 assert.equal(current.bag[0].uid,old.bag[0].uid)
})

test('walkable boundaries preserve local coordinates and connect all thirteen regions',async()=>{
 const {crossing,landNeighbor,nextDirection}=await import('../src/overworld.ts')
 assert.deepEqual(crossing(0,1,1504.5,535),{zone:1,x:4.5,y:535,shift:1500})
 assert.deepEqual(crossing(1,1,-3.5,552),{zone:0,x:1496.5,y:552,shift:-1500})
 assert.equal(crossing(1,1,1501,535),undefined)
 assert.equal(crossing(1,50,1501,650),undefined)
 assert.equal(landNeighbor(8,-1),undefined)
 assert.deepEqual(crossing(0,1,760,-3),{zone:8,x:760,y:1021,shift:0,shiftY:-1024})
 assert.deepEqual(crossing(8,1,758,1027),{zone:0,x:758,y:3,shift:0,shiftY:1024})
 assert.equal(crossing(1,1,760,-3),undefined)
 assert.equal(nextDirection(0,8,1),'north')
 assert.ok(zones.every((_,i)=>i===0||nextDirection(0,i,50)))
})
test('partial pickup keeps full-bag and filtered gear on the ground without duplicating rewards',async()=>{
 const {bagLimit,collectDrop}=await import('../src/inventory.ts')
 const hero=createHero('拾取驗證',0)
 while(hero.bag.length<bagLimit)hero.bag.push(makeGear(4,0,1))
 const gear=makeGear(3,3,5)
 const drop={x:805,y:520,gold:31,material:'red' as const,gear}
 hero.drops[0]=[drop]
 assert.deepEqual(collectDrop(hero,drop,true),{gold:31,material:'red',gear:undefined,full:true})
 assert.equal(hero.gold,211)
 assert.equal(hero.items.red,9)
 assert.equal(hero.drops[0][0].gear?.uid,gear.uid)
 assert.equal(collectDrop(hero,drop,true).gold,0)
 const migrated=decodeSave(JSON.stringify(hero))
 migrated.bag.pop()
 migrated.pickup.minGrade=4
 assert.equal(collectDrop(migrated,migrated.drops[0][0],true).gear,undefined)
 assert.equal(collectDrop(migrated,migrated.drops[0][0]).gear?.uid,gear.uid)
 assert.equal(migrated.drops[0].length,0)
 assert.equal(migrated.bag.length,bagLimit)
 assert.equal(migrated.gold,211)
})
test('ground gear cannot duplicate a held UID and locked gear cannot risk destruction',()=>{
 const hero=createHero('鎖定驗證',0), gear=hero.bag[0]
 gear.plus=6
 hero.locks=[gear.uid]
 assert.match(upgrade(hero,gear,false,false,true),/保護卷軸/)
 hero.drops[0]=[{x:100,y:100,gold:0,gear:{...gear}}]
 assert.throws(()=>decodeSave(JSON.stringify(hero)),/重複/)
})
