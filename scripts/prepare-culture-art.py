"""Crop the generated six-cell illustration into runtime chapter paintings."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'output/imagegen/pingyao-culture-atlas-v01.png'
DEST = ROOT / 'public/static/img/3d/culture'
NAMES = ['bank-house', 'south-avenue', 'market-crossing', 'academy-lane', 'lantern-quarter', 'journey']

if __name__ == '__main__':
    image = Image.open(SOURCE).convert('RGB')
    if image.size != (1536, 1024):
        raise ValueError(f'Expected a 1536x1024 atlas, got {image.size}')
    DEST.mkdir(parents=True, exist_ok=True)
    for index, name in enumerate(NAMES):
        x, y = index % 3 * 512, index // 3 * 512
        target = DEST / f'{name}.webp'
        if target.exists():
            raise FileExistsError(f'Refusing to replace {target}')
        image.crop((x, y, x + 512, y + 512)).save(target, quality=86, method=6)
        print(f'{target.relative_to(ROOT)}: {target.stat().st_size} bytes')
