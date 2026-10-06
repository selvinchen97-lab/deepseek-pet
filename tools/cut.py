"""Cut the pet artwork free of its white page, keeping the body solid.

The artwork arrives as an opaque PNG: a pure white page with a crisp black
outline around the bunny. Three measured facts drive the approach:

* the page and the bunny's own fill are the same pure white (255, 255, 255), so
  no colour threshold separates them;
* the outline has a gap, so a flood fill of the page leaks into the body and
  erases it. That gap is wide enough that no useful morphological closing seals
  it (measured up to radius 5), while dilating the ink does seal it;
* once the leak is stopped, several blank areas remain enclosed by the outline
  (the space inside the ears, between the legs). Rendering those transparent
  punches visible holes through the figure, so enclosure alone is not the test.

The final test is reachability: a bright pixel is background only when it can
reach the frame border through other bright pixels. Everything else is figure and
is rendered fully opaque. Dilation is used only to cut that reachability, and the
visible alpha is rendered with a soft ramp, so the ink keeps its weight and the
boundary stays antialiased.

Usage:
    python cut.py <source.png> <output.png>
"""
import sys
from collections import deque

from PIL import Image, ImageFilter

src = sys.argv[1] if len(sys.argv) > 1 else 'pet-source.png'
dst = sys.argv[2] if len(sys.argv) > 2 else 'pet.png'

# Page is anything this bright and this neutral. The scan carries a faint
# bluish edge band at (245, 246, 249), so the bar stays below 245.
BRIGHT = 244
SPREAD = 12
# Dilating the ink by this much seals the outline gap. Measured on this artwork:
# 2 still leaks, 3 seals.
SEAL = 3
BORDER = 3
MIN_COMPONENT = 120
FEATHER = 2

# Patch inside the bunny's white body; the cut is wrong if the page reaches it.
BODY_PATCH = (175, 200, 225, 235)

im = Image.open(src).convert('RGBA')
w, h = im.size
px = im.load()


def is_page(x, y):
    r, g, b, _ = px[x, y]
    return min(r, g, b) >= BRIGHT and (max(r, g, b) - min(r, g, b)) <= SPREAD


bright = bytearray(w * h)
for y in range(h):
    base = y * w
    for x in range(w):
        if is_page(x, y):
            bright[base + x] = 1

# Cut reachability: dilating the ink closes the outline gap, so a flood inside
# this mask cannot escape the figure.
sealed = bytearray(1 - bright[i] for i in range(w * h))
for _ in range(SEAL):
    current = bytearray(sealed)
    for y in range(h):
        base = y * w
        for x in range(w):
            if current[base + x]:
                continue
            if (x > 0 and current[base + x - 1]) or (x < w - 1 and current[base + x + 1]) \
               or (y > 0 and current[base - w + x]) or (y < h - 1 and current[base + w + x]):
                sealed[base + x] = 1

reachable = bytearray(w * h)
queue = deque()


def seed(x, y):
    i = y * w + x
    if bright[i] and not sealed[i] and not reachable[i]:
        reachable[i] = 1
        queue.append((x, y))


for x in range(w):
    for y in range(BORDER):
        seed(x, y)
        seed(x, h - 1 - y)
for y in range(h):
    for x in range(BORDER):
        seed(x, y)
        seed(w - 1 - x, y)

while queue:
    x, y = queue.popleft()
    if x > 0:
        seed(x - 1, y)
    if x < w - 1:
        seed(x + 1, y)
    if y > 0:
        seed(x, y - 1)
    if y < h - 1:
        seed(x, y + 1)

x0, y0, x1, y1 = BODY_PATCH
leaked = sum(1 for y in range(y0, y1) for x in range(x0, x1) if reachable[y * w + x])
total = (x1 - x0) * (y1 - y0)
if leaked:
    raise SystemExit(
        'body patch is %.0f%% classified as page: the seal did not hold. '
        'Raise SEAL, or lower BRIGHT if the page is darker than the bar.'
        % (100.0 * leaked / total)
    )
print('body patch enclosed (%d px)' % total)

# Render alpha. Only border-reachable page is background; the figure keeps full
# coverage, and page fades out where it touches the figure so the ink edge stays
# antialiased.
alpha = Image.new('L', (w, h), 0)
ap = alpha.load()
filled = 0
for y in range(h):
    for x in range(w):
        i = y * w + x
        if not reachable[i]:
            ap[x, y] = 255
            if bright[i]:
                filled += 1
            continue
        best = FEATHER + 1
        for nx in range(max(0, x - FEATHER), min(w, x + FEATHER + 1)):
            for ny in range(max(0, y - FEATHER), min(h, y + FEATHER + 1)):
                if not reachable[ny * w + nx]:
                    best = min(best, max(abs(nx - x), abs(ny - y)))
        if best <= FEATHER:
            ap[x, y] = int(round(255 * (1.0 - best / (FEATHER + 1.0))))

print('enclosed blank pixels rendered as figure: %d' % filled)

# Drop background pockets the flood could not clear; they would render as specks.
kept = bytearray(w * h)
for y in range(h):
    for x in range(w):
        if ap[x, y] > 0:
            kept[y * w + x] = 1

seen = bytearray(w * h)
removed = 0
for y0 in range(h):
    for x0 in range(w):
        start = y0 * w + x0
        if not kept[start] or seen[start]:
            continue
        component = [start]
        seen[start] = 1
        head = 0
        touches_background = False
        while head < len(component):
            cur = component[head]
            head += 1
            cx, cy = cur % w, cur // w
            for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    j = ny * w + nx
                    if reachable[j]:
                        touches_background = True
                    elif kept[j] and not seen[j]:
                        seen[j] = 1
                        component.append(j)
        # A small component is a floating speck only when it touches the
        # background. Enclosed components are figure parts (an ear's inner
        # blank, the gap between the legs); removing them reopens those holes.
        if touches_background and len(component) < MIN_COMPONENT:
            for cur in component:
                ap[cur % w, cur // w] = 0
            removed += 1
print('removed %d floating specks' % removed)

im.putalpha(alpha.filter(ImageFilter.GaussianBlur(0.5)))

# Trim to the artwork: the sealed region can leave untouched page along an edge.
content = Image.new('L', (w, h), 0)
cp = content.load()
for y in range(h):
    base = y * w
    for x in range(w):
        if not bright[base + x]:
            cp[x, y] = 255
box = content.filter(ImageFilter.MaxFilter(2 * FEATHER + 1)).getbbox()
if box is not None:
    im = im.crop(box)

im.save(dst, optimize=True)

# Verify: no enclosed transparent pixel may survive, or the figure shows holes.
final = im.convert('RGBA')
fw, fh = final.size
fpx = final.load()
trans = bytearray(fw * fh)
for y in range(fh):
    base = y * fw
    for x in range(fw):
        if fpx[x, y][3] < 128:
            trans[base + x] = 1
reached = bytearray(fw * fh)
queue = deque()
for x in range(fw):
    for y in (0, fh - 1):
        i = y * fw + x
        if trans[i] and not reached[i]:
            reached[i] = 1
            queue.append(i)
for y in range(fh):
    for x in (0, fw - 1):
        i = y * fw + x
        if trans[i] and not reached[i]:
            reached[i] = 1
            queue.append(i)
while queue:
    cur = queue.popleft()
    cx, cy = cur % fw, cur // fw
    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
        if 0 <= nx < fw and 0 <= ny < fh:
            j = ny * fw + nx
            if trans[j] and not reached[j]:
                reached[j] = 1
                queue.append(j)
holes = sum(1 for i in range(fw * fh) if trans[i] and not reached[i])

opaque = sum(1 for q in final.get_flattened_data() if q[3] > 200)
print('wrote %s %s %d bytes; opaque %.1f%%; enclosed transparent pixels %d'
      % (dst, final.size, len(open(dst, 'rb').read()), 100.0 * opaque / (fw * fh), holes))
if holes:
    raise SystemExit('figure still has %d transparent interior pixels' % holes)
