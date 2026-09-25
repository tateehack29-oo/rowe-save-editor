import {parseSave,PROFILE,checksum} from './core.mjs';
import {readStorage} from './additions.mjs';
import {inspectRoster,calculateStats} from './roster.mjs';
export const locationName=m=>m.destination==='party'?`Party ช่อง ${m.slot+1}`:`PC กล่อง ${m.box+1} ช่อง ${m.slot+1}`;
export function at(roster,loc){if(!loc||!Number.isInteger(loc.slot))throw Error('เลือกช่องที่ถูกต้อง');if(loc.destination==='party'&&loc.slot>=0&&loc.slot<6)return roster.party[loc.slot];if(loc.destination==='pc'&&Number.isInteger(loc.box)&&loc.box>=0&&loc.box<21&&loc.slot>=0&&loc.slot<30)return roster.boxes[loc.box][loc.slot];throw Error('ตำแหน่งไม่ถูกต้อง');}
export function fingerprint(mon){return mon?Array.from(mon.raw).join(','):'empty'}
export function guardMon(bytes,loc,expected){const m=at(inspectRoster(bytes),loc);if(fingerprint(m)!==expected)throw Error('รายการถัดไปอ้างอิงโปเกมอนหรือช่องนี้ กรุณาย้อนรายการที่เกี่ยวข้องจากล่างขึ้นบนก่อน');return m;}
function partyRaw(mon,ctx){if(mon.destination==='party')return mon.raw.slice();if(!mon.editable)throw Error(mon.reason||'โปเกมอนนี้ยังถอนไม่ได้');const raw=new Uint8Array(76),v=new DataView(raw.buffer);raw.set(mon.raw);raw[60]=mon.level;raw[61]=255;const stats=calculateStats(mon,mon.ev,ctx);stats.forEach((n,i)=>v.setUint16(64+i*2,n,true));v.setUint16(62,stats[0],true);mon.moves.forEach((n,i)=>raw[52+i]=n?1:0);return raw;}
export function operate(input,{kind,from,to,confirmed=false}){
 const s=parseSave(input),r=inspectRoster(input),source=at(r,from);if(!source)throw Error('ช่องต้นทางว่าง');if(source.egg)throw Error('รุ่นนี้ยังไม่รองรับการย้าย ทำสำเนา หรือปล่อยไข่');
 const same=kind!=='release'&&to&&from.destination===to.destination&&from.slot===to.slot&&(from.destination==='party'||from.box===to.box);if(same)throw Error('เลือกช่องปลายทางอื่น');
 if(!['move','clone','release'].includes(kind))throw Error('คำสั่งไม่ถูกต้อง');const target=kind==='release'?null:at(r,to);if(target?.egg)throw Error('ยังไม่รองรับการสลับกับไข่');if(kind==='clone'&&target)throw Error('ทำสำเนาได้เฉพาะช่องว่าง');if(kind==='release'&&!confirmed)throw Error('ยืนยันการปล่อยก่อน');if(kind!=='release'&&to?.destination==='party'&&!target&&to.slot!==r.count)throw Error('เลือกช่องว่างถัดไปของ Party');
 if(kind!=='release'&&to.destination==='party'&&!target){const p=s.world+0x238+to.slot*76;if(!s.bytes.subarray(p,p+76).every((n,i)=>n===0||(i===61&&n===255)))throw Error('ช่อง Party มีข้อมูลที่ไม่รู้จัก จึงไม่เขียนทับ');}
 const party=r.party.slice(0,r.count).map(m=>m.raw.slice()),pc=readStorage(input),out=s.bytes.slice();
 const write=(loc,mon)=>{if(loc.destination==='party')party[loc.slot]=mon?partyRaw(mon,r.ctx):null;else {const p=4+(loc.box*30+loc.slot)*52;pc.fill(0,p,p+52);if(mon)pc.set(mon.raw.subarray(0,52),p);}};
 if(kind==='release')write(from,null);else {write(to,source);if(kind==='move')write(from,target);}
 const compact=party.filter(Boolean);if(compact.length>6)throw Error('Party เต็ม');if(!compact.some(raw=>!(raw[39]&128)&&new DataView(raw.buffer,raw.byteOffset,raw.byteLength).getUint16(62,true)>0))throw Error('ต้องเหลือโปเกมอนที่ไม่ใช่ไข่และมี HP อย่างน้อย 1 ตัวใน Party');
 for(let i=0;i<Math.max(r.count,compact.length);i++){const p=s.world+0x238+i*76;if(compact[i])out.set(compact[i],p);else{out.fill(0,p,p+76);out[p+61]=255;}}out[s.world+0x234]=compact.length;
 let offset=0;for(let id=5;id<=13;id++){const n=PROFILE.sizes[id],p=s.active.sections.get(id);out.set(pc.subarray(offset,offset+n),p);offset+=n;}
 const v=new DataView(out.buffer);for(const id of [1,5,6,7,8,9,10,11,12,13]){const p=s.active.sections.get(id);v.setUint16(p+0xff6,checksum(out,p,PROFILE.sizes[id]),true);}parseSave(out);return out;
}
export class History {
 constructor(bytes){this.original=bytes.slice();this.bytes=bytes.slice();this.entries=[];this.next=1;}
 push(label,apply){const next=apply(this.bytes);parseSave(next);if(next.every((x,i)=>x===this.bytes[i]))return false;this.entries.push({id:this.next++,label,apply});this.bytes=next;return true;}
 undo(id){const entries=this.entries.filter(e=>e.id!==id);let next=this.original.slice();for(const e of entries)next=e.apply(next);parseSave(next);this.entries=entries;this.bytes=next;}
}
