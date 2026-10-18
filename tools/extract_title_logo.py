#!/usr/bin/env python3
"""Extract the game's western title logo, decoding its original texture pixels."""
import argparse,hashlib,json,struct
from PIL import Image
from build_studio_ui_assets import member

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('afs');p.add_argument('--output',type=__import__('pathlib').Path,required=True);args=p.parse_args()
 with open(args.afs,'rb')as f:spr=member(f,1935)['TitleDummy.spr'];vram=member(f,1936)['TitleDummy.vram']
 es,ss,ins=struct.unpack_from('>III',spr,20);sb,ib,db=64+es,64+es+ss,64+es+ss+ins
 for i in range(struct.unpack_from('>I',spr,72)[0]):
  n,o=struct.unpack_from('>II',spr,ib+i*32+8);name=spr[sb+n:spr.index(0,sb+n)].decode('ascii')
  if name!='main_title_logo_HOKUBEI.png':continue
  meta=struct.unpack_from('>4I4H2IB',spr,db+o);offset,size,w,h,encoding=meta[1],meta[3],meta[4],meta[5],meta[-1];assert encoding==0 and size==w*h*4
  pixels=vram[offset:offset+size];linear=bytearray(size)
  def spread(value,axis):
   out=0;shift=0
   for bit in range(max(w.bit_length()-1,h.bit_length()-1)):
    for a,length in enumerate((w,h)):
     if 1<<bit < length:
      if a==axis:out|=((value>>bit)&1)<<shift
      shift+=1
   return out
  xs=[spread(x,0)for x in range(w)];ys=[spread(y,1)for y in range(h)]
  for y in range(h):
   for x in range(w):
    src=(xs[x]|ys[y])*4;dst=(y*w+x)*4;linear[dst:dst+4]=pixels[src:src+4]
  image=Image.frombytes('RGBA',(w,h),bytes(linear),'raw','ARGB');args.output.parent.mkdir(parents=True,exist_ok=True);image.save(args.output,optimize=True)
  digest=lambda b:hashlib.sha256(b).hexdigest();manifest={'game':'BLES00978','archive':__import__('pathlib').Path(args.afs).name,'sprEntry':1935,'vramEntry':1936,'spr':'TitleDummy.spr','vram':'TitleDummy.vram','sourceName':name,'offset':offset,'size':size,'width':w,'height':h,'encoding':encoding,'conversion':'Original western Morton-swizzled ARGB8 title-screen logo unswizzled and decoded to RGBA PNG. Original transparency retained; no crop, redraw or generated artwork.','sprSha256':digest(spr),'vramSha256':digest(vram),'sourcePixelsSha256':digest(pixels),'file':args.output.name,'pngSha256':digest(args.output.read_bytes())}
  args.output.with_name('title-logo-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest,indent=2));return
 raise ValueError('Original western logo texture not found')
if __name__=='__main__':main()
