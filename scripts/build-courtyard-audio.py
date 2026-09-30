"""Original, deterministic synthesized pentatonic loops and short game cues. No samples."""
from pathlib import Path
import math
import random
import struct
import wave

OUT = Path(__file__).resolve().parents[1] / 'public/static/audio'
RATE = 24000
OUT.mkdir(parents=True, exist_ok=True)

def write(name, samples):
    peak = max(abs(x) for x in samples) or 1
    gain = min(1, .65 / peak)
    with wave.open(str(OUT / (name + '.wav')), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(b''.join(struct.pack('<h', round(x * gain * 32767)) for x in samples))

def pluck(t, freq, decay=1.4):
    return (1 - math.exp(-t * 100)) * math.exp(-t / decay) * (
        math.sin(2 * math.pi * freq * t) + .22 * math.sin(2 * math.pi * freq * 2 * t) +
        .08 * math.sin(2 * math.pi * freq * 3 * t))

for name, melody in {
    'street_ambient': [0, 7, 12, 4, 9, 7],
    'ancient_city': [0, 4, 7, 12, 9, 4],
    'shop': [7, 9, 12, 7, 4, 0],
    'menu': [12, 9, 7, 4, 7, 0],
}.items():
    seconds = 12
    samples = []
    for i in range(RATE * seconds):
        t = i / RATE
        # Wrap note tails through the loop seam; all notes decay before their next attack.
        value = sum(.10 * pluck((t - n * 2) % seconds, 220 * 2 ** (pitch / 12)) for n, pitch in enumerate(melody))
        value += .025 * math.sin(2 * math.pi * 110 * t) * (1 + .2 * math.sin(2 * math.pi * t / seconds))
        samples.append(value)
    write('bgm_' + name, samples)

for name, notes in {
    'coin': [12, 19], 'level_up': [0, 4, 7, 12], 'quest_complete': [7, 9, 12],
    'quest_start': [0, 7], 'button_click': [19], 'reward': [4, 7, 12],
    'achievement': [0, 7, 12, 19], 'npc_talk': [4, 7], 'door_open': [-12, -5],
}.items():
    duration = .14 * len(notes) + .5
    samples = []
    for i in range(round(RATE * duration)):
        t = i / RATE
        value = sum(.16 * pluck(t - j * .14, 330 * 2 ** (p / 12), .13) for j, p in enumerate(notes) if t >= j * .14)
        samples.append(value * min(1, (duration - t) / .05))
    write('sfx_' + name, samples)

rng = random.Random(146)
samples = []
previous = 0
for i in range(round(RATE * .16)):
    t = i / RATE
    previous = previous * .75 + rng.uniform(-1, 1) * .25
    samples.append(.3 * previous * (1 - math.exp(-t * 500)) * math.exp(-t * 35) * min(1, (.16 - t) / .03))
write('sfx_footstep', samples)
print(f'{len(list(OUT.glob("*.wav")))} audio assets; {sum(p.stat().st_size for p in OUT.glob("*.wav")):,} bytes')
