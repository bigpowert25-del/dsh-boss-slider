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
SRC = "/tmp/mock3"
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


def clip(frames, out, tag_text):
    work = out.replace(".mp4", "-frames")
    os.makedirs(work, exist_ok=True)
    for i, im in enumerate(frames):
        im.save(os.path.join(work, "f%04d.png" % i), compress_level=1)
    subprocess.run(["/opt/homebrew/bin/ffmpeg", "-y", "-framerate", str(FPS), "-i", os.path.join(work, "f%04d.png"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19", "-preset", "medium",
                    "-movflags", "+faststart", out], check=True)
    print(out, round(os.path.getsize(out) / 1e6, 2), "MB")


# ------------------------------------------------------------------ 第一弹


def ep1():
    """时间线（秒）：
       0.0–1.6  空会话，轻推
       1.6–2.7  浮层展开（同机位同倍率交叉，UI 不动、只有浮层淡入）
       2.7–10.2 逐档拖动（每档 0.24s）
       10.2–13.2 定格梁祖
       13.2–13.5 压黑
       13.5–16.0 收尾：仓库
    所有交叉的两张图必须同倍率同焦点，否则会重影。"""
    total = 16.0
    n = int(total * FPS)
    Z = 1.03
    FX, FY = 0.50, 0.545
    HOLD = 0.24
    labels = ["小难梁", "牢梁", "梁子", "梁圣", "梁神", "梁祖"]
    out = []
    for i in range(n):
        sec = i / FPS
        if sec < 1.6:
            p = ease(sec / 1.6)
            img = crop_zoom(shot("s0-idle.png"), 1.0 + 0.03 * p, FX, FY)
            caption(img, [("把思考强度做成一根滑片", 46, INK)], alpha=min(1, sec / 0.5))
        elif sec < 2.7:
            p = ease((sec - 1.6) / 1.1)
            a = crop_zoom(shot("s0-idle.png"), Z, FX, FY)
            b = crop_zoom(shot("s1-open.png"), Z, FX, FY)
            img = Image.blend(a, b, p)
            caption(img, [("点开就是 31 档变阻器", 46, INK)], alpha=min(1, (sec - 1.6) / 0.4))
        elif sec < 10.2:
            k = (sec - 2.7) / HOLD
            idx = min(30, int(k))
            frac = k - idx
            nxt = min(30, idx + 1)
            z = 1.02 + 0.03 * ((sec - 2.7) / 7.5)
            a = crop_zoom(shot("drag-%02d.png" % idx), z, FX, 0.56)
            b = crop_zoom(shot("drag-%02d.png" % nxt), z, FX, 0.56)
            img = Image.blend(a, b, min(1.0, frac * 1.6))
            shown = idx if frac < 0.5 else nxt
            caption(img, [("第 %02d 档 · %s" % (shown + 1, labels[min(5, shown // 6)]), 44, INK),
                          ("拖动只换人像，松手才保存", 30, DIM)])
        elif sec < 13.2:
            p = (sec - 10.2) / 3.0
            img = crop_zoom(shot("drag-30.png"), 1.04 + 0.02 * p, FX, 0.52)
            caption(img, [("滑到底：梁祖", 54, GOLD), ("DeepSeek / GPT / Claude 各 31 帧", 30, DIM)])
        elif sec < 13.45:
            img = Image.new("RGB", (W, H), (0, 0, 0))
        else:
            p = ease((sec - 13.45) / 2.4)
            img = crop_zoom(shot("s2-closed.png"), Z + 0.03 * p, FX, 0.55)
            caption(img, [("开源：dsh-boss-slider", 44, INK),
                          ("github.com/bigpowert25-del/dsh-boss-slider", 26, GOLD)])
        tag(img, "SIMULATED DSH UI · DEMO DATA")
        a = min(1.0, sec / 0.3) * min(1.0, (total - sec) / 0.35)
        out.append(fade(grain(img), a))
    clip(out, os.path.join(OUT, "douyin-ep1-31档.mp4"), "EP1")


# ------------------------------------------------------------------ 第二弹


def ep2():
    """教程顺序：发现空态 → 添加索引源 → 已安装列表 → 输入框 → 拖一档。"""
    total = 24.0
    n = int(total * FPS)
    CAP_Y = 1422
    out = []
    for i in range(n):
        sec = i / FPS
        if sec < 3.2:                                   # 发现：还没有市场
            p = ease(sec / 3.2)
            img = crop_region(shot("s4-discover.png"), 1380, 1200, 1450 - 60 * p)
            caption(img, [("插件市场 · 发现", 46, INK), ("空的时候只有一条「添加索引源」", 30, DIM)], y=CAP_Y)
        elif sec < 7.6:                                 # 添加索引源弹窗
            p = ease((sec - 3.2) / 4.4)
            img = crop_region(shot("s5-dialog.png"), 1400, 1900, 1750 - 60 * p)
            caption(img, [("粘一条 index.json 地址", 44, INK),
                          ("raw.githubusercontent.com/bigpowert25-del/dsh-boss-slider", 22, GOLD)], y=CAP_Y)
        elif sec < 11.0:                                # 已安装列表
            p = ease((sec - 7.6) / 3.4)
            img = crop_region(shot("s3-installed.png"), 1400, 1180, 1420 - 60 * p)
            caption(img, [("列表里就出现「滑动变祖器」", 42, INK), ("0.3.0 · MIT-0 · 93 帧内置", 30, DIM)], y=CAP_Y)
        elif sec < 14.4:                                # 输入框
            p = ease((sec - 11.0) / 3.4)
            img = crop_region(shot("s0-idle.png"), 1340, 1520, 1900 - 60 * p)
            caption(img, [("启用后，输入框多一个变阻器", 42, INK), ("关掉就回到原生下拉", 30, DIM)], y=CAP_Y)
        elif sec < 21.6:                                # 拖动
            k = (sec - 14.4) / 0.22
            idx = min(30, int(k))
            frac = k - idx
            nxt = min(30, idx + 1)
            a = crop_zoom(shot("drag-%02d.png" % idx), 1.02, 0.50, 0.58)
            b = crop_zoom(shot("drag-%02d.png" % nxt), 1.02, 0.50, 0.58)
            img = Image.blend(a, b, min(1.0, frac * 1.6))
            caption(img, [("拖滑片 = 选模型 + 思考强度", 42, INK), ("松手才提交，失败自动回滚", 30, DIM)], y=CAP_Y)
        else:                                           # 收尾
            p = ease((sec - 21.6) / 2.4)
            img = crop_zoom(shot("drag-30.png"), 1.03 + 0.02 * p, 0.50, 0.52)
            caption(img, [("MIT-0 · 93 帧内置 · 不联网生图", 40, INK),
                          ("github.com/bigpowert25-del/dsh-boss-slider", 26, GOLD)], y=CAP_Y)
        tag(img, "SIMULATED DSH UI · DEMO DATA")
        a = min(1.0, sec / 0.3) * min(1.0, (total - sec) / 0.35)
        out.append(fade(grain(img), a))
    clip(out, os.path.join(OUT, "douyin-ep2-教程.mp4"), "EP2")


if __name__ == "__main__":
    import sys
    which = sys.argv[1] if len(sys.argv) > 1 else "both"
    if which in ("ep1", "both"):
        ep1()
    if which in ("ep2", "both"):
        ep2()
