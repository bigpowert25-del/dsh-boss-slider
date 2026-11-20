#!/usr/bin/env python3
"""把逐句克隆配音按时间码贴进两集成片（视频流直接 copy，不重渲）。"""
import json
import os
import subprocess

FF = "/opt/homebrew/bin/ffmpeg"
FP = "/opt/homebrew/bin/ffprobe"
MEDIA = os.path.expanduser("~/Documents/交付/滑动变祖器-发布包-20261117/dsh-boss-slider/media")
VO = "/tmp/vo"

SEGS = {
    "douyin-ep1-31档.mp4": [("e1-1", 0.2), ("e1-2", 2.3), ("e1-3", 4.5), ("e1-4", 6.7), ("e1-5", 10.1)],
    "douyin-ep2-教程.mp4": [("e2-1", 0.2), ("e2-2", 2.4), ("e2-3", 4.8), ("e2-4", 7.2), ("e2-5", 9.5), ("e2-6", 12.3)],
}


def dur(path):
    out = subprocess.run([FP, "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip()
    return float(out)


def build(video, segs):
    vdur = dur(video)
    inputs, filters, labels = [], [], []
    for i, (name, start) in enumerate(segs):
        path = os.path.join(VO, name + ".wav")
        nxt = segs[i + 1][1] if i + 1 < len(segs) else vdur
        slot = nxt - start
        d = dur(path)
        chain = []
        # 句长超过档位就给 3.5% 余量后加速，最多 1.35 倍
        if d > slot * 0.94:
            tempo = min(1.38, d / (slot * 0.94))
            chain.append(f"atempo={tempo:.3f}")
            d = d / tempo
        chain.append("highpass=f=90")
        chain.append("acompressor=threshold=-18dB:ratio=3:attack=8:release=180")
        chain.append(f"adelay={int(start*1000)}|{int(start*1000)}")
        inputs += ["-i", path]
        filters.append(f"[{i+1}:a]" + ",".join(chain) + f"[a{i}]")
        labels.append(f"[a{i}]")
    mix = "".join(labels) + f"amix=inputs={len(labels)}:normalize=0:dropout_transition=0[m]"
    filters.append(mix)
    filters.append("[m]loudnorm=I=-15:TP=-1.5:LRA=9[out]")
    cmd = [FF, "-v", "error", "-y", "-i", video] + inputs + [
        "-filter_complex", ";".join(filters),
        "-map", "0:v", "-map", "[out]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
        "-t", str(vdur), "-movflags", "+faststart",
        video.replace(".mp4", "-配音.mp4"),
    ]
    subprocess.run(cmd, check=True)
    return video.replace(".mp4", "-配音.mp4"), vdur


if __name__ == "__main__":
    for v, segs in SEGS.items():
        path = os.path.join(MEDIA, v)
        out, vd = build(path, segs)
        print(f"{os.path.basename(out)}  {dur(out):.3f}s  {os.path.getsize(out)/1e6:.2f}MB (视频 {vd:.3f}s)")
