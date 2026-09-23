"""Prepare the authorized imagegen source as compact repeating game materials."""
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
source = Image.open(ROOT / 'output/imagegen/courtyard-materials-v01.png').convert('RGB')
assert source.width == source.height and source.width >= 1024
half = source.width // 2
out = ROOT / 'src/平遥古城沉浸式游戏/static/textures/courtyard'
out.mkdir(parents=True, exist_ok=True)
for name, (x, y) in {'brick': (0, 0), 'wood': (half, 0), 'roof': (0, half), 'cloth': (half, half)}.items():
    tile = source.crop((x, y, x+half, y+half)).resize((1024, 1024), Image.Resampling.LANCZOS)
    # Mirror the source into a periodic tile: no seams in either repeat direction.
    quarter = tile.resize((512, 512), Image.Resampling.LANCZOS)
    tile.paste(quarter, (0, 0)); tile.paste(ImageOps.mirror(quarter), (512, 0))
    tile.paste(ImageOps.flip(quarter), (0, 512)); tile.paste(ImageOps.flip(ImageOps.mirror(quarter)), (512, 512))
    if name == 'cloth':
        tile = ImageOps.grayscale(tile).point(lambda p: 208 + p * .18).convert('RGB')
    if name == 'brick':
        # Old lime joints should not read as bright white outlines at game scale.
        tile = tile.point(lambda value: round(18 + value * .76))
    tile.save(out / f'{name}-albedo.jpg', quality=90, optimize=True)
    height = ImageOps.grayscale(tile).filter(ImageFilter.GaussianBlur(.65)).resize((512, 512), Image.Resampling.LANCZOS)
    if name == 'brick':
        # The pale mortar is recessed. Raw luminance would raise the joints.
        height = ImageOps.invert(height)
    height.save(out / f'{name}-height.jpg', quality=85, optimize=True)
    print(name, (out / f'{name}-albedo.jpg').stat().st_size)
