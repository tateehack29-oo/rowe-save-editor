"""Add every implemented named form from the exact ROM, and extract editor catalogs.
Names for older forms: BelialClover/RoweSource include/constants/species.h;
newer unmatched forms retain an explicit ROM ID instead of guessing a name.
"""
from rom_factory import *
import json,re,hashlib,time
root=Path(__file__).resolve().parents[1];out=root/'dist';research=Path(sys.argv[2])
def u16(p):return struct.unpack_from('<H',rom,p)[0]
def u32(p):return struct.unpack_from('<I',rom,p)[0]
def decode(raw):
 result=''
 for c in raw:
  if c==255:break
  result+=chr(c-122) if 187<=c<=212 else chr(c-116) if 213<=c<=238 else chr(c-113) if 161<=c<=170 else {0:' ',0xad:'.',0xae:'-',0xb4:"'",0xb5:'♂',0xb6:'♀',0x1b:'é',0xba:':',0xac:'?',0xab:'!',0xb8:',',0xb0:'…',0xf0:':'}.get(c,'�')
 return result.strip()
old=json.loads((out/'mon-index.mjs').read_text().split('export const MON_INDEX=')[1].split(';')[0]);oldids={x['id'] for x in old if 'offset' in x};data=bytearray((out/'mon-templates.bin').read_bytes());names={};spec={};formptr=u32(0xa1890)-0x8000000
for sid in range(1,1960):
 name=decode(rom[0x4180a4+13*sid:0x4180a4+13*(sid+1)]);stats=list(struct.unpack_from('<6H',rom,0x502c54+64*sid))
 if not name or '�' in name or name in ['Egg','??????????','????????????'] or not all(0<x<1000 for x in stats):continue
 names[sid]=name;p=u32(formptr+sid*4)-0x8000000;forms=[]
 if p>=0:
  for f in range(32):
   value=u16(p+f*2)
   if value==65535:break
   forms.append(value)
 else:forms=[sid]
 spec[sid]={'forms':forms,'gender':rom[0x502c54+sid*64+24], 'abilities':[u16(0x502c54+sid*64+k) for k in [30,32,36]],'altAbilities':[u16(0x526bd8+sid*64+k) for k in [30,32,36]]}
labels={}
def norm(s):return re.sub('[^a-z0-9]','',s.lower())
for constant,n in re.findall(r'#define SPECIES_(\w+)\s+FORMS_START\s*\+\s*(\d+)',(research/'include_constants_species.h').read_text()):
 sid=1500+int(n)
 if sid in names:
  base=names[sid];prefix=constant[:len(re.sub('[^A-Za-z0-9]','',base))]
  # Most names have no punctuation; split using matching normalization.
  tokens=constant.split('_');cut=None
  for i in range(1,len(tokens)+1):
   if norm('_'.join(tokens[:i]))==norm(base):cut=i;break
  if cut is not None:labels[sid]=base+' · '+' '.join(tokens[cut:]).title().replace('Alolan','Alola').replace('Galarian','Galar')
for sid in list(range(1809,1824))+[1825]:labels[sid]=names[sid]+' · Hisui'
extra={1824:'White-Striped',1826:'Paldea Combat Breed',1827:'Paldea Blaze Breed',1828:'Paldea Aqua Breed',1829:'Bloodmoon',1830:'Hero',1831:'Three-Segment',1832:'Family of Three',1833:'Curly',1834:'Droopy',1835:'Stretchy',1840:'Paldea',1841:'Wellspring Mask',1842:'Hearthflame Mask',1843:'Cornerstone Mask',1844:'Origin',1845:'Origin',1846:'Therian',1847:'Terastal',1848:'Female',1849:'Artisan',1850:'Masterpiece'}
for sid,label in extra.items():
 if sid in names:labels[sid]=names[sid]+' · '+label
for sid in list(range(1851,1867))+list(range(1914,1923)):
 if sid in names:labels[sid]=names[sid]+' · Gigantamax'
for sid in [1923,1924]:
 if sid in names:labels[sid]=names[sid]+' · Gigantamax '+('Single Strike' if sid==1923 else 'Rapid Strike')
# Keep catalog ordering by original species, then explicit form labels.
entries=[];failed=[];started=time.time()
u.mem_write(0x02000000,bytes(13808));u.mem_write(0x02010000,bytes(3264));u.mem_write(0x02010000,bytes([0xce,0xcc,0xbb,0xc3,0xc8,0xbf,0xcc,0xff]));u.mem_write(0x0201000a,struct.pack('<I',0x12345678))
for sid,name in names.items():
 forms=spec[sid]['forms'];form=forms.index(sid) if sid in forms else 0;base=forms[0] if sid in forms else sid
 if sid in forms and (base not in spec or form>=len(spec[base]['forms']) or spec[base]['forms'][form]!=sid):base=sid
 if sid in oldids:
  entry=dict(next(x for x in old if x['id']==sid));entry.update(species=base,form=form);entries.append(entry);continue
 try:
  records=[]
  for level in range(1,101):
   call(0x8098060,[0x0203c000,base,level,31],[1,0x12340000+sid,1,0x12345678,form]);raw=bytes(u.mem_read(0x0203c000,76))
   actual=call(0x809af5c,[0x0203c000,11,0]);f=call(0x809af5c,[0x0203c000,89,0]);assert call(0x80a1874,[actual,f])==sid,(sid,actual,f)
   assert raw[60]==level and u16(0x502c54+sid*64)>0
   u.mem_write(0x0203d000,raw[:52]);call(0x809a4dc,[0x0203d000,0x0203d100]);back=bytes(u.mem_read(0x0203d100,76));assert back[60:61]==raw[60:61] and back[64:76]==raw[64:76]
   records.append(raw)
  entries.append({'id':sid,'species':base,'form':form,'name':labels.get(sid,name+f' · Form #{sid}'),'offset':len(data)});data.extend(b''.join(records))
 except Exception as e:
  failed.append([sid,str(e)]);entries.append({'id':sid,'species':base,'form':form,'name':labels.get(sid,name+f' · Form #{sid}'),'unavailable':'ตารางฟอร์มใน ROM นี้ชี้ไปยังฟอร์มอื่น จึงยังเพิ่มฟอร์มนี้ไม่ได้'})
 if len(entries)%100==0:print('catalog',len(entries),'seconds',round(time.time()-started),flush=True)
# IDs and names are read directly from this ROM, not the older source snapshot.
abilities={i:decode(rom[0x422c58+i*21:0x422c58+(i+1)*21]) for i in range(400)};abilities={i:n for i,n in abilities.items() if n and '�' not in n}
moveBase=u32(0x44840)-0x8000000
moves={}
for i in range(1024):
 name=decode(rom[0x41e42c+i*17:0x41e42c+(i+1)*17]);pp=rom[moveBase+i*56+5]
 if name and '�' not in name and (i==0 or 1<=pp<=64):moves[i]={'name':name,'pp':pp}
(out/'mon-templates.bin').write_bytes(data);(out/'mon-index.mjs').write_text('export const MON_INDEX='+json.dumps(entries,ensure_ascii=False,separators=(',',':'))+';\nexport const TEMPLATE_SHA256='+json.dumps(hashlib.sha256(data).hexdigest())+';\n')
(out/'editor-data.mjs').write_text('export const EDITOR_DATA='+json.dumps({'species':spec,'names':names,'abilities':abilities,'moves':moves},ensure_ascii=False,separators=(',',':'))+';\n')
# Extend name catalog for punctuation-containing forms previously excluded.
p=out/'catalog.mjs';text=p.read_text();head=text.split('export const SPECIES=')[0];p.write_text(head+'export const SPECIES='+json.dumps(names,ensure_ascii=False,separators=(',',':'))+';\n')
print(json.dumps({'total':len(entries),'added':len(entries)-len(old),'failed':failed,'moves':len(moves),'abilities':len(abilities),'bytes':len(data)}),flush=True)
