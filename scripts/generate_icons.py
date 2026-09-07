#!/usr/bin/env python3
"""
Generate PNG icons for Obsidian TODO Calendar PWA / Desktop App.
Uses pure Python standard library (zlib, struct, math) - no external dependencies.
Renders the exact calendar icon using Signed Distance Fields (SDF) with anti-aliasing.
"""

import math
import os
import struct
import zlib

def sd_box(px, py, bx, by, r):
    qx = abs(px) - bx + r
    qy = abs(py) - by + r
    dx = max(qx, 0.0)
    dy = max(qy, 0.0)
    outer = math.sqrt(dx * dx + dy * dy)
    inner = min(max(qx, qy), 0.0)
    return outer + inner - r

def sd_segment(px, py, ax, ay, bx, by):
    pax = px - ax
    pay = py - ay
    bax = bx - ax
    bay = by - ay
    h = max(0.0, min(1.0, (pax * bax + pay * bay) / (bax * bax + bay * bay)))
    dx = pax - bax * h
    dy = pay - bay * h
    return math.sqrt(dx * dx + dy * dy)

def write_png(width, height, rgba_data, filename):
    png = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = struct.pack('>I', zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff)
    png += struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + ihdr_crc
    
    raw = bytearray()
    row_bytes = width * 4
    for y in range(height):
        raw.append(0)
        raw.extend(rgba_data[y * row_bytes : (y + 1) * row_bytes])
    
    compressed = zlib.compress(bytes(raw), 9)
    idat_crc = struct.pack('>I', zlib.crc32(b'IDAT' + compressed) & 0xffffffff)
    png += struct.pack('>I', len(compressed)) + b'IDAT' + compressed + idat_crc
    
    iend_crc = struct.pack('>I', zlib.crc32(b'IEND') & 0xffffffff)
    png += struct.pack('>I', 0) + b'IEND' + iend_crc
    
    os.makedirs(os.path.dirname(os.path.abspath(filename)), exist_ok=True)
    with open(filename, 'wb') as f:
        f.write(png)

def render_icon(size):
    rgba = bytearray(size * size * 4)
    scale = 24.0 / size
    
    bg_color = (30, 30, 46)      # #1e1e2e
    purple = (124, 58, 237)      # #7c3aed
    
    aa = scale * 0.75
    
    for y in range(size):
        sy = (y + 0.5) * scale
        row_offset = y * size * 4
        for x in range(size):
            sx = (x + 0.5) * scale
            
            # 1. Background rounded rect: width=24, height=24, rx=4
            d_bg = sd_box(sx - 12.0, sy - 12.0, 11.5, 11.5, 3.5)
            
            if d_bg > aa:
                continue
            elif d_bg < -aa:
                alpha_bg = 1.0
            else:
                alpha_bg = 0.5 - (d_bg / (2.0 * aa))
            
            # 2. Calendar outer rect stroke: x=3, y=4, w=18, h=18, rx=2, stroke=2
            # Center is at (12, 13), half dimensions (9, 9), radius=2, half stroke=1.0
            d_cal_box = sd_box(sx - 12.0, sy - 13.0, 9.0, 9.0, 2.0)
            d_stroke = abs(d_cal_box) - 1.0
            
            # 3. Horizontal line: from (3, 10) to (21, 10), stroke=2
            # Bounded inside the calendar box
            if sx >= 3.0 and sx <= 21.0:
                d_line_h = abs(sy - 10.0) - 1.0
            else:
                d_line_h = 10.0
            
            # 4. Vertical pins: (8, 2)-(8, 6) and (16, 2)-(16, 6), stroke=2, round cap
            d_pin1 = sd_segment(sx, sy, 8.0, 2.0, 8.0, 6.0) - 1.0
            d_pin2 = sd_segment(sx, sy, 16.0, 2.0, 16.0, 6.0) - 1.0
            
            d_purple = min(d_stroke, d_line_h, d_pin1, d_pin2)
            
            if d_purple > aa:
                alpha_purple = 0.0
            elif d_purple < -aa:
                alpha_purple = 1.0
            else:
                alpha_purple = 0.5 - (d_purple / (2.0 * aa))
            
            r = int(bg_color[0] * (1.0 - alpha_purple) + purple[0] * alpha_purple)
            g = int(bg_color[1] * (1.0 - alpha_purple) + purple[1] * alpha_purple)
            b = int(bg_color[2] * (1.0 - alpha_purple) + purple[2] * alpha_purple)
            a = int(alpha_bg * 255)
            
            idx = row_offset + x * 4
            rgba[idx] = r
            rgba[idx + 1] = g
            rgba[idx + 2] = b
            rgba[idx + 3] = a
            
    return bytes(rgba)

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_dir = os.path.join(base_dir, 'public')
    
    targets = [
        (512, 'icon-512.png'),
        (192, 'icon-192.png'),
        (180, 'apple-touch-icon.png'),
        (32, 'favicon.png'),
    ]
    
    for size, filename in targets:
        print(f"Rendering {filename} ({size}x{size})...")
        data = render_icon(size)
        out_path = os.path.join(public_dir, filename)
        write_png(size, size, data, out_path)
        print(f"  -> Saved to {out_path} ({len(data)} bytes)")

if __name__ == '__main__':
    main()
