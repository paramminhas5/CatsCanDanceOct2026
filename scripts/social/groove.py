"""Placeholder 124 BPM house groove for previewing reels with sound.
Not for release: swap in Merman / Sartdawg tracks. Everything here is synthesised, no samples.
Usage: python3 groove.py out.wav beats
"""
import sys, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter

SR = 44100
BPM = 124
B = 60 / BPM
rng = np.random.default_rng(7)

def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(t / a, 1) * np.exp(-t / d)

def kick():
    n = int(0.42 * SR); t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    click = rng.standard_normal(n) * np.exp(-t / 0.002) * 0.25
    return (np.sin(ph) * np.exp(-t / 0.22) + click) * 0.95

def hp(x, fc, order=2):
    b, a = butter(order, fc / (SR / 2), 'high'); return lfilter(b, a, x)
def lp(x, fc, order=2):
    b, a = butter(order, fc / (SR / 2), 'low'); return lfilter(b, a, x)
def bp(x, lo, hi):
    b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a, x)

def clap():
    n = int(0.25 * SR); x = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022]):
        i = int(off * SR); m = n - i
        x[i:] += rng.standard_normal(m) * env(m, 0.0005, 0.012 if k < 2 else 0.09)
    return bp(x, 900, 4500) * 1.4

def hat(d=0.035):
    n = int(0.2 * SR); return hp(rng.standard_normal(n), 7000) * env(n, 0.0005, d) * 0.5

def saw(freq, n):
    t = np.arange(n) / SR
    return 2 * ((t * freq) % 1) - 1

def note(freq, length, cutoff=700, amp=0.5):
    n = int(length * SR)
    x = saw(freq, n) + saw(freq * 1.006, n)
    return lp(x, cutoff) * env(n, 0.004, length * 0.6) * amp

def stab(freqs, length=0.22):
    n = int(length * SR)
    x = sum(saw(f, n) for f in freqs) / len(freqs)
    return lp(x, 2600) * env(n, 0.003, 0.09) * 0.35

def render(beats):
    total = int(beats * B * SR) + SR
    drums = np.zeros(total); bass = np.zeros(total); keys = np.zeros(total)
    side = np.ones(total)
    K, C = kick(), clap()
    def put(buf, x, t):
        i = int(t * SR); j = min(total, i + len(x)); buf[i:j] += x[: j - i]
    bassline = [55.0, 55.0, 65.41, 49.0]  # A1 A1 C2 G1, one per bar
    for b in range(beats):
        t = b * B
        put(drums, K, t)
        # sidechain envelope: duck on every kick, recover over ~ a 16th to an 8th
        i = int(t * SR); n = int(B * SR); tt = np.arange(n) / SR
        side[i:i + n] = np.minimum(side[i:i + n], 1 - 0.85 * np.exp(-tt / 0.09))
        if b % 2 == 1: put(drums, C, t)
        for s in range(4):
            put(drums, hat(0.02 if s != 2 else 0.11) * (1.0 if s == 2 else 0.45), t + s * B / 4)
        f = bassline[(b // 4) % 4]
        put(bass, note(f, B * 0.45, 650, 0.55), t + B / 2)
        if b % 8 in (2, 6):
            put(keys, stab([220, 261.63, 329.63, 392.0]), t + B * 0.75)
    mix = drums * 0.9 + bass * side + keys * side * 0.8
    mix = np.tanh(mix * 1.3) * 0.85
    mix = mix[: int(beats * B * SR)]
    stereo = np.stack([mix, np.roll(mix, 30) * 0.98], axis=1)
    return (stereo * 32767).astype(np.int16)

if __name__ == '__main__':
    out, beats = sys.argv[1], int(sys.argv[2])
    wavfile.write(out, SR, render(beats))
    print(out)
