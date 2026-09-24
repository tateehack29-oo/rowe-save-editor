import fs from 'node:fs';import assert from 'node:assert/strict';
import {parseSave,checksum,PROFILE} from '../dist/core.mjs';
import {inspectBag,editBag} from '../dist/bag.mjs';import {ITEMS} from '../dist/catalog.mjs';
const input=new Uint8Array(fs.readFileSync(process.argv[2])),before=input.slice(),s=parseSave(input),pockets=inspectBag(input);
assert.equal(pockets.length,8);assert.deepEqual(editBag(input,[]),input);
let changes=[];for(const p of pockets){const used=new Set(p.slots.map(r=>r.id)),id=Number(Object.keys(ITEMS).find(id=>ITEMS[id].pocket===p.id&&!used.has(Number(id))));assert.ok(id);changes.push({pocket:p.id,slot:p.count-1,expectedId:0,id,quantity:99})}
const out=editBag(input,changes),after=inspectBag(out);assert.deepEqual(input,before);
for(const c of changes){const p=after.find(p=>p.id===c.pocket),rows=p.slots.filter(r=>r.id);assert.equal(rows.at(-1).id,c.id);assert.equal(rows.at(-1).quantity,99);assert.ok(p.slots.slice(rows.length).every(r=>r.id===0&&r.quantity===0));}
const allowed=new Set([s.world+0xff6,s.world+0xff7]);for(const p of pockets)for(let j=0;j<p.count*4;j++)allowed.add(s.world+p.offset+j);
for(let i=0;i<input.length;i++)if(input[i]!==out[i])assert.ok(allowed.has(i),'Unrelated byte changed '+i);
for(const c of changes){const r=pockets.find(p=>p.id===c.pocket).slots.find(r=>r.id);if(r){const replacement={...c,slot:r.slot,expectedId:r.id,quantity:10};assert.equal(inspectBag(editBag(input,[replacement])).find(p=>p.id===c.pocket).slots[r.slot].id,c.id)}}
for(const quantity of [0,-1,100,NaN,1.2])assert.throws(()=>editBag(input,[{...changes[0],quantity}]));
assert.throws(()=>editBag(input,[{...changes[0],expectedId:123}]));assert.throws(()=>editBag(input,[{...changes[0],pocket:10}]));assert.throws(()=>editBag(input,[{...changes[0],slot:-1}]));assert.throws(()=>editBag(input,[changes[0],changes[0]]));assert.throws(()=>editBag(input,[{...changes[0],id:changes[1].id}]));
const p=pockets.find(p=>p.slots.some(r=>r.id)),r=p.slots.find(r=>r.id);assert.throws(()=>editBag(input,[{pocket:p.id,slot:p.count-1,expectedId:0,id:r.id,quantity:1}]));
const more=input.slice(),v=new DataView(more.buffer);v.setUint16(s.world+r.offset+2,200^(s.key&65535),true);v.setUint16(s.world+0xff6,checksum(more,s.world,PROFILE.sizes[1]),true);
assert.deepEqual(editBag(more,[{pocket:p.id,slot:r.slot,expectedId:r.id,id:r.id,quantity:200}]),more);
assert.equal(inspectBag(editBag(more,[{pocket:p.id,slot:r.slot,expectedId:r.id,id:r.id,quantity:199}])).find(x=>x.id===p.id).slots[r.slot].quantity,199);
console.log('PASS: all 8 pockets, adding/replacing/quantities, compact slots, duplicates, no-op, invalid requests, encrypted quantities, unrelated-byte preservation.');
