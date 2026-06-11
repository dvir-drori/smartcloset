"""
Drone acoustic detector -- offline/streaming-agnostic core.

Detects multirotor drones by their harmonic comb signature:
blade-pass frequency (BPF) ~100-300 Hz with harmonics extending to several kHz.
No training data required -- detection is based on signal physics.

The core discriminator is harmonicity x tonality, integrated over time:
  - A multirotor produces a comb of harmonics on top of its BPF.
  - Broadband background noise has no such comb.
  - Transient harmonic sounds (bird chirps) are rejected by temporal persistence.
"""

from dataclasses import dataclass, field
from collections import deque
from typing import List, Optional, Tuple

import numpy as np
from scipy.signal import butter, sosfiltfilt, resample_poly


# ---------------------------------------------------------------------------
# Preprocessing
# ---------------------------------------------------------------------------

def highpass(x: np.ndarray, sr: int, cutoff: float = 80.0, order: int = 4) -> np.ndarray:
    """Zero-phase highpass filter (sosfiltfilt). Removes DC and wind rumble.

    For offline / full-clip use only. For causal (streaming) filtering,
    use realtime.CausalHighpass instead.
    """
    sos = butter(order, cutoff, btype='high', fs=sr, output='sos')
    return sosfiltfilt(sos, x)


def frame_spectrogram(x: np.ndarray, sr: int,
                      n_fft: int = 2048, hop: int = 512):
    """Compute magnitude STFT.

    Returns
    -------
    freqs : ndarray, shape (n_fft//2+1,)
    times : ndarray, shape (n_frames,)
    mag   : ndarray, shape (n_fft//2+1, n_frames)
    """
    window = np.hanning(n_fft)
    n_freq = n_fft // 2 + 1

    # Pad so at least one full frame exists
    if len(x) < n_fft:
        x = np.pad(x, (0, n_fft - len(x)))

    n_frames = 1 + (len(x) - n_fft) // hop
    mag = np.empty((n_freq, n_frames), dtype=np.float64)

    for i in range(n_frames):
        start = i * hop
        segment = x[start:start + n_fft] * window
        mag[:, i] = np.abs(np.fft.rfft(segment))

    freqs = np.fft.rfftfreq(n_fft, d=1.0 / sr)
    times = np.arange(n_frames) * hop / sr

    return freqs, times, mag


# ---------------------------------------------------------------------------
# Per-frame features
# ---------------------------------------------------------------------------

def harmonic_summation(mag_col: np.ndarray, freqs: np.ndarray,
                       f0_grid: np.ndarray, n_harm: int = 8,
                       band: Tuple[float, float] = (100, 8000)):
    """Find the best fundamental frequency and its harmonicity score.

    Uses the normalised autocorrelation of the (whitened) in-band power
    spectrum.  A harmonic comb produces a strong autocorrelation peak at
    the lag corresponding to f0; broadband noise (even strongly coloured)
    does not, because its autocorrelation decays to ~1/sqrt(N) at non-zero
    lags.

    The spectrum should be *whitened* before calling this function
    (see ``whiten_spectrum``) so that spectral slope from wind noise, mic
    response, etc. does not bias the autocorrelation.

    Written so the hot path is straightforward to later replace with a
    Numba ``@njit`` version.

    Returns
    -------
    (best_f0, harmonicity)   harmonicity in [0, 1].
    """
    df = freqs[1] - freqs[0] if len(freqs) > 1 else 1.0
    n_bins = len(mag_col)

    # In-band indices
    band_lo = int(np.ceil(band[0] / df))
    band_hi = min(int(np.floor(band[1] / df)) + 1, n_bins)

    spec_band = mag_col[band_lo:band_hi] ** 2      # in-band power
    n_band = len(spec_band)

    if n_band < 2 or np.sum(spec_band) < 1e-30:
        return 0.0, 0.0

    # Mean-centre to isolate peak structure for autocorrelation
    spec_c = spec_band - np.mean(spec_band)

    # Fast normalised autocorrelation via FFT
    n_ac = 1
    while n_ac < 2 * n_band:
        n_ac *= 2
    S = np.fft.rfft(spec_c, n=n_ac)
    ac_raw = np.fft.irfft(S * np.conj(S), n=n_ac)[:n_band]

    ac0 = ac_raw[0]
    if ac0 < 1e-30:
        return 0.0, 0.0
    ac = ac_raw / ac0                               # ac[0] == 1.0

    best_f0 = 0.0
    best_harm = 0.0

    for f0 in f0_grid:
        lag = int(round(f0 / df))
        if lag <= 0 or lag >= n_band:
            continue

        h = float(ac[lag])
        h = max(0.0, min(1.0, h))

        if h > best_harm:
            best_harm = h
            best_f0 = float(f0)

    return best_f0, best_harm


def spectral_flatness(mag_col: np.ndarray, freqs: np.ndarray,
                      band: Tuple[float, float] = (100, 8000)) -> float:
    """Compute tonality = 1 - spectral flatness.

    Spectral flatness = geometric mean / arithmetic mean of the in-band
    magnitude spectrum.  Returns tonality in [0, 1]: ~0 for noise, ~1 for
    tonal signals.
    """
    df = freqs[1] - freqs[0] if len(freqs) > 1 else 1.0
    band_lo = int(np.ceil(band[0] / df))
    band_hi = min(int(np.floor(band[1] / df)) + 1, len(mag_col))

    mag_band = mag_col[band_lo:band_hi]
    if len(mag_band) == 0:
        return 0.0

    eps = 1e-30
    log_mean = np.mean(np.log(mag_band + eps))
    geo_mean = np.exp(log_mean)
    arith_mean = np.mean(mag_band) + eps

    flatness = geo_mean / arith_mean
    return float(np.clip(1.0 - flatness, 0.0, 1.0))


def band_energy(mag_col: np.ndarray, freqs: np.ndarray,
                band: Tuple[float, float] = (100, 8000)) -> float:
    """RMS-like in-band energy.

    Used for the amplitude trend -- its slope sign is scale-invariant.
    """
    df = freqs[1] - freqs[0] if len(freqs) > 1 else 1.0
    band_lo = int(np.ceil(band[0] / df))
    band_hi = min(int(np.floor(band[1] / df)) + 1, len(mag_col))

    mag_band = mag_col[band_lo:band_hi]
    if len(mag_band) == 0:
        return 0.0
    return float(np.sqrt(np.mean(mag_band ** 2)))


def whiten_spectrum(mag_col: np.ndarray, kernel_size: int = 5) -> np.ndarray:
    """Remove smooth spectral shape by dividing by a local moving average.

    The kernel must be wider than a typical harmonic peak (~3 bins with
    +/-1 tolerance) but narrower than the minimum harmonic spacing
    (~10 bins at f0_min=80 Hz, df~7.8 Hz).  This makes harmonicity and
    tonality robust to colored noise, microphone response, and wind
    roll-off.
    """
    if kernel_size % 2 == 0:
        kernel_size += 1
    half = kernel_size // 2
    kernel = np.ones(kernel_size) / kernel_size
    padded = np.pad(mag_col, (half, half), mode='edge')
    smoothed = np.convolve(padded, kernel, mode='valid')
    return mag_col / (smoothed + 1e-30)


# ---------------------------------------------------------------------------
# Drone-specificity features (discriminate multirotors from machinery)
# ---------------------------------------------------------------------------

def am_index(energy_series: np.ndarray, frame_rate: float,
             am_band: Tuple[float, float] = (2.0, 40.0)) -> float:
    """Envelope modulation depth (coefficient of variation).

    A multirotor has **several rotors at slightly different RPMs** that
    beat against each other, producing low-frequency AM of the signal
    envelope (typically a few Hz up to ~15 Hz at the STFT frame rate).
    Single-engine machinery (generator, mower) has one dominant rotation
    rate and a much cleaner, less-modulated envelope.

    The metric is simply ``std(energy) / mean(energy)`` -- the envelope
    coefficient of variation.  This is rescaled (×3, clipped) so that
    typical multirotor values (~0.15--0.3) map into the upper [0, 1]
    range, while steady machinery (~0.005--0.02) stays near zero.

    Parameters
    ----------
    energy_series : ndarray
        Band-energy values from consecutive STFT frames.
    frame_rate : float
        STFT frame rate (sr / hop), in Hz.  (Kept for API compat.)
    am_band : tuple
        Not used in the CV metric (kept for API compat).

    Returns
    -------
    float in [0, 1] — rescaled envelope modulation depth.
    """
    n = len(energy_series)
    if n < 8:
        return 0.0

    env = np.asarray(energy_series, dtype=np.float64)
    mean_env = float(np.mean(env))
    if mean_env < 1e-30:
        return 0.0

    cv = float(np.std(env) / mean_env)
    return float(np.clip(cv * 3.0, 0.0, 1.0))


def f0_jitter(f0_series) -> float:
    """Octave-robust coefficient of variation of tracked f0 values.

    A *flying* drone constantly trims motor RPMs to stabilise, so its
    estimated fundamental **jitters** over time.  Steady machinery holds
    a near-constant f0.

    Octave errors (f0 tracker jumping between f0 and 2*f0) are filtered
    out before computing the CV.  Values further than ±40 % from the
    median are discarded, which removes most sub-harmonic and octave
    artefacts without suppressing genuine RPM wander.

    Parameters
    ----------
    f0_series : array-like
        Sequence of f0 estimates (Hz) from tonal frames.

    Returns
    -------
    float >= 0 — std(f0) / mean(f0) after octave-error filtering.
    ~0 for rock-steady, rises with RPM wander.
    """
    arr = np.asarray(f0_series, dtype=np.float64)
    if len(arr) < 4:
        return 0.0

    median_f0 = float(np.median(arr))
    if median_f0 < 1.0:
        return 0.0

    # Filter octave errors: keep within ±40% of median
    mask = np.abs(arr - median_f0) / median_f0 < 0.4
    filtered = arr[mask]
    if len(filtered) < 4:
        return 0.0

    mean_f0 = float(np.mean(filtered))
    if mean_f0 < 1.0:
        return 0.0
    return float(np.std(filtered) / mean_f0)


# ---------------------------------------------------------------------------
# Config & result
# ---------------------------------------------------------------------------

@dataclass
class KnownStaticSource:
    """A known fixed-location confuser (generator, AC unit, pump, etc.).

    Record these by running the detector at the deployment site, noting the
    f0 (and bearing, once the array exists) of each persistent local
    harmonic source, and adding entries here.
    """
    f0: float                             # fundamental, Hz
    bearing: Optional[float] = None       # degrees, once array exists
    tol: float = 5.0                      # Hz tolerance for f0 match


@dataclass
class DetectorConfig:
    """Tunable detector parameters."""
    sr: int = 16000
    n_fft: int = 2048
    hop: int = 512
    band: Tuple[float, float] = (100, 8000)
    f0_min: float = 80
    f0_max: float = 320
    f0_step: float = 2
    n_harm: int = 8
    score_thresh: float = 0.08
    persist_frames: int = 12
    persist_ratio: float = 0.6
    history_seconds: float = 4.0

    # -- drone-specificity (multirotor vs steady machinery) --
    am_history_frames: int = 64           # ~2 s at 31.25 fps
    am_band: Tuple[float, float] = (2.0, 40.0)
    am_min: float = 0.3                   # minimum AM index for drone-like
    jitter_min: float = 0.005             # minimum f0 CV for drone-like
    specificity_thresh: float = 0.3       # drone_likeness gate
    require_specificity: bool = False     # False = Stage-1 compat
    known_static_sources: List = field(default_factory=list)


@dataclass
class FrameResult:
    """Per-frame detection result."""
    t: float
    f0: float
    harmonicity: float
    tonality: float
    score: float
    energy: float
    detected: bool
    closing: bool
    f0_rate: float
    # -- drone-specificity fields --
    am_index: float = 0.0
    f0_jitter: float = 0.0
    drone_likeness: float = 0.0


# ---------------------------------------------------------------------------
# Streaming detector
# ---------------------------------------------------------------------------

class DroneDetector:
    """Streaming-friendly drone detector.  Holds temporal state.

    Usage (offline)::

        det = DroneDetector()
        results = det.process_clip(audio, sr)

    Usage (streaming)::

        det = DroneDetector()
        for mag_col, freqs, t in frame_source:
            r = det.process_frame(mag_col, freqs, t)
    """

    def __init__(self, cfg: Optional[DetectorConfig] = None):
        self.cfg = cfg or DetectorConfig()
        self.frame_dt = self.cfg.hop / self.cfg.sr
        self.frame_rate = self.cfg.sr / self.cfg.hop
        self.f0_grid = np.arange(
            self.cfg.f0_min,
            self.cfg.f0_max + self.cfg.f0_step,
            self.cfg.f0_step,
        )

        # -- persistence state --
        self._score_history: deque = deque(maxlen=self.cfg.persist_frames)

        # -- approach-estimation history --
        max_hist = int(np.ceil(self.cfg.history_seconds / self.frame_dt))
        self._energy_hist: deque = deque(maxlen=max_hist)   # (t, energy)
        self._f0_hist: deque = deque(maxlen=max_hist)       # (t, f0) tonal only

        # -- AM / jitter buffers --
        self._am_buf: deque = deque(maxlen=self.cfg.am_history_frames)

    def reset(self):
        """Clear all temporal state."""
        self._score_history.clear()
        self._energy_hist.clear()
        self._f0_hist.clear()
        self._am_buf.clear()

    def process_frame(self, mag_col: np.ndarray, freqs: np.ndarray,
                      t: float) -> FrameResult:
        """Process one magnitude-spectrum frame.

        Parameters
        ----------
        mag_col : ndarray, shape (n_fft//2+1,)
            Magnitude spectrum of a single STFT frame.
        freqs : ndarray, shape (n_fft//2+1,)
            Frequency axis in Hz.
        t : float
            Frame timestamp in seconds.

        Returns
        -------
        FrameResult
        """
        cfg = self.cfg

        # -- spectral whitening removes smooth slope (colored noise, mic
        #    response) so the autocorrelation-based harmonicity sees only
        #    peak structure, not broadband tilt --
        mag_white = whiten_spectrum(mag_col)

        # -- per-frame features --
        # Harmonicity: spectral autocorrelation on whitened spectrum
        # Tonality:    spectral flatness on original spectrum (preserves
        #              the distinction between peaked and flat spectra)
        # Energy:      original spectrum (physical amplitude for trend)
        f0, harmonicity = harmonic_summation(
            mag_white, freqs, self.f0_grid, cfg.n_harm, cfg.band,
        )
        tonality = spectral_flatness(mag_col, freqs, cfg.band)
        energy = band_energy(mag_col, freqs, cfg.band)
        score = harmonicity * tonality

        # -- persistence --
        above = score > cfg.score_thresh
        self._score_history.append(above)

        if len(self._score_history) >= cfg.persist_frames:
            frac = sum(self._score_history) / len(self._score_history)
        else:
            frac = 0.0
        harmonic_detected = frac >= cfg.persist_ratio

        # -- history for approach estimation --
        self._energy_hist.append((t, energy))
        if above:
            self._f0_hist.append((t, f0))

        # -- AM index (envelope modulation from multirotor beating) --
        self._am_buf.append(energy)
        am_idx = am_index(
            np.array(self._am_buf), self.frame_rate, cfg.am_band,
        )

        # -- f0 jitter (RPM wander from flight-control trimming) --
        recent_f0 = [h[1] for h in self._f0_hist]
        if len(recent_f0) > cfg.am_history_frames:
            recent_f0 = recent_f0[-cfg.am_history_frames:]
        jitter = f0_jitter(recent_f0)

        # -- drone likeness (combined specificity score) --
        jitter_norm = min(jitter / 0.02, 1.0) if jitter > 0 else 0.0
        drone_like = 0.7 * am_idx + 0.3 * jitter_norm

        # -- apply specificity gate --
        detected = harmonic_detected
        if cfg.require_specificity and detected:
            if drone_like < cfg.specificity_thresh:
                detected = False

        # -- confuser masking (known static harmonic sources) --
        if detected and cfg.known_static_sources:
            for src in cfg.known_static_sources:
                if abs(f0 - src.f0) <= src.tol and drone_like < cfg.specificity_thresh:
                    detected = False
                    break

        # -- approach logic --
        closing = False
        f0_rate = 0.0

        if detected:
            energy_slope = self._least_squares_slope(self._energy_hist)
            closing = energy_slope > 0
            f0_rate = self._least_squares_slope(self._f0_hist)

        return FrameResult(
            t=t, f0=f0, harmonicity=harmonicity, tonality=tonality,
            score=score, energy=energy, detected=detected,
            closing=closing, f0_rate=f0_rate,
            am_index=am_idx, f0_jitter=jitter,
            drone_likeness=drone_like,
        )

    def process_clip(self, x: np.ndarray, sr: int) -> List[FrameResult]:
        """Process an entire audio clip (offline convenience).

        Resamples to ``cfg.sr`` if needed, applies zero-phase highpass,
        computes spectrogram, and runs ``process_frame`` on every column.
        """
        if sr != self.cfg.sr:
            from math import gcd
            g = gcd(int(sr), self.cfg.sr)
            x = resample_poly(x, self.cfg.sr // g, int(sr) // g)

        x = highpass(x, self.cfg.sr)
        freqs, times, mag = frame_spectrogram(
            x, self.cfg.sr, self.cfg.n_fft, self.cfg.hop,
        )

        self.reset()
        results: List[FrameResult] = []
        for i, t in enumerate(times):
            results.append(self.process_frame(mag[:, i], freqs, t))
        return results

    # ----- internal helpers -----

    @staticmethod
    def _least_squares_slope(history) -> float:
        """Least-squares slope from a deque of (time, value) pairs."""
        if len(history) < 2:
            return 0.0

        times = np.array([h[0] for h in history])
        values = np.array([h[1] for h in history])

        t = times - times[0]  # normalise to avoid numerical issues
        n = len(t)
        sum_t = np.sum(t)
        sum_v = np.sum(values)
        sum_tt = np.sum(t * t)
        sum_tv = np.sum(t * values)

        denom = n * sum_tt - sum_t * sum_t
        if abs(denom) < 1e-12:
            return 0.0
        return float((n * sum_tv - sum_t * sum_v) / denom)
