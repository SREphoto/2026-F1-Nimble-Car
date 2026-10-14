import sys
from PIL import Image, ImageDraw
ref, ours, out = sys.argv[1:4]
a = Image.open(ref).convert('RGB'); b = Image.open(ours).convert('RGB')
h = 700; a = a.resize((int(a.width*h/a.height), h)); b = b.resize((int(b.width*h/b.height), h))
c = Image.new('RGB', (a.width+b.width+10, h+40), (20,20,20)); c.paste(a,(0,40)); c.paste(b,(a.width+10,40))
d = ImageDraw.Draw(c); d.text((10,10),'REFERENCE',fill=(255,255,255)); d.text((a.width+20,10),'OURS (body v4)',fill=(255,255,255))
c.save(out)
