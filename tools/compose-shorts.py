# -*- coding: utf-8 -*-
"""用「模拟 DSH 界面」的截图拼竖屏短视频（1080x1920）。

素材：/tmp/mock3/*.png（2160x3840，2x）
输出：media/douyin-ep1-31档.mp4（16s）、media/douyin-ep2-教程.mp4（24s）

排版原则：截图为底，只加极少的字——左上角一枚小标签、底部一条字幕。
相机语言：推近 / 横移 / 轻微呼吸，不做花哨转场。
"""
import math
import os
import subprocess

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 30
SRC = "/tmp/mock6"
OUT = "/Users/mac/Documents/交付/滑动变祖器-发布包-20261117/dsh-boss-slider/media"
F_SERIF = "/System/Library/Fonts/Supplemental/Songti.ttc"
F_SANS = "/System/Library/Fonts/Hiragino Sans GB.ttc"
F_MONO = "/System/Library/Fonts/Menlo.ttc"
INK = (247, 244, 238)
DIM = (168, 176, 190)
GOLD = (255, 199, 122)


def f(path, size, index=0):
    try:
        return ImageFont.truetype(path, size, index=index)
    except Exception:
        return ImageFont.truetype(F_SANS, size)


def ease(p):
    p = min(max(p, 0.0), 1.0)
    return 0.5 - 0.5 * math.cos(math.pi * p)


def load(name):
    return Image.open(os.path.join(SRC, name)).convert("RGB")


CACHE = {}


def shot(name):
    if name not in CACHE:
        CACHE[name] = load(name)
    return CACHE[name]


def crop_zoom(img, zoom, fx=0.5, fy=0.5):
    """从 2x 截图裁出 1080x1920 视窗；zoom>1 推近，fx/fy 是焦点（0..1）。"""
    iw, ih = img.size
    cw, ch = int(iw / zoom), int(ih / zoom)
    cx = min(max(int(iw * fx), cw // 2), iw - cw // 2)
    cy = min(max(int(ih * fy), ch // 2), ih - ch // 2)
    box = (cx - cw // 2, cy - ch // 2, cx + cw // 2, cy + ch // 2)
    return img.crop(box).resize((W, H), Image.LANCZOS)


def crop_region(img, cx, cy, w):
    """以 (cx,cy) 为心、按 9:16 取宽 w 的窗口裁切，保持比例不变形。"""
    iw, ih = img.size
    w = max(2, int(min(w, iw)))
    h = int(w * 16 / 9)
    if h > ih:
        h = ih
        w = int(h * 9 / 16)
    x0 = min(max(int(cx - w / 2), 0), iw - w)
    y0 = min(max(int(cy - h / 2), 0), ih - h)
    return img.crop((x0, y0, x0 + w, y0 + h)).resize((W, H), Image.LANCZOS)


def tag(img, text):
    d = ImageDraw.Draw(img, "RGBA")
    ft = f(F_MONO, 19)
    w = d.textlength(text, font=ft)
    x1 = W - 44
    d.text((x1 - w, H - 96), text, font=ft, fill=(150, 160, 176, 190))


def caption(img, lines, y=1124, alpha=1.0):
    """底部字幕：最多两行，压一条渐隐底。"""
    if alpha <= 0:
        return
    d = ImageDraw.Draw(img, "RGBA")
    h = 30 + 52 * len(lines)
    feather = 220
    band = Image.new("RGBA", (W, h + feather * 2), (0, 0, 0, 0))
    bd = ImageDraw.Draw(band)
    total = h + feather * 2
    for i in range(total):
        t = i / (total - 1)
        a = math.sin(math.pi * t) ** 1.6 * 205 * alpha
        bd.line([(0, i), (W, i)], fill=(6, 8, 12, int(a)))
    img.paste(band, (0, y - feather), band)
    d = ImageDraw.Draw(img, "RGBA")
    yy = y
    for i, (text, size, color) in enumerate(lines):
        ft = f(F_SERIF, size) if i == 0 else f(F_SANS, size)
        w = d.textlength(text, font=ft)
        d.text(((W - w) / 2, yy), text, font=ft, fill=color + (int(255 * alpha),))
        yy += int(size * 1.34)


def grain(img, amt=0.03):
    n = Image.effect_noise((W, H), 14).convert("RGB")
    return Image.blend(img, n, amt)


def fade(img, a):
    if a >= 1:
        return img
    if a <= 0:
        return Image.new("RGB", (W, H), (0, 0, 0))
    return Image.blend(Image.new("RGB", (W, H), (0, 0, 0)), img, a)


def clip(frames, out, tag_text=None):
    work = out.replace(".mp4", "-frames")
    if os.path.isdir(work):
        for n in os.listdir(work):
            if n.endswith('.png'):
                os.remove(os.path.join(work, n))
    os.makedirs(work, exist_ok=True)
    for i, im in enumerate(frames):
        im.save(os.path.join(work, "f%04d.png" % i), compress_level=1)
    subprocess.run(["/opt/homebrew/bin/ffmpeg", "-y", "-framerate", str(FPS), "-i", os.path.join(work, "f%04d.png"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19", "-preset", "medium",
                    "-movflags", "+faststart", out], check=True)
    print(out, round(os.path.getsize(out) / 1e6, 2), "MB")


# ------------------------------------------------------------------ 第一弹（12s · 三家轮滑）


def ep1():
    """12s：梁文锋满屏拖 → 换奥特曼（只看浮层）→ 换达里奥 → 仓库。"""
    total = 12.0
    n = int(total * FPS)
    STEP = 0.075
    out = []
    for i in range(n):
        sec = i / FPS
        if sec < 1.0:
            p = ease(sec / 1.0)
            img = crop_zoom(shot('s0-idle.png'), 1.0 + 0.02 * p, 0.50, 0.545)
            cap = [('把思考强度做成一根滑片', 44, INK)]
        elif sec < 1.8:
            p = ease((sec - 1.0) / 0.8)
            a = crop_zoom(shot('s0-idle.png'), 1.03, 0.50, 0.545)
            b = crop_zoom(shot('s1-open.png'), 1.03, 0.50, 0.545)
            img = Image.blend(a, b, p)
            cap = [('31 档，换模型也不换滑片', 44, INK)]
        elif sec < 10.2:
            if sec < 4.1:
                fam, t0, full = 'liang', 1.8, True
            elif sec < 6.4:
                fam, t0, full = 'sam', 4.1, False
            elif sec < 8.7:
                fam, t0, full = 'dario', 6.4, False
            else:
                fam, t0, full = 'dario', 8.7, False
            k = (sec - t0) / STEP
            idx = min(30, max(0, int(k)))
            frac = k - idx
            nxt = min(30, idx + 1)
            if full:
                z = 1.02 + 0.03 * ((sec - 1.8) / 2.3)
                a = crop_zoom(shot('drag-%s-%02d.png' % (fam, idx)), z, 0.50, 0.56)
                b = crop_zoom(shot('drag-%s-%02d.png' % (fam, nxt)), z, 0.50, 0.56)
            else:
                a = crop_zoom(shot('drag-%s-%02d.png' % (fam, idx)), 1.28, 0.60, 0.72)
                b = crop_zoom(shot('drag-%s-%02d.png' % (fam, nxt)), 1.28, 0.60, 0.72)
            img = Image.blend(a, b, min(1.0, frac * 1.8))
            shown = idx if frac < 0.5 else nxt
            nm = {'liang': ('DeepSeek', '梁文锋'), 'sam': ('GPT', '奥特曼'), 'dario': ('Claude', '达里奥')}[fam]
            labels = {'liang': ['小难梁', '牢梁', '梁子', '梁圣', '梁神', '梁祖'],
                      'sam': ['小奥', '牢奥', '奥特曼', '奥圣', '奥神', '奥祖'],
                      'dario': ['小达', '牢达', '达里奥', '达圣', '达神', '达祖']}[fam]
            cap = [('%s · %s' % nm, 44, INK), ('第 %02d 档 %s' % (shown + 1, labels[min(5, shown // 6)]), 30, GOLD)]
        else:
            p = ease((sec - 10.2) / 1.8)
            img = crop_zoom(shot('drag-dario-30.png'), 1.28 - 0.03 * p, 0.60, 0.72)
            cap = [('同一根滑片，三家 93 帧', 44, INK), ('github.com/bigpowert25-del/dsh-boss-slider', 26, GOLD)]
        caption(img, cap, y=1124)
        tag(img, 'SIMULATED DSH UI · DEMO DATA')
        a = min(1.0, sec / 0.25) * min(1.0, (total - sec) / 0.3)
        out.append(fade(grain(img), a))
    clip(out, os.path.join(OUT, 'douyin-ep1-31档.mp4'))


def ep2():
    total = 16.0
    n = int(total * FPS)
    CAP_Y = 1422
    out = []
    for i in range(n):
        sec = i / FPS
        if sec < 2.2:
            p = ease(sec / 2.2)
            img = crop_region(shot('s4-discover.png'), 1380, 1200, 1450 - 50 * p)
            cap = [('插件市场 · 发现', 44, INK), ('只有一条「添加索引源」', 30, DIM)]
        elif sec < 4.8:
            p = ease((sec - 2.2) / 2.6)
            img = crop_region(shot('s5-dialog.png'), 1400, 1900, 1750 - 50 * p)
            cap = [('粘一条 index.json 地址', 42, INK), ('raw.githubusercontent.com/…/market/index.json', 22, GOLD)]
        elif sec < 7.0:
            p = ease((sec - 4.8) / 2.2)
            img = crop_region(shot('s3-installed.png'), 1400, 1180, 1420 - 50 * p)
            cap = [('列表里出现「滑动变祖器」', 42, INK), ('0.3.0 · MIT-0 · 93 帧内置', 30, DIM)]
        elif sec < 9.2:
            p = ease((sec - 7.0) / 2.2)
            img = crop_region(shot('s0-idle.png'), 1340, 1520, 1900 - 50 * p)
            cap = [('启用后输入框多一个变阻器', 42, INK), ('关掉就回原生下拉', 30, DIM)]
        elif sec < 14.2:
            if sec < 11.6:
                fam, t0 = 'liang', 9.2
            elif sec < 12.0:
                fam, t0 = None, 0
            else:
                fam, t0 = 'sam', 12.0
            if fam is None:
                p = ease((sec - 11.6) / 0.4)
                a = crop_zoom(shot('drag-liang-30.png'), 1.02, 0.50, 0.58)
                b = crop_zoom(shot('open-sam.png'), 1.02, 0.50, 0.58)
                img = Image.blend(a, b, p)
                cap = [('换模型：DeepSeek → GPT', 42, INK), ('滑片位置不动', 30, DIM)]
            else:
                k = (sec - t0) / 0.085
                idx = min(30, max(0, int(k)))
                frac = k - idx
                nxt = min(30, idx + 1)
                zz, ffy = (1.02, 0.58) if fam == 'liang' else (1.28, 0.72)
                a = crop_zoom(shot('drag-%s-%02d.png' % (fam, idx)), zz, 0.50, ffy)
                b = crop_zoom(shot('drag-%s-%02d.png' % (fam, nxt)), zz, 0.50, ffy)
                img = Image.blend(a, b, min(1.0, frac * 1.8))
                namec = 'DeepSeek' if fam == 'liang' else 'GPT'
                cap = [('拖滑片 = 选模型 + 思考强度', 42, INK), (namec + ' · 松手才提交', 30, DIM)]
        else:
            p = ease((sec - 14.2) / 1.8)
            img = crop_zoom(shot('drag-sam-30.png'), 1.28, 0.60, 0.72)
            cap = [('MIT-0 · 93 帧内置 · 不联网生图', 38, INK), ('github.com/bigpowert25-del/dsh-boss-slider', 26, GOLD)]
        caption(img, cap, y=(1124 if sec >= 9.2 else CAP_Y))
        tag(img, 'SIMULATED DSH UI · DEMO DATA')
        a = min(1.0, sec / 0.25) * min(1.0, (total - sec) / 0.3)
        out.append(fade(grain(img), a))
    clip(out, os.path.join(OUT, 'douyin-ep2-教程.mp4'))


if __name__ == "__main__":
    import sys
    which = sys.argv[1] if len(sys.argv) > 1 else "both"
    if which in ("ep1", "both"):
        ep1()
    if which in ("ep2", "both"):
        ep2()
