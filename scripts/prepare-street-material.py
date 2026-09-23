from pathlib import Path
from PIL import Image, ImageFilter, ImageOps

root = Path(__file__).resolve().parents[1]
source = root / 'output/imagegen/pingyao-stone.png'
target = root / 'src' / '\u5e73\u9065\u53e4\u57ce\u6c89\u6d78\u5f0f\u6e38\u620f' / 'static/textures'
image = Image.open(source).convert('RGB')
assert image.width == image.height and image.width >= 1024, image.size
image = image.resize((1024, 1024), Image.Resampling.LANCZOS)
target.mkdir(parents=True, exist_ok=True)
# Blend opposite borders in a narrow strip, preserving the central stone relief.
pixels = image.load()
for axis in [0, 1]:
    for offset in range(32):
        blend = (1 - offset / 32) * 0.5
        for cross in range(1024):
            a = (offset, cross) if axis == 0 else (cross, offset)
            b = (1023 - offset, cross) if axis == 0 else (cross, 1023 - offset)
            pa, pb = pixels[a], pixels[b]
            pixels[a] = tuple(round(x * (1-blend) + y * blend) for x, y in zip(pa, pb))
            pixels[b] = tuple(round(y * (1-blend) + x * blend) for x, y in zip(pa, pb))
image.save(target / 'pingyao-stone-albedo.jpg', quality=88, optimize=True)
height = ImageOps.grayscale(image).resize((1024, 1024), Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(0.65))
# Height is intentionally subtle: these are shallow worn joints, not displaced slabs.
height.save(target / 'pingyao-stone-height.jpg', quality=88, optimize=True)
roughness = height.point(lambda value: round(195 + value * 0.17))
roughness.save(target / 'pingyao-stone-roughness.jpg', quality=82, optimize=True)
for item in target.glob('pingyao-stone-*.jpg'):
    print(f'{item.name}: {Image.open(item).size}, {item.stat().st_size} bytes')
