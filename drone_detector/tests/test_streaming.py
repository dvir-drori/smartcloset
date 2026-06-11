"""
Verify that the streaming path (Resampler + CausalHighpass + StreamingFramer)
produces the same detect/reject outcomes as the offline path.

Feeds synthetic clips resampled to 48 kHz through the streaming pipeline in
~64 ms blocks and checks detection / false-alarm rates.
"""

import numpy as np
import pytest
from math import gcd

from scipy.signal import lfilter, resample_poly

from drone_detector.detector import DroneDetector, DetectorConfig
from drone_detector.realtime import CausalHighpass, StreamingFramer, Resampler

SR = 16000
DEVICE_SR = 48000


# ---------------------------------------------------------------------------
# Helpers (simplified versions -- full helpers are in test_detector.py)
# ---------------------------------------------------------------------------

def synth_drone(dur, f0=150, amp=1.0, n_harm=8, sr=SR):
    t = np.arange(int(sr * dur)) / sr
    signal = np.zeros_like(t)
    for k in range(1, n_harm + 1):
        signal += np.sin(2 * np.pi * k * f0 * t) / k
    peak = np.max(np.abs(signal))
    if peak > 0:
        signal /= peak
    return signal * amp


def noise(dur, amp=1.0, sr=SR):
    rng = np.random.RandomState(42)
    n = int(sr * dur)
    white = rng.randn(n)
    pink = lfilter([1.0], [1.0, -0.98], white)
    peak = np.max(np.abs(pink))
    if peak > 0:
        pink /= peak
    return pink * amp


# ---------------------------------------------------------------------------
# Streaming path wrapper
# ---------------------------------------------------------------------------

def streaming_process(clip_16k, device_sr=DEVICE_SR, target_sr=SR):
    """Feed a 16 kHz clip through the full streaming pipeline.

    1. Up-sample to *device_sr* (simulate capture at that rate).
    2. Chunk into ~64 ms blocks.
    3. Resampler -> CausalHighpass -> StreamingFramer -> DroneDetector.
    """
    g = gcd(device_sr, target_sr)
    clip_device = resample_poly(clip_16k, device_sr // g, target_sr // g)

    resampler = Resampler(device_sr, target_sr)
    hp = CausalHighpass(target_sr)
    cfg = DetectorConfig(sr=target_sr)
    framer = StreamingFramer(cfg.n_fft, cfg.hop, target_sr)
    detector = DroneDetector(cfg)

    block_size = int(device_sr * 0.064)
    results = []
    pos = 0

    while pos < len(clip_device):
        block = clip_device[pos:pos + block_size]
        pos += block_size

        resampled = resampler.process(block)
        filtered = hp.process(resampled)
        frames = framer.process(filtered)

        for mag, freqs, t in frames:
            result = detector.process_frame(mag, freqs, t)
            results.append(result)

    return results


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestStreamingDrone:
    """Drone clip through streaming path should still be detected."""

    def test_drone_detected(self):
        np.random.seed(42)
        dur = 3.0
        clip = synth_drone(dur, f0=150, amp=1.0) + noise(dur, amp=0.1)

        results = streaming_process(clip)

        # Skip filter transient at the start (~0.5 s)
        skip = int(0.5 * SR / 512)
        results = results[skip:]

        detected = [r for r in results if r.detected]
        rate = len(detected) / len(results) if results else 0
        assert rate > 0.70, (
            f"Streaming detection rate {rate:.2f} should be > 0.70"
        )

    def test_noise_rejected(self):
        np.random.seed(99)
        dur = 3.0
        clip = noise(dur, amp=1.0)

        results = streaming_process(clip)

        detected = [r for r in results if r.detected]
        rate = len(detected) / len(results) if results else 0
        assert rate < 0.05, (
            f"Streaming false-alarm rate {rate:.2f} should be < 0.05"
        )


class TestStreamingMatchesOffline:
    """Streaming and offline paths should agree on detect/reject."""

    def test_agreement(self):
        np.random.seed(42)
        dur = 3.0
        clip = synth_drone(dur, f0=150, amp=1.0) + noise(dur, amp=0.1)

        # Offline
        det_off = DroneDetector()
        off_results = det_off.process_clip(clip, SR)

        # Streaming
        str_results = streaming_process(clip)

        skip = int(0.5 * SR / 512)

        off_rate = (
            sum(1 for r in off_results[skip:] if r.detected)
            / max(len(off_results[skip:]), 1)
        )
        str_rate = (
            sum(1 for r in str_results[skip:] if r.detected)
            / max(len(str_results[skip:]), 1)
        )

        # Both should detect with high rates
        assert off_rate > 0.70, f"Offline rate {off_rate:.2f}"
        assert str_rate > 0.70, f"Streaming rate {str_rate:.2f}"
