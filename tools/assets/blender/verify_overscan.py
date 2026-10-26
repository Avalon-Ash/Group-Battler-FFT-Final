"""Verify padded trial renders preserve projection, scale, foot-relative pixels and formal assets."""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image, ImageChops, ImageStat, ImageDraw, ImageFont

p=argparse.ArgumentParser()
p.add_argument('--before',required=True)
p.add_argument('--after',required=True)
p.add_argument('--before-packed',required=True)
p.add_argument('--packed',required=True)
p.add_argument('--out',required=True)
args=p.parse_args()
root=Path(__file__).resolve().parents[3]
before=Path(args.before);after=Path(args.after)
old_manifest=json.loads((Path(args.before_packed)/'manifest.json').read_text())
new_manifest=json.loads((Path(args.packed)/'manifest.json').read_text())
assert old_manifest['referenceHeightPx']==new_manifest['referenceHeightPx']==158.3
assert old_manifest['pxPerWorldUnit']==new_manifest['pxPerWorldUnit']
results={}
def mask(im):return im.getchannel('A').point(lambda a:255 if a>8 else 0)
def visible_rgb(im):return Image.alpha_composite(Image.new('RGBA',im.size,(0,0,0,255)),im).convert('RGB')
for body in ('male','female'):
    meta=json.loads((after/body/'render-meta.json').read_text())
    pad=meta['paddingPx'];base=meta['baseCellPx'];size=meta['cellPx']
    assert base==256 and size==base+2*pad and meta['outlinePx']==2
    assert meta['baseAnchor']=={'x':128,'y':184.32}
    assert meta['anchor']==new_manifest['anchor']
    error=max(abs(new[i]-pad-old[i]) for old,new in zip(meta['baseProjectionProbes'],meta['expandedProjectionProbes']) for i in range(2))
    assert error<0.001, 'Camera projection changed beyond floating-point tolerance'
    assert max(abs(meta['baseProjectionProbes'][0][i]-meta['baseAnchor'][axis]) for i,axis in enumerate(('x','y')))<0.001
    files=sorted((before/body/'BLUE_WARRIOR').glob('*.png'))
    assert len(files)==108
    min_iou=1;max_diff=0;min_margin=size;recovered=[];stable_offsets=0
    key='BLUE:WARRIOR:'+body.upper()
    for file in files:
        old=Image.open(file).convert('RGBA');new=Image.open(after/body/'BLUE_WARRIOR'/file.name).convert('RGBA')
        assert new.size==(size,size)
        crop=new.crop((pad,pad,pad+base,pad+base))
        a,b=mask(old),mask(crop)
        intersection=sum(ImageChops.darker(a,b).histogram()[1:]);union=sum(ImageChops.lighter(a,b).histogram()[1:])
        iou=intersection/union;min_iou=min(min_iou,iou)
        assert iou>=0.999, f'Foot-relative silhouette moved: {file.name}: {iou}'
        diff=sum(ImageStat.Stat(ImageChops.difference(visible_rgb(old),visible_rgb(crop))).mean)/3
        max_diff=max(max_diff,diff)
        assert diff<0.5, f'Overlapping visible pixels changed: {file.name}: {diff}'
        box=new.getchannel('A').getbbox();assert box
        margin=min(box[0],box[1],size-box[2],size-box[3]);min_margin=min(min_margin,margin)
        assert margin>=16, f'Insufficient full-alpha border: {file.name}: {margin}'
        old_box=mask(old).getbbox();old_clipped=min(old_box[0],old_box[1],base-old_box[2],base-old_box[3])==0
        anim,direction,number=file.stem.split('_');n=int(number)
        old_rect=old_manifest['units'][key]['anims'][anim]['frames'][direction][n]
        new_rect=new_manifest['units'][key]['anims'][anim]['frames'][direction][n]
        if old_clipped:
            assert mask(new).getbbox()[2]-mask(new).getbbox()[0]>old_box[2]-old_box[0] or mask(new).getbbox()[3]-mask(new).getbbox()[1]>old_box[3]-old_box[1]
            recovered.append(file.name)
        else:
            assert all(old_rect[k]==new_rect[k] for k in ('ox','oy','w','h')), f'Unclipped draw rectangle changed: {file.name}'
            stable_offsets+=1
    assert len(recovered)==8
    results[body]={'frames':108,'recoveredFrames':recovered,'unchangedDrawRectangles':stable_offsets,'projectionErrorPx':error,'minOverlapSilhouetteIoU':min_iou,'maxOverlapMeanRGBDiff':max_diff,'minimumFullAlphaMarginPx':min_margin,'baseAnchor':meta['baseAnchor'],'rawAnchor':meta['anchor'],'sourceSizePx':size,'pxPerWorldUnit':meta['pxPerWorldUnit']}
records=json.loads((root/'docs/art/lionheart-warrior-v01/trial/asset-integrity.json').read_text())['formalAssets']
for item in records:assert hashlib.sha256((root/item['path']).read_bytes()).hexdigest().upper()==item['before']
results['formalFilesUnchanged']=len(records);results['status']='PASS'
Path(args.out).write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
print(json.dumps(results,indent=2))

# A same-pixel-size comparison with the old viewport and the fixed ground-origin cross.
size=new_manifest['cellPx'];pad=new_manifest['paddingPx'];gap=32;top=48
sheet=Image.new('RGB',(size*2+gap,size*2+top),(226,231,235))
draw=ImageDraw.Draw(sheet);font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
draw.text((10,8),'BEFORE / original viewport',font=font,fill='#22394d')
draw.text((size+gap+10,8),'AFTER / same pixel scale and foot origin',font=font,fill='#22394d')
for row,body in enumerate(('male','female')):
    y=top+row*size
    for col,folder in enumerate((before,after)):
        x=col*(size+gap);im=Image.open(folder/body/'BLUE_WARRIOR/death_NE_05.png').convert('RGBA')
        offset=pad if col==0 else 0;sheet.paste(im,(x+offset,y+offset),im)
        draw.rectangle((x+pad,y+pad,x+pad+255,y+pad+255),outline='#8897a3',width=1)
        ax=x+new_manifest['anchor']['x'];ay=y+new_manifest['anchor']['y']
        draw.line((ax-6,ay,ax+6,ay),fill='#ab3060',width=1)
        draw.line((ax,ay-6,ax,ay+6),fill='#ab3060',width=1)
        draw.text((x+10,y+10),body.upper(),font=font,fill='#22394d')
sheet.save(Path(args.out).with_name('death-overscan-comparison.png'))
