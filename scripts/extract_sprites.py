from pathlib import Path
from PIL import Image,ImageDraw
import struct,json,hashlib,sys,urllib.request
root=Path(__file__).resolve().parents[1];b=Path(sys.argv[1]).read_bytes();assert hashlib.sha256(b).hexdigest()=='2d1adf301d051f2cc956855c44c3931b35ddee1e3a0a586f5f324fe5064bbcf5'
mons=json.loads((root/'dist/mon-index.mjs').read_text().split('export const MON_INDEX=')[1].split(';')[0]);out=root/'dist/sprites';out.mkdir(exist_ok=True)
def lz(p):
 assert b[p]==0x10,(hex(p),b[p]);n=int.from_bytes(b[p+1:p+4],'little');p+=4;res=bytearray()
 while len(res)<n:
  flags=b[p];p+=1
  for j in range(8):
   if len(res)>=n:break
   if flags&(128>>j):
    x,y=b[p:p+2];p+=2;length=(x>>4)+3;dist=((x&15)<<8|y)+1
    for _ in range(length):res.append(res[-dist])
   else:res.append(b[p]);p+=1
 return res[:n]
failed=[];samples=[]
for mon in mons:
 i=mon['id']
 if i in [1017,1020,1021,1022,1023,1024,1025,1847] and (out/f'{i}.png').exists():continue
 try:
  pixels=lz(struct.unpack_from('<I',b,0x3e0aa4+i*8)[0]-0x8000000);pal=lz(struct.unpack_from('<I',b,0x3d35dc+i*8)[0]-0x8000000);assert len(pixels)>=2048 and len(pal)>=2 and len(pal)//2>max(max(x&15,x>>4) for x in pixels[:2048])
  colors=[]
  for j in range(16):
   v=int.from_bytes(pal[j*2:j*2+2],'little');colors.append(((v&31)*255//31,((v>>5)&31)*255//31,((v>>10)&31)*255//31,255 if j else 0))
  im=Image.new('RGBA',(64,64))
  for y in range(64):
   for x in range(64):
    p=((y//8)*8+x//8)*32+(y%8)*4+x%8//2;v=(pixels[p]>>(4*(x%2)))&15;im.putpixel((x,y),colors[v])
  assert im.getbbox();im.save(out/f'{i}.png',optimize=True)
  if len(samples)<12 or mon['name'] in ['Pikachu','Mewtwo','Larvitar','Rayquaza','Ogerpon','Pecharunt']:samples.append((mon,im))
 except Exception as e:failed.append([mon,str(e)])
assert not failed,failed
for i in [1017,1020,1021,1022,1023,1024,1025,1847]:
 if (out/f'{i}.png').exists():continue
 url=f'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{i}.png'
 if i==1847:url=json.load(urllib.request.urlopen('https://pokeapi.co/api/v2/pokemon/terapagos-terastal',timeout=20))['sprites']['front_default']
 data=urllib.request.urlopen(url,timeout=20).read()
 assert data[:8]==b'\x89PNG\r\n\x1a\n'
 (out/f'{i}.png').write_bytes(data)
print('Verified',len(mons),'sprites; eight supplemental PokeAPI images')
