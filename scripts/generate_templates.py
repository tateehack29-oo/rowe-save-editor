from rom_factory import *
import json,time,hashlib
out=Path(__file__).resolve().parents[1]/'dist';names=json.loads((out/'catalog.mjs').read_text().split('export const SPECIES=')[1].split(';')[0]);seen=set();catalog=[];data=bytearray();fail=[];t=time.time()
# Generate with normal zeroed game flags and neutral placeholder trainer; no user save data is published.
u.mem_write(0x02000000,bytes(13808));u.mem_write(0x02010000,bytes(3264));u.mem_write(0x02010000,bytes([0xce,0xcc,0xbb,0xc3,0xc8,0xbf,0xcc,0xff]));u.mem_write(0x0201000a,struct.pack('<I',0x12345678))
for sid,name in names.items():
 sid=int(sid)
 if name in seen or name in ['Egg','??????????'] or '?' in name:continue
 try:
  trial=create(sid,5)
  if call(0x809af5c,[0x0203c000,11,0])!=sid or trial[60]!=5 or int.from_bytes(trial[64:66],'little')<1:continue
  records=[]
  for level in range(1,101):
   mon=create(sid,level)
   if call(0x809af5c,[0x0203c000,11,0])!=sid or mon[60]!=level:raise ValueError('species/level')
   # Compare stats/level to the game's actual PC withdrawal conversion.
   u.mem_write(0x0203d000,mon[:52]);call(0x809a4dc,[0x0203d000,0x0203d100]);back=bytes(u.mem_read(0x0203d100,76))
   if back[60:61]!=mon[60:61] or back[64:76]!=mon[64:76]:raise ValueError('PC conversion')
   records.append(mon)
  catalog.append({'id':sid,'name':name,'offset':len(data)});data.extend(b''.join(records));seen.add(name)
 except Exception as e:fail.append([sid,str(e)])
 if len(catalog)%100==0:print('generated',len(catalog),'seconds',round(time.time()-t),flush=True)
(out/'mon-templates.bin').write_bytes(data)
(out/'mon-index.mjs').write_text('export const MON_INDEX='+json.dumps(catalog,ensure_ascii=False)+';\nexport const TEMPLATE_SHA256='+json.dumps(hashlib.sha256(data).hexdigest())+';\n')
print(json.dumps({'count':len(catalog),'size':len(data),'seconds':time.time()-t,'fail':fail}))
print('DONE',len(catalog),len(data),'fail',fail[:10],flush=True)
