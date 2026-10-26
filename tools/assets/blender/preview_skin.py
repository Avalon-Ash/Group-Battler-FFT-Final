"""Assemble actual Blender renders for review; never paints over rendered characters."""
import argparse, json, shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[3]
CFG=json.loads((ROOT/'art-source/faction-skins/lionheartWarriorSkin.json').read_text())
DIRS=['SE','SW','NE','NW']
p=argparse.ArgumentParser()
p.add_argument('--raw',required=True)
p.add_argument('--out',required=True)
p.add_argument('--original',required=True)
p.add_argument('--animations',action='store_true')
p.add_argument('--packed',help='Separate male/female packer outputs; validate and combine into trial/')
args=p.parse_args()
raw=Path(args.raw);out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
title=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',26)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
bg=(226,231,235)
def frame(body,anim,d,n):
    return Image.open(raw/body/'BLUE_WARRIOR'/f'{anim}_{d}_{n:02}.png').convert('RGBA')
def logical_frame(body,anim,d,n):
    im=frame(body,anim,d,n)
    pad=(im.width-CFG['preview']['cellPx'])//2
    return im.crop((pad,pad,pad+CFG['preview']['cellPx'],pad+CFG['preview']['cellPx']))

def cell(sheet,im,x,y,scale=1):
    size=round(im.width*scale),round(im.height*scale)
    im=im.resize(size,Image.Resampling.LANCZOS)
    sheet.paste(im,(x,y),im)
canvas=Image.new('RGB',(1100,1170),bg);draw=ImageDraw.Draw(canvas)
draw.text((30,18),'LIONHEART WARRIOR / ACTUAL BLENDER TRIAL',font=title,fill='#22394d')
draw.text((30,55),'Original KayKit body + rig + axe | new materials, hair and fixed clasp',font=small,fill='#4a5965')
for i,d in enumerate(DIRS):draw.text((160+256*i,89),d,font=font,fill='#22394d')
for row,(label,body) in enumerate([('ORIGINAL',None),('MALE V01','male'),('FEMALE V02','female')]):
    y=118+row*270
    draw.text((20,y+10),label,font=small,fill='#22394d')
    for col,d in enumerate(DIRS):
        im=Image.open(Path(args.original)/f'idle_{d}_00.png').convert('RGBA') if body is None else logical_frame(body,'idle',d,0)
        cell(canvas,im,65+col*256,y)
draw.text((30,942),'GAME-SCALE CHECK (59 / 158.3): male / female',font=small,fill='#22394d')
for row,body in enumerate(['male','female']):
    for col,d in enumerate(DIRS):
        cell(canvas,logical_frame(body,'idle',d,0),420+col*135,960+row*95,CFG['preview']['targetHeight']/CFG['preview']['referenceHeightPx'])
canvas.save(out/'standing-four-directions.png')
closeup=Image.new('RGB',(1000,540),bg);draw=ImageDraw.Draw(closeup)
for col,body in enumerate(['male','female']):
    draw.text((col*500+25,15),body.upper()+' / FACE REVISION',font=font,fill='#22394d')
    im=logical_frame(body,'idle','SE',0).crop((70,30,175,135)).resize((500,500),Image.Resampling.NEAREST)
    closeup.paste(im,(col*500,40),im)
closeup.save(out/'face-review.png')
if args.animations:
    raw_size=frame('male','idle','SE',0).width
    meta={'idle':(6,6),'walk':(6,10),'attack':(6,12),'hit':(3,12),'death':(6,8)}
    for anim,(count,fps) in meta.items():
        frames=[]
        for n in range(count):
            sheet=Image.new('RGB',(raw_size*4,raw_size*2+48),bg);d=ImageDraw.Draw(sheet)
            d.text((20,6),f'{anim.upper()} / MALE (top) - FEMALE (bottom)',font=font,fill='#22394d')
            for row,body in enumerate(['male','female']):
                for col,direction in enumerate(DIRS):
                    cell(sheet,frame(body,anim,direction,n),col*raw_size,32+row*raw_size)
            frames.append(sheet)
        durations=[round(1000/fps)]*count
        if anim not in ('idle','walk'):durations[-1]=1000
        frames[0].save(out/f'{anim}.gif',save_all=True,append_images=frames[1:],duration=durations,loop=0,disposal=2)
        frames[0].save(out/f'{anim}-animated.png',save_all=True,append_images=frames[1:],duration=durations,loop=0,disposal=0)
        contact_cell=round(raw_size*160/CFG['preview']['cellPx'])
        contact=Image.new('RGB',(count*contact_cell,4*contact_cell+35),bg);d=ImageDraw.Draw(contact)
        d.text((8,7),f'{anim.upper()} / SE and NE / male then female',font=font,fill='#22394d')
        for row,(body,direction) in enumerate([('male','SE'),('male','NE'),('female','SE'),('female','NE')]):
            for n in range(count):cell(contact,frame(body,anim,direction,n),n*contact_cell,35+row*contact_cell,160/CFG['preview']['cellPx'])
        contact.save(out/f'{anim}-contact.png')
    # Separate native-pixel death previews: four directions in a 2x2 grid.
    for body in ('male','female'):
        frames=[]
        for n in range(meta['death'][0]):
            sheet=Image.new('RGB',(raw_size*2,raw_size*2+48),bg);draw=ImageDraw.Draw(sheet)
            draw.text((16,8),body.upper()+' / DEATH / SE SW - NE NW',font=font,fill='#22394d')
            for i,direction in enumerate(DIRS):cell(sheet,frame(body,'death',direction,n),(i%2)*raw_size,32+(i//2)*raw_size)
            frames.append(sheet)
        for suffix in ('gif','png'):
            frames[0].save(out/f'death-{body}.{suffix}',save_all=True,append_images=frames[1:],duration=[125]*5+[1000],loop=0)
    html='<!doctype html><meta charset="utf-8"><title>Lionheart skin trial</title><style>body{background:#e2e7eb;color:#22394d;font:16px sans-serif;margin:30px}img{max-width:100%}section{margin:30px 0}</style><h1>Actual Blender trial — Lionheart warrior</h1><p><strong>Trial only: check validation.json and TRIAL_REPORT.md before production replacement. All preview frames retain the original pixels/world scale and foot anchor; expanded transparent margins prevent cropping.</strong></p><p>Same KayKit body, rig and animation. Top: male V01. Bottom: female V02. Columns SE / SW / NE / NW. Attack, hit and death hold their final frame for one second before replay; idle and walk loop continuously.</p><img src="standing-four-directions.png">'
    for anim in meta:html+=f'<section><h2>{anim}</h2><img src="{anim}-animated.png"></section>'
    (out/'index.html').write_text(html,encoding='utf-8')
print('PREVIEW_DONE',out)


if args.packed:
    packed=Path(args.packed)
    trial=packed/'trial';trial.mkdir(exist_ok=True)
    combined=None;results={}
    expected={'idle':(6,6,True),'walk':(6,10,True),'attack':(6,12,False),'hit':(3,12,False),'death':(6,8,False)}
    for body in ('male','female'):
        manifest=json.loads((packed/body/'manifest.json').read_text(encoding='utf-8'))
        key='BLUE:WARRIOR:'+body.upper()
        assert set(manifest['units'])=={key}, 'Unexpected unit keys'
        source_size=manifest['cellPx'];pad=manifest.get('paddingPx',0)
        assert source_size==CFG['preview']['cellPx']+2*pad
        assert manifest['anchor']=={axis:CFG['preview']['anchor'][i]+pad for i,axis in enumerate(('x','y'))}
        assert manifest['pxPerWorldUnit']==round(CFG['preview']['cellPx']/3.6,3)
        assert manifest['directions']==DIRS
        unit=manifest['units'][key]
        assert set(unit['anims'])==set(expected)
        atlas=Image.open(packed/body/unit['file']).convert('RGBA')
        assert atlas.size==(unit['atlas']['w'],unit['atlas']['h'])
        count=0;edge_margin=source_size;clipped=[]
        for anim,(length,fps,loop) in expected.items():
            clip=unit['anims'][anim]
            assert (clip['fps'],clip['loop'])==(fps,loop)
            assert set(clip['frames'])==set(DIRS)
            for direction in DIRS:
                assert len(clip['frames'][direction])==length
                for n,rect in enumerate(clip['frames'][direction]):
                    original=frame(body,anim,direction,n)
                    assert original.size==(source_size,source_size)
                    bbox=original.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox()
                    assert bbox is not None, 'Empty source frame'
                    left,top,right,bottom=bbox
                    edge_margin=min(edge_margin,left,top,source_size-right,source_size-bottom)
                    if min(left,top,source_size-right,source_size-bottom)==0:
                        clipped.append(f'{anim}_{direction}_{n:02}.png')
                    assert (rect['w'],rect['h'])==(right-left,bottom-top)
                    assert (rect['ox'],rect['oy'])==(round(left-manifest['anchor']['x'],2),round(top-manifest['anchor']['y'],2))
                    x,y,w,h=[rect[k] for k in ('x','y','w','h')]
                    assert min(x,y)>=0 and x+w<=atlas.width and y+h<=atlas.height
                    assert atlas.crop((x,y,x+w,y+h)).getchannel('A').tobytes()==original.crop(bbox).getchannel('A').tobytes(), 'Packed alpha changed'
                    count+=1
        assert count==108
        assert len(list((raw/body/'BLUE_WARRIOR').glob('*.png')))==108, 'Extra raw frames'
        if combined is None:
            combined={k:v for k,v in manifest.items() if k!='units'}
            combined['referenceHeightPx']=CFG['preview']['referenceHeightPx']
            combined['units']={}
        combined['units'][key]=unit
        shutil.copy2(packed/body/unit['file'],trial/unit['file'])
        results[body]={'frames':count,'sourceSizePx':source_size,'paddingPx':pad,'minFrameMarginPx':edge_margin,'atlas':unit['atlas'],'idleHeightPx':unit['idleHeightPx'],'clippedFrames':clipped}
    (trial/'manifest.json').write_text(json.dumps(combined,separators=(',',':')),encoding='utf-8')
    results['referenceHeightPx']=combined['referenceHeightPx']
    results['status']='FAIL_SOURCE_CLIPPING' if any(results[b]['clippedFrames'] for b in ('male','female')) else 'PASS'
    results['checks']=['expected keys/clips/fps/loop/counts','nonempty alpha','anchor offsets','atlas bounds','packed alpha equals raw alpha']
    (out/'validation.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
    print('TRIAL_VALIDATION',json.dumps(results))
    assert results['status']=='PASS', 'Source clipping detected; trial manifest saved for inspection only'
