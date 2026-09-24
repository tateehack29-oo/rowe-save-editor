import {inspectBag,editBag} from './bag.mjs';
import {ITEMS} from './catalog.mjs';
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const button=(text,fn,cls='secondary')=>{const b=el('button',text,cls);b.type='button';b.onclick=fn;return b};
export function mountBag(root,bytes,onChange){
  const pockets=inspectBag(bytes),drafts=new Map();let active=1,selected=null,editing=false;
  const tabs=el('div',undefined,'bag-tabs'),grid=el('div',undefined,'bag-grid'),panel=el('section',undefined,'bag-panel'),status=el('p','','help');status.setAttribute('role','status');
  root.append(el('h2','กระเป๋าไอเทม'),el('p','เลือกหมวด แล้วแตะช่องเพื่อเพิ่มหรือแก้ไอเทมและจำนวน สูงสุด 99 ชิ้น (ของเดิมที่มากกว่าจะคงเพดานเดิม) ช่องว่างจะเรียงต่อท้ายเมื่อส่งออกเซฟ','help'),tabs,grid,panel,status,el('p','TM / HM และไอเทมสำคัญยังไม่เปิดให้แก้ไขในรุ่นนี้','help'));
  const key=(p,s)=>p+':'+s;
  const value=r=>drafts.get(key(r.pocket,r.slot))||r;
  function select(p,s){if(editing){status.textContent='บันทึกหรือยกเลิกค่าที่กำลังแก้ก่อนเปลี่ยนช่อง';return}active=p;selected=s;render()}
  function render(){
    tabs.replaceChildren();grid.replaceChildren();panel.replaceChildren();
    for(const p of pockets){const used=p.slots.filter(r=>value(r).id).length,b=button(p.name+' '+used+'/'+p.count,()=>select(p.id,null));b.setAttribute('aria-pressed',String(active===p.id));tabs.append(b)}
    const pocket=pockets.find(p=>p.id===active);
    for(const r of pocket.slots){const val=value(r),b=button('',()=>select(active,r.slot),'bag-slot');b.dataset.slot=r.slot;b.setAttribute('aria-pressed',String(selected===r.slot));b.append(el('small','ช่อง '+(r.slot+1)),el('strong',val.id?ITEMS[val.id].name:'＋ เพิ่มไอเทม'),el('span',val.id?'× '+val.quantity:'ว่าง'));if(drafts.has(key(active,r.slot)))b.append(el('small','แก้ไขแล้ว'));grid.append(b)}
    if(selected===null){panel.append(el('p','แตะช่องที่ต้องการแก้ไข หรือช่องว่างเพื่อเพิ่มไอเทม','help'));return}
    const original=pocket.slots[selected],cur=value(original),label=el('label','ค้นหาไอเทมในหมวด '+pocket.name),search=el('input');search.id='bag-search';label.htmlFor=search.id;search.type='search';search.placeholder='พิมพ์ชื่อ เช่น Potion หรือ a';search.autocomplete='off';
    const selectLabel=el('label','ไอเทม'),choice=el('select');choice.id='bag-item';selectLabel.htmlFor=choice.id;
    choice.append(new Option('— เลือกไอเทม —',''));
    const options=Object.entries(ITEMS).filter(([id,m])=>m.pocket===active);
    for(const [id,m] of options)choice.append(new Option(m.name+' · #'+id,id));choice.value=cur.id?String(cur.id):'';
    const matches=el('div',undefined,'search-suggestions');matches.hidden=true;matches.setAttribute('role','group');matches.setAttribute('aria-label','ผลการค้นหาไอเทม');
    const quantityLabel=el('label','จำนวน'),quantity=el('input');quantity.id='bag-quantity';quantityLabel.htmlFor=quantity.id;quantity.type='number';quantity.inputMode='numeric';quantity.min=1;quantity.step=1;quantity.value=cur.quantity||1;
    const limit=()=>{quantity.max=Number(choice.value)===original.id?original.max:99};limit();
    const mark=()=>{editing=true;status.textContent='กดบันทึกไอเทมลงรายการก่อนดาวน์โหลดเซฟ';onChange()};
    choice.onchange=()=>{limit();mark()};quantity.oninput=mark;
    search.oninput=()=>{matches.replaceChildren();matches.hidden=false;const q=search.value.trim().toLowerCase(),found=options.filter(([id,m])=>m.name.toLowerCase().includes(q)||id===q);if(!found.length)matches.append(el('p','ไม่พบไอเทมในหมวดนี้'));for(const [id,m] of found){const b=button(m.name+' · #'+id,()=>{choice.value=id;search.value=m.name;matches.hidden=true;limit();mark()},'suggestion-option');b.onpointerdown=e=>e.preventDefault();matches.append(b)}};
    search.onkeydown=e=>{if(e.key==='Enter')e.preventDefault();if(e.key==='Escape')matches.hidden=true};
    quantity.onkeydown=e=>{if(e.key==='Enter')e.preventDefault()};
    const save=button('บันทึกไอเทมลงรายการ',()=>{
      try{
        if(!quantity.value.trim()||!choice.value)throw Error('เลือกไอเทมและระบุจำนวนก่อน');
        const change={pocket:active,slot:selected,expectedId:original.id,id:Number(choice.value),quantity:Number(quantity.value)},next=new Map(drafts);
        if(change.id===original.id&&change.quantity===original.quantity)next.delete(key(active,selected));else next.set(key(active,selected),change);
        editBag(bytes,[...next.values()]);drafts.clear();for(const [k,v] of next)drafts.set(k,v);
        editing=false;render();status.textContent='บันทึกลงรายการแล้ว กดดาวน์โหลดเซฟที่แก้ไขเพื่อรับไฟล์';onChange();
      }catch(e){status.textContent=e.message}
    },'primary');save.id='bag-apply';
    const cancel=button('ยกเลิกค่าที่ยังไม่บันทึก',()=>{editing=false;render();status.textContent='ยกเลิกค่าที่ยังไม่บันทึกแล้ว';onChange()});cancel.id='bag-cancel';
    const undo=button('คืนค่าช่องนี้ตามเซฟต้นฉบับ',()=>{drafts.delete(key(active,selected));editing=false;render();status.textContent='คืนค่าช่องนี้แล้ว';onChange()});
    panel.append(el('h3',pocket.name+' · ช่อง '+(selected+1)),label,search,matches,selectLabel,choice,quantityLabel,quantity,save,cancel,undo);
  }
  render();return {changes:()=>[...drafts.values()],pending:()=>editing};
}
