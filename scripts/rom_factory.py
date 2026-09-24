from pathlib import Path
import sys
import struct
from unicorn import *
from unicorn.arm_const import *
rom=Path(sys.argv[1]).read_bytes()
import hashlib
assert hashlib.sha256(rom).hexdigest()=='2d1adf301d051f2cc956855c44c3931b35ddee1e3a0a586f5f324fe5064bbcf5'
u=Uc(UC_ARCH_ARM,UC_MODE_THUMB)
for addr,size in [(0,0x4000),(0x02000000,0x40000),(0x03000000,0x8000),(0x04000000,0x1000),(0x08000000,0x2000000)]:u.mem_map(addr,size)
u.mem_write(0x08000000,rom)
u.mem_write(0x02000000,bytes(13808));u.mem_write(0x02010000,bytes(3264))
for p,v in [(0x03004afc,0x02000000),(0x03004b00,0x02010000),(0x03004b04,0x02018000)]:u.mem_write(p,struct.pack('<I',v))
def swi(uc,no,data):
 pc=uc.reg_read(UC_ARM_REG_PC);op=int.from_bytes(uc.mem_read(pc-2,2),'little')&255;r0=uc.reg_read(UC_ARM_REG_R0);r1=uc.reg_read(UC_ARM_REG_R1);r2=uc.reg_read(UC_ARM_REG_R2)
 if op in [0xb,0xc]:
  unit=4 if (r2&(1<<26) or op==0xc) else 2;n=r2&0x1fffff
  if op==0xc:n=(n+7)//8*8
  src=bytes(uc.mem_read(r0,unit if r2&(1<<24) else n*unit));uc.mem_write(r1,src*n if r2&(1<<24) else src)
 elif op==6:
  a=struct.unpack('<i',struct.pack('<I',r0))[0];d=struct.unpack('<i',struct.pack('<I',r1))[0];q=int(a/d) if d else 0;uc.reg_write(UC_ARM_REG_R0,q&0xffffffff);uc.reg_write(UC_ARM_REG_R1,(a-q*d)&0xffffffff);uc.reg_write(UC_ARM_REG_R3,abs(q))
 else:raise RuntimeError(('SWI',hex(op),hex(pc)))
u.hook_add(UC_HOOK_INTR,swi)
def call(addr,args,stack=[]):
 sp=0x03007b00;u.mem_write(sp,struct.pack('<'+str(max(len(stack),1))+'I',*(stack or [0])))
 for reg,val in zip([UC_ARM_REG_R0,UC_ARM_REG_R1,UC_ARM_REG_R2,UC_ARM_REG_R3],args):u.reg_write(reg,val)
 u.reg_write(UC_ARM_REG_SP,sp);u.reg_write(UC_ARM_REG_LR,0x03007f01);u.emu_start(addr|1,0x03007f00,count=300000)
 if u.reg_read(UC_ARM_REG_PC)!=0x03007f00:raise RuntimeError('instruction budget '+hex(u.reg_read(UC_ARM_REG_PC)))
 return u.reg_read(UC_ARM_REG_R0)
def create(species,level=5):
 call(0x8098060,[0x0203c000,species,level,31],[1,0x12340000+species,1,0x12345678,0]);return bytes(u.mem_read(0x0203c000,76))
