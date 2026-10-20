"""Pixel-preserving review boards; the actual application screenshots are not retouched."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parent
reference=Image.open(root/'approved-reference.jpg').convert('RGB')
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
for width,height in [(360,800),(393,852)]:
    gallery=Image.new('RGB',(width*3+64,height+64),'#eeece6');draw=ImageDraw.Draw(gallery)
    for i,state in enumerate(['working','mistake','completed']):
        actual=Image.open(root/f'{state}-{width}.png').convert('RGB')
        assert actual.size==(width,height)
        draw.text((16+i*(width+16),16),state.title(),font=font,fill='#373947')
        gallery.paste(actual,(16+i*(width+16),48))
        left=reference.crop((round(i*reference.width/3),0,round((i+1)*reference.width/3),reference.height))
        left=left.resize((width,round(left.height*width/left.width)),Image.Resampling.LANCZOS)
        sheet=Image.new('RGB',(2*width+48,max(left.height,actual.height)+64),'#eeece6');sd=ImageDraw.Draw(sheet)
        sd.text((16,16),'Approved reference',font=font,fill='#373947')
        sd.text((width+32,16),f'Actual browser · {width}px',font=font,fill='#373947')
        sheet.paste(left,(16,48));sheet.paste(actual,(width+32,48))
        sheet.save(root/f'compare-{state}-{width}.png')
    gallery.save(root/f'actual-states-{width}.png')
print('Six actual screenshots checked; six reference comparisons and two galleries produced.')
