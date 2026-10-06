"""Reduce the pet artwork to line art whose colour comes from the theme.

The source is an opaque scan-like PNG on a white page. No flood fill or
morphology is needed for this variant: the strokes are dark and the page is
light, so luminance separates them.

The output is a **coverage mask** — white RGB, coverage in the alpha channel.
The page, the cream floor and every filled colour become fully transparent, and
the client paints the mask with the theme's text colour. One asset therefore
reads correctly on a light and on a dark page, and there is no white plate
behind the pet.

Usage:
    python line.py <source.png> <output.png>
"""
import sys

from PIL import Image

src = sys.argv[1] if len(sys.argv) > 1 else 'pet-source.png'
dst = sys.argv[2] if len(sys.argv) > 2 else 'pet-line.png'

# Luminance at or above this is pure page; at or below it is solid ink.
PAGE = 232
INK = 96
# Ignore specks left by the scan, and drop components smaller than this.
MIN_ALPHA = 12
MIN_COMPONENT = 24

im = Image.open(src).convert('RGBA')
w, h = im.size
px = im.load()

out = Image.new('RGBA', (w, h), (255, 255, 255, 0))
op = out.load()
kept = 0
for y in range(h):
    for x in range(w):
        r, g, b, _ = px[x, y]
        luminance = (r * 299 + g * 587 + b * 114) // 1000
        if luminance >= PAGE:
            continue
        if luminance <= INK:
            alpha = 255
        else:
            alpha = int(round(255 * (PAGE - luminance) / (PAGE - INK)))
        if alpha < MIN_ALPHA:
            continue
        op[x, y] = (255, 255, 255, alpha)
        kept += 1

# Drop floating specks: small connected components of covered pixels.
seen = bytearray(w * h)
removed_pixels = 0
removed_components = 0
for y0 in range(h):
    for x0 in range(w):
        start = y0 * w + x0
        if seen[start] or op[x0, y0][3] == 0:
            continue
        component = [start]
        seen[start] = 1
        head = 0
        while head < len(component):
            cur = component[head]
            head += 1
            cx, cy = cur % w, cur // w
            for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    j = ny * w + nx
                    if not seen[j] and op[nx, ny][3] > 0:
                        seen[j] = 1
                        component.append(j)
        if len(component) < MIN_COMPONENT:
            for cur in component:
                op[cur % w, cur // w] = (255, 255, 255, 0)
            removed_pixels += len(component)
            removed_components += 1

out = out.crop(out.getbbox())
out.save(dst, optimize=True)

opaque = sum(1 for q in out.get_flattened_data() if q[3] > 200)
print('stroke pixels %d, specks removed %d in %d components' % (kept, removed_pixels, removed_components))
print('wrote %s %s %d bytes; opaque %.1f%%' % (dst, out.size, len(open(dst, 'rb').read()), 100.0 * opaque / (out.size[0] * out.size[1])))
