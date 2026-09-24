"""Generate independent native-ROM stat fixtures; never publishes user save data."""
from rom_factory import *
import json,random
out=Path(sys.argv[2]);rng=random.Random(512)
cases=[]
for k in range(360):
 sid=rng.choice([1,25,150,246,292,384,493,658,888,1000,1025]);level=rng.choice([1,5,10,50,100]);raw=bytearray(create(sid,level));raw[39]=(raw[39]&~124)|((k%25)<<2);raw[41]=(raw[41]&~112)|((k%8)<<4)
 ev=[0]*6
 for j in range(510):
  if rng.random()<0.2:continue
  i=rng.randrange(6)
  if ev[i]<252:ev[i]+=1
 raw[32:38]=bytes(ev);u.mem_write(0x0203c000,bytes(raw));call(0x8099674,[0x0203c000]);result=bytes(u.mem_read(0x0203c000,76));cases.append({'raw':list(result),'stats':list(struct.unpack_from('<6H',result,64)),'bonus':[1]*6})
out.write_text(json.dumps(cases));print('native stat fixtures',len(cases))
