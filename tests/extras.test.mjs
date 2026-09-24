import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parseSave,checksum,PROFILE} from '../dist/core.mjs';
import {inspectExtras,editExtended} from '../dist/extras.mjs';
const input=process.argv[2];if(!input)throw Error('Pass a local test save; never commit user saves.');
const original=new Uint8Array(fs.readFileSync(input)),before=original.slice(),s=parseSave(original),extra=inspectExtras(original);
assert.equal(extra.party.length,1);assert.equal(extra.party[0].species,246);assert.equal(extra.party[0].level,10);assert.equal(extra.party[0].hp,30);assert.equal(extra.party[0].maxHP,30);
assert.deepEqual(extra.items.map(i=>[i.id,i.quantity]),[[90,5],[28,6],[4,10]]);
assert.deepEqual(editExtended(original,{}),original);
const changes={party:[{index:0,nickname:'LARVI',hp:29}],items:extra.items.map(i=>({offset:i.offset,id:i.id,quantity:99}))};
const output=editExtended(original,changes),edited=inspectExtras(output);assert.equal(edited.party[0].nickname,'LARVI');assert.equal(edited.party[0].hp,29);assert.equal(edited.party[0].maxHP,30);assert.ok(edited.items.every(i=>i.quantity===99));assert.equal(parseSave(output).money,s.money);assert.equal(parseSave(output).name,s.name);assert.deepEqual(original,before);
const allowed=new Set([s.world+0xff6,s.world+0xff7]);for(let i=0;i<12;i++)allowed.add(extra.party[0].offset+8+i);allowed.add(extra.party[0].offset+0x3e);allowed.add(extra.party[0].offset+0x3f);for(const item of extra.items){allowed.add(s.world+item.offset+2);allowed.add(s.world+item.offset+3)}let count=0;for(let i=0;i<original.length;i++)if(original[i]!==output[i]){assert.ok(allowed.has(i),'Unexpected change at '+i.toString(16));count++}
for(const hp of [-1,31,NaN,1.2])assert.throws(()=>editExtended(original,{party:[{index:0,hp}]}));for(const quantity of [0,100,1.1,NaN])assert.throws(()=>editExtended(original,{items:[{...extra.items[0],quantity}]}));assert.throws(()=>editExtended(original,{items:[{offset:0x610,id:467,quantity:99}]}));assert.throws(()=>editExtended(original,{party:[{index:6,hp:1}]}));assert.throws(()=>editExtended(original,{party:[{index:0,nickname:'ABCDEFGHIJK'}]}));assert.throws(()=>editExtended(original,{items:[{...extra.items[0],id:28,quantity:99}]}));
// Unknown nickname bytes remain identical when only another field changes.
const unknown=original.slice(),p=extra.party[0].offset;unknown[p+8]=0x50;new DataView(unknown.buffer).setUint16(s.world+0xff6,checksum(unknown,s.world,PROFILE.sizes[1]),true);const altered=editExtended(unknown,{party:[{index:0,nickname:inspectExtras(unknown).party[0].nickname,hp:28}]});assert.deepEqual(altered.slice(p+8,p+20),unknown.slice(p+8,p+20));
console.log(`PASS real-save analysis and bounded edits: ${count} changed bytes; all other bytes identical. No game/emulator test performed.`);
