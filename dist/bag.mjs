import {parseSave,checksum,PROFILE} from './core.mjs';
import {POCKETS} from './extras.mjs';
import {ITEMS} from './catalog.mjs';
const view=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);
export function inspectBag(input){
  const s=parseSave(input),v=view(s.bytes),key=s.key&65535;
  return POCKETS.map(p=>({...p,slots:Array.from({length:p.count},(_,slot)=>{
    const offset=p.offset+slot*4,id=v.getUint16(s.world+offset,true),quantity=v.getUint16(s.world+offset+2,true)^key;
    if(id===0?quantity!==0:!ITEMS[id]||ITEMS[id].pocket!==p.id||quantity<1||quantity>9999)throw Error('ข้อมูลกระเป๋า '+p.name+' ช่อง '+(slot+1)+' ยังไม่รองรับ');
    return {pocket:p.id,slot,offset,id,quantity,name:id?ITEMS[id].name:'ช่องว่าง',max:Math.max(99,quantity)};
  })}));
}
export function editBag(input,changes=[]){
  const s=parseSave(input),out=s.bytes.slice();if(!changes.length)return out;
  const pockets=inspectBag(input),seen=new Set(),dirty=new Set();
  for(const c of changes){
    const p=pockets.find(p=>p.id===c.pocket);
    if(!p||!Number.isInteger(c.slot)||c.slot<0||c.slot>=p.count)throw Error('ช่องกระเป๋าไม่ถูกต้อง');
    const row=p.slots[c.slot],key=p.id+':'+c.slot;
    if(seen.has(key))throw Error('มีคำสั่งแก้ไขช่องเดียวกันซ้ำ');seen.add(key);
    if(c.expectedId!==row.id)throw Error('ไอเทมต้นฉบับในช่องไม่ตรงกัน');
    if(!Number.isInteger(c.id)||!ITEMS[c.id]||ITEMS[c.id].pocket!==p.id)throw Error('ไอเทมไม่อยู่ในหมวดนี้');
    const max=c.id===row.id?row.max:99;
    if(!Number.isInteger(c.quantity)||c.quantity<1||c.quantity>max)throw Error('จำนวนไอเทมต้องเป็นจำนวนเต็ม 1–'+max);
    if(c.id===row.id&&c.quantity===row.quantity)continue;
    Object.assign(row,{id:c.id,quantity:c.quantity});dirty.add(p.id);
  }
  const v=view(out);
  for(const p of pockets.filter(p=>dirty.has(p.id))){
    const occupied=p.slots.filter(r=>r.id),ids=new Set();
    for(const r of occupied){if(ids.has(r.id))throw Error('มีไอเทมชนิดนี้ในหมวดแล้ว ให้แก้จำนวนในช่องเดิม');ids.add(r.id)}
    // The game expects packed pockets: no empty slot before an occupied slot.
    for(let i=0;i<p.count;i++){
      const r=occupied[i],at=s.world+p.offset+i*4;
      v.setUint16(at,r?.id||0,true);v.setUint16(at+2,(r?.quantity||0)^(s.key&65535),true);
    }
  }
  if(dirty.size)v.setUint16(s.world+0xff6,checksum(out,s.world,PROFILE.sizes[1]),true);
  parseSave(out);inspectBag(out);return out;
}
