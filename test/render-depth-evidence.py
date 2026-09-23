"""Assemble before/after acceptance images without changing source captures."""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent / 'artifacts' / 'landscape-depth'
OUT = ROOT / 'comparisons'
FONT = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
SMALL = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
SCENES = ['bank-house','south-avenue','academy-lane','market-crossing','lantern-quarter']


def pairs(name, rows, width, height):
    margin, header, label = 20, 48, 30
    canvas = Image.new('RGB',(width*2+margin*3,header+(height+label+margin)*len(rows)), '#f2f4f4')
    draw = ImageDraw.Draw(canvas)
    draw.text((margin,12),'BEFORE',font=FONT,fill='#263535')
    draw.text((width+2*margin,12),'AFTER',font=FONT,fill='#263535')
    for i,(title,before,after) in enumerate(rows):
        y = header+i*(height+label+margin)
        draw.text((margin,y),title,font=SMALL,fill='#263535')
        for col,path in enumerate([before,after]):
            image = Image.open(path).convert('RGB')
            image.thumbnail((width,height),Image.Resampling.LANCZOS)
            canvas.paste(image,(margin+col*(width+margin),y+label))
    canvas.save(OUT/name)


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    for size in ['844x390','667x375','390x844','430x932']:
        width,height=map(int,size.split('x'))
        rows=[(f'{page} / {size}',ROOT/'before'/f'{size}-{page}.png',ROOT/'after-final'/f'{size}-{page}.png') for page in ['index','user','shop','map']]
        pairs(f'tabs-{size}.jpg',rows,width,height)
    pairs('five-streets.jpg',[(s,ROOT/'before'/f'street-{s}.png',ROOT/'after-final-hardware'/f'street-{s}.png') for s in SCENES],844,390)
    phases=Image.new('RGB',(844*2,430*2),'#f2f4f4')
    draw=ImageDraw.Draw(phases)
    for i,key in enumerate(['dawn','noon','dusk','night']):
        x,y=(i%2)*844,(i//2)*430
        draw.text((x+12,y+8),key.upper()+' / WebGL framebuffer',font=FONT,fill='#263535')
        frame=Image.open(ROOT/'after-final-hardware'/f'phase-{key}.png').convert('RGB')
        frame.thumbnail((844,390),Image.Resampling.LANCZOS)
        phases.paste(frame,(x,y+40))
    phases.save(OUT/'phases.jpg')
    before=json.loads((ROOT/'before'/'all-metrics.json').read_text(encoding='utf-8'))
    after=json.loads((ROOT/'after-final'/'tabs-metrics.json').read_text(encoding='utf-8'))
    portrait={}
    for size in ['390x844','430x932']:
        for page in ['index','user','shop','map']:
            key=f'{size}-{page}'
            portrait[key]={}
            for selector,box in before[key]['boxes'].items():
                if selector not in after[key]['boxes']:
                    continue
                a=after[key]['boxes'][selector]
                portrait[key][selector]={dim:round(a[dim]-box[dim],3) for dim in ['width','height']}
    (OUT/'portrait-dimension-deltas.json').write_text(json.dumps(portrait,indent=2),encoding='utf-8')
    print('Comparison artifacts:',OUT)


if __name__=='__main__':
    main()
