"""
Synthetic-signal acceptance tests for the drone detector (offline path).

All signals are generated programmatically -- no external data required.
"""

import numpy as np
import pytest

from drone_detector.detector import (
    DroneDetector, DetectorConfig,
    highpass, frame_spectrogram,
    harmonic_summation, spectral_flatness, band_energy,
    am_index, f0_jitter,
)

SR = 16000


# ---------------------------------------------------------------------------
# Synthetic signal helpers
# ---------------------------------------------------------------------------

def synth_drone(dur, f0=150, amp=1.0, n_harm=8, wobble=2.0,
                doppler=0.0, sr=SR):
    """Sum of harmonics with slow f0 wobble and optional linear drift.

    Parameters
    ----------
    dur : float     Duration (s).
    f0 : float      Fundamental frequency (Hz).
    amp : float or ndarray   Amplitude (scalar or per-sample envelope).
    n_harm : int    Number of harmonics.
    wobble : float  f0 wobble amplitude (Hz), slow sinusoidal.
    doppler : float Linear f0 drift (Hz/s).
    """
    t = np.arange(int(sr * dur)) / sr
    f0_t = f0 + wobble * np.sin(2 * np.pi * 0.5 * t) + doppler * t

    signal = np.zeros_like(t)
    for k in range(1, n_harm + 1):
        phase = 2 * np.pi * k * np.cumsum(f0_t) / sr
        signal += np.sin(phase) / k        # 1/k amplitude tapering

    peak = np.max(np.abs(signal))
    if peak > 0:
        signal /= peak

    if isinstance(amp, np.ndarray):
        signal = signal[:len(amp)] * amp[:len(signal)]
    else:
        signal = signal * amp

    return signal


def noise(dur, amp=1.0, sr=SR):
    """Pink-ish broadband noise (single-pole IIR on white noise)."""
    from scipy.signal import lfilter
    n = int(sr * dur)
    rng = np.random.RandomState(42)
    white = rng.randn(n)
    # Single-pole lowpass gives ~-20 dB/decade rolloff (pink-ish)
    pink = lfilter([1.0], [1.0, -0.98], white)
    peak = np.max(np.abs(pink))
    if peak > 0:
        pink /= peak
    return pink * amp


def bird_chirp(dur, amp=1.0, sr=SR):
    """Two ~150 ms harmonic tonal sweeps -- harmonic but transient.

    The chirp sweeps its fundamental through 200-400 Hz with 4 harmonics,
    so it looks harmonic to the detector but is too short to pass
    the persistence check.
    """
    n = int(sr * dur)
    signal = np.zeros(n)

    chirp_dur = 0.15      # 150 ms
    chirp_samples = int(sr * chirp_dur)

    for start_frac in [0.2, 0.6]:
        start = int(n * start_frac)
        end = min(start + chirp_samples, n)
        actual = end - start
        t_chirp = np.arange(actual) / sr
        # f0 sweeps through the drone search band
        f0_chirp = 200 + 200 * t_chirp / chirp_dur

        chirp = np.zeros(actual)
        for k in range(1, 5):
            phase = 2 * np.pi * k * np.cumsum(f0_chirp) / sr
            chirp += np.sin(phase) / k

        chirp *= np.hanning(actual)
        signal[start:end] += chirp

    peak = np.max(np.abs(signal))
    if peak > 0:
        signal /= peak
    return signal * amp


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestSteadyDrone:
    """Steady drone at high SNR: detected in a large majority of frames."""

    def test_detection_rate(self):
        np.random.seed(42)
        dur = 3.0
        clip = synth_drone(dur, f0=150, amp=1.0) + noise(dur, amp=0.1)

        det = DroneDetector()
        results = det.process_clip(clip, SR)

        detected = [r for r in results if r.detected]
        rate = len(detected) / len(results)
        assert rate > 0.80, f"Detection rate {rate:.2f} should be > 0.80"

    def test_f0_estimation(self):
        np.random.seed(42)
        dur = 3.0
        clip = synth_drone(dur, f0=150, amp=1.0) + noise(dur, amp=0.1)

        det = DroneDetector()
        results = det.process_clip(clip, SR)

        detected = [r for r in results if r.detected]
        assert len(detected) > 0, "No detections at all"
        median_f0 = np.median([r.f0 for r in detected])
        assert abs(median_f0 - 150) < 10, (
            f"Median f0 = {median_f0:.1f} Hz, expected ~150 Hz"
        )


class TestLowSNRDrone:
    """Low-SNR drone: still detected in a majority of frames."""

    def test_detection_rate(self):
        np.random.seed(123)
        dur = 3.0
        clip = synth_drone(dur, f0=150, amp=0.4) + noise(dur, amp=0.4)

        det = DroneDetector()
        results = det.process_clip(clip, SR)

        detected = [r for r in results if r.detected]
        rate = len(detected) / len(results)
        assert rate > 0.50, f"Low-SNR detection rate {rate:.2f} should be > 0.50"


class TestNoiseOnly:
    """Noise only: detected in ~0% of frames."""

    def test_no_false_alarms(self):
        np.random.seed(99)
        dur = 3.0
        clip = noise(dur, amp=1.0)

        det = DroneDetector()
        results = det.process_clip(clip, SR)

        detected = [r for r in results if r.detected]
        rate = len(detected) / len(results) if results else 0
        assert rate < 0.05, f"False-alarm rate {rate:.2f} should be < 0.05"


class TestBirdChirps:
    """Bird chirps only: persistence rejects transients."""

    def test_chirp_rejection(self):
        np.random.seed(77)
        dur = 3.0
        clip = bird_chirp(dur, amp=1.0) + noise(dur, amp=0.2)

        det = DroneDetector()
        results = det.process_clip(clip, SR)

        detected = [r for r in results if r.detected]
        rate = len(detected) / len(results) if results else 0
        assert rate < 0.05, (
            f"Bird-chirp false-alarm rate {rate:.2f} should be < 0.05"
        )


class TestApproachingDrone:
    """Approaching drone (rising amplitude + small up-drift): closing."""

    def test_approaching(self):
        np.random.seed(42)
        dur = 4.0
        t = np.arange(int(SR * dur)) / SR
        envelope = 0.3 + 0.7 * (t / dur)          # rising amplitude
        drone = synth_drone(dur, f0=150, amp=envelope, doppler=5.0)
        clip = drone + noise(dur, amp=0.1)

        det = DroneDetector()
        results = det.process_clip(clip, SR)

        detected = [r for r in results if r.detected]
        det_rate = len(detected) / len(results)
        assert det_rate > 0.70, (
            f"Detection rate {det_rate:.2f} should be > 0.70"
        )

        closing = [r for r in results if r.closing]
        close_rate = len(closing) / len(results)
        assert close_rate > 0.50, (
            f"Closing rate {close_rate:.2f} should be > 0.50"
        )


# ---------------------------------------------------------------------------
# Drone-specificity helpers
# ---------------------------------------------------------------------------

def synth_generator(dur, f0=150, amp=1.0, n_harm=8, sr=SR):
    """Single fundamental, near-zero wobble, clean harmonics, no beating.

    Represents steady machinery — a sustained harmonic source that
    Stage 1 alone would accept.
    """
    t = np.arange(int(sr * dur)) / sr
    signal = np.zeros_like(t)
    for k in range(1, n_harm + 1):
        signal += np.sin(2 * np.pi * k * f0 * t) / k

    peak = np.max(np.abs(signal))
    if peak > 0:
        signal /= peak
    return signal * amp


def synth_drone_multirotor(dur, base_f0=150, amp=1.0, n_rotors=4,
                           n_harm=8, sr=SR):
    """Multiple close fundamentals each with an independent RPM random-walk.

    Each rotor runs at ``base_f0 + offset`` (offsets spread over
    ~±6 Hz).  The summed signal produces both envelope AM/beating and
    f0 jitter — the two physical signatures of a flying multirotor.
    """
    t = np.arange(int(sr * dur)) / sr
    signal = np.zeros_like(t)

    rng = np.random.RandomState(7)

    for rotor in range(n_rotors):
        f0_offset = (rotor - (n_rotors - 1) / 2.0) * 3.0   # ±~6 Hz spread
        # Independent slow random-walk on each rotor's RPM
        walk = np.cumsum(rng.randn(len(t)) * 0.01)
        walk -= np.mean(walk)
        f0_t = base_f0 + f0_offset + walk * 2.0             # ±2 Hz wander

        for k in range(1, n_harm + 1):
            phase = 2 * np.pi * k * np.cumsum(f0_t) / sr
            signal += np.sin(phase) / (k * n_rotors)

    peak = np.max(np.abs(signal))
    if peak > 0:
        signal /= peak
    return signal * amp


# ---------------------------------------------------------------------------
# Specificity tests
# ---------------------------------------------------------------------------

class TestMultirotorDetected:
    """Multirotor drone with require_specificity=True: detected."""

    def test_detected_with_high_drone_likeness(self):
        np.random.seed(42)
        dur = 4.0
        clip = synth_drone_multirotor(dur, base_f0=150, amp=1.0) \
             + noise(dur, amp=0.15)

        cfg = DetectorConfig(require_specificity=True)
        det = DroneDetector(cfg)
        results = det.process_clip(clip, SR)

        detected = [r for r in results if r.detected]
        rate = len(detected) / len(results)
        assert rate > 0.50, (
            f"Multirotor detection rate {rate:.2f} should be > 0.50"
        )

        # AM index and jitter should be elevated
        detected_frames = [r for r in results if r.detected]
        if detected_frames:
            median_am = np.median([r.am_index for r in detected_frames])
            median_jitter = np.median([r.f0_jitter for r in detected_frames])
            median_dl = np.median([r.drone_likeness for r in detected_frames])
            assert median_dl > 0.2, (
                f"Median drone_likeness {median_dl:.3f} should be > 0.2"
            )


class TestGeneratorRejected:
    """Generator with require_specificity=True: NOT flagged as drone."""

    def test_not_detected_with_specificity(self):
        np.random.seed(42)
        dur = 4.0
        clip = synth_generator(dur, f0=150, amp=1.0) \
             + noise(dur, amp=0.15)

        cfg = DetectorConfig(require_specificity=True)
        det = DroneDetector(cfg)
        results = det.process_clip(clip, SR)

        detected = [r for r in results if r.detected]
        rate = len(detected) / len(results)
        assert rate < 0.10, (
            f"Generator false-alarm rate {rate:.2f} with specificity should be < 0.10"
        )

    def test_detected_without_specificity(self):
        """Confirm Stage-1 alone WOULD detect the generator (proving the
        specificity gate is what rejects it)."""
        np.random.seed(42)
        dur = 4.0
        clip = synth_generator(dur, f0=150, amp=1.0) \
             + noise(dur, amp=0.15)

        cfg = DetectorConfig(require_specificity=False)
        det = DroneDetector(cfg)
        results = det.process_clip(clip, SR)

        detected = [r for r in results if r.detected]
        rate = len(detected) / len(results)
        assert rate > 0.70, (
            f"Generator detection rate {rate:.2f} without specificity should be > 0.70"
        )
