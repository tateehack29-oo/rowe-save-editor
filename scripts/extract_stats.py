"""Extract stat metadata from the fingerprinted user ROM, using native form mapping."""
from rom_factory import *
import json
out=Path(__file__).resolve().parents[1]/'dist'
names=json.loads((out/'catalog.mjs').read_text().split('export const SPECIES=')[1].split(';')[0])
def ptr(a):return struct.unpack_from('<I',rom,a)[0]-0x8000000
base=ptr(0x99518);alt=ptr(0x994b8);partner=ptr(0x994b4);exp=ptr(0x9a574);bonus=ptr(0x24e2d4)
meta={}
for key in names:
 sid=int(key)
 if sid==0:continue
 formTable=struct.unpack_from('<I',rom,ptr(0xa1890)+sid*4)[0];forms=[]
 if formTable:
  for f in range(32):
   mapped=struct.unpack_from('<H',rom,formTable-0x8000000+f*2)[0]
   if mapped==65535:break
   forms.append(mapped)
 else:forms=[sid]
 meta[key]={'forms':forms,'base':list(struct.unpack_from('<6H',rom,base+sid*64)),'alt':list(struct.unpack_from('<6H',rom,alt+sid*64)),'partner':list(struct.unpack_from('<6H',rom,partner+sid*64)),'growth':rom[base+call(0x80a1c8c,[sid])*64+27]}
data={'species':meta,'experience':[list(struct.unpack_from('<101I',rom,exp+g*404)) for g in range(6)],'nature':[list(struct.unpack_from('<5b',rom,ptr(0x9ec54)+n*5)) for n in range(25)],'bonusOffset':struct.unpack_from('<I',rom,0x24e2d0)[0],'bonusCaps':[rom[bonus+i*836+832] for i in [16,17,18,21,19,20]],'flagOffset':struct.unpack_from('<I',rom,0xe101c)[0]}
data['varOffset']=struct.unpack_from('<i',rom,0xe0f38)[0]
data['caps']=[list(struct.unpack_from('<152H',rom,ptr(0x37b1c)+d*304)) for d in range(5)]
(out/'stat-data.mjs').write_text('export const STAT_DATA='+json.dumps(data,separators=(',',':'))+';\n')
print('extracted',len(meta),'species; bonus offset',data['bonusOffset'],'caps',data['bonusCaps'],'flags',data['flagOffset'])
