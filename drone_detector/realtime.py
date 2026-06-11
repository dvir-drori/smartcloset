"""
Live microphone runner for the drone detector.

Streams audio from the default (or chosen) input device, resamples to
16 kHz, and runs the DroneDetector frame-by-frame.

Usage::

    python drone_detector/realtime.py --list
    python drone_detector/realtime.py [--device N] [--record out.wav] [--sr 16000]

sounddevice is lazy-imported so the module can be imported without
PortAudio installed (e.g. for tests that only need CausalHighpass /
StreamingFramer / Resampler).
"""

import argparse
import queue
import sys
import time
import wave
from math import gcd

import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi, resample_poly

try:
    from drone_detector.detector import DroneDetector, DetectorConfig
except ImportError:
    from detector import DroneDetector, DetectorConfig


# ---------------------------------------------------------------------------
# Streaming building blocks
# ---------------------------------------------------------------------------

class CausalHighpass:
    """Stateful causal highpass filter for streaming use.

    Uses ``sosfilt`` (not ``sosfiltfilt``) and carries filter state ``zi``
    between blocks so there is no look-ahead.
    """

    def __init__(self, sr: int, cutoff: float = 80.0, order: int = 4):
        self.sos = butter(order, cutoff, btype='high', fs=sr, output='sos')
        # Zero initial conditions (shape: n_sections x 2)
        self.zi = np.zeros((self.sos.shape[0], 2))

    def process(self, block: np.ndarray) -> np.ndarray:
        out, self.zi = sosfilt(self.sos, block, zi=self.zi)
        return out


class Resampler:
    """Resample audio from device rate to target rate via ``resample_poly``.

    Identity operation when the rates are equal.
    """

    def __init__(self, sr_in: int, sr_out: int):
        self.sr_in = sr_in
        self.sr_out = sr_out
        if sr_in != sr_out:
            g = gcd(sr_in, sr_out)
            self.up = sr_out // g
            self.down = sr_in // g
        else:
            self.up = 1
            self.down = 1

    def process(self, block: np.ndarray) -> np.ndarray:
        if self.up == self.down:
            return block.copy()
        return resample_poly(block, self.up, self.down)


class StreamingFramer:
    """Buffer incoming samples and emit overlapping STFT magnitude frames.

    Handles block-boundary continuity so frames are identical to a single
    offline STFT of the concatenated stream.
    """

    def __init__(self, n_fft: int, hop: int, sr: int):
        self.n_fft = n_fft
        self.hop = hop
        self.sr = sr
        self.window = np.hanning(n_fft)
        self.buffer = np.zeros(0, dtype=np.float64)
        self.freqs = np.fft.rfftfreq(n_fft, d=1.0 / sr)
        self._frame_count = 0

    def process(self, block: np.ndarray):
        """Accept a block of samples.

        Returns a list of ``(mag_col, freqs, time)`` tuples -- one per
        complete STFT frame that can be extracted from the current buffer.
        """
        self.buffer = np.concatenate([self.buffer, block])
        frames = []
        while len(self.buffer) >= self.n_fft:
            segment = self.buffer[:self.n_fft] * self.window
            mag = np.abs(np.fft.rfft(segment))
            t = self._frame_count * self.hop / self.sr
            frames.append((mag, self.freqs, t))
            self.buffer = self.buffer[self.hop:]
            self._frame_count += 1
        return frames


# ---------------------------------------------------------------------------
# Device helpers
# ---------------------------------------------------------------------------

def list_devices():
    """Print available audio input devices and exit."""
    try:
        import sounddevice as sd
    except ImportError:
        print("sounddevice not installed.  Install with: pip install sounddevice")
        sys.exit(1)

    print("Available audio input devices:")
    print("-" * 60)
    devices = sd.query_devices()
    for i, dev in enumerate(devices):
        if dev['max_input_channels'] > 0:
            marker = " (DEFAULT)" if i == sd.default.device[0] else ""
            print(f"  [{i}] {dev['name']} "
                  f"(in={dev['max_input_channels']}, "
                  f"rate={dev['default_samplerate']:.0f}){marker}")


# ---------------------------------------------------------------------------
# Live runner
# ---------------------------------------------------------------------------

def run_live(device=None, record_path=None, target_sr=16000):
    """Run live drone detection from the microphone."""
    try:
        import sounddevice as sd
    except ImportError:
        print("sounddevice not installed.  Install with: pip install sounddevice")
        sys.exit(1)

    # Query device
    if device is not None:
        dev_info = sd.query_devices(device, 'input')
    else:
        dev_info = sd.query_devices(sd.default.device[0], 'input')

    device_sr = int(dev_info['default_samplerate'])
    print(f"Device: {dev_info['name']} @ {device_sr} Hz")
    print(f"Internal sample rate: {target_sr} Hz")

    # Processing chain
    cfg = DetectorConfig(sr=target_sr)
    detector = DroneDetector(cfg)
    resampler = Resampler(device_sr, target_sr)
    hp_filter = CausalHighpass(target_sr)
    framer = StreamingFramer(cfg.n_fft, cfg.hop, target_sr)

    result_queue: queue.Queue = queue.Queue()

    # Optional WAV recording at capture rate
    wav_file = None
    if record_path:
        wav_file = wave.open(record_path, 'w')
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(device_sr)

    # ~64 ms blocks at device rate
    block_size = int(device_sr * 0.064)

    def audio_callback(indata, frames, time_info, status):
        if status:
            print(f"[audio] {status}", file=sys.stderr)

        mono = indata[:, 0].copy()

        # Save raw audio if recording
        if wav_file is not None:
            pcm = (mono * 32767).astype(np.int16)
            wav_file.writeframes(pcm.tobytes())

        # Resample -> highpass -> frame -> detect
        resampled = resampler.process(mono)
        filtered = hp_filter.process(resampled)
        frame_list = framer.process(filtered)

        for mag, freqs, t in frame_list:
            result = detector.process_frame(mag, freqs, t)
            result_queue.put(result)

    print("Listening... (Ctrl+C to stop)\n")

    was_detected = False
    stream = sd.InputStream(
        device=device,
        channels=1,
        samplerate=device_sr,
        blocksize=block_size,
        callback=audio_callback,
    )

    try:
        with stream:
            while True:
                try:
                    result = result_queue.get(timeout=0.1)
                except queue.Empty:
                    continue

                # Single repainting status line
                bar_len = min(int(result.score * 50), 50)
                bar = '#' * bar_len + '-' * (50 - bar_len)

                parts = [
                    f"f0={result.f0:5.0f}Hz",
                    f"score={result.score:.3f}",
                    f"[{bar}]",
                ]

                if result.detected:
                    parts.append("DETECTED")
                if result.closing:
                    parts.append("<== APPROACHING")

                line = " ".join(parts)
                print(f"\r{line:<110}", end="", flush=True)

                # Permanent event log on state transitions
                if result.detected and not was_detected:
                    print(f"\n[event] detection start  t={result.t:.2f}s "
                          f"f0={result.f0:.0f}Hz score={result.score:.3f}")
                elif not result.detected and was_detected:
                    print(f"\n[event] detection end    t={result.t:.2f}s")

                was_detected = result.detected

    except KeyboardInterrupt:
        print("\n\nStopped.")
    finally:
        if wav_file is not None:
            wav_file.close()
            print(f"Recording saved to {record_path}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Real-time acoustic drone detector",
    )
    parser.add_argument(
        '--list', action='store_true',
        help='List audio input devices and exit',
    )
    parser.add_argument(
        '--device', type=int, default=None,
        help='Input device index (see --list)',
    )
    parser.add_argument(
        '--record', type=str, default=None, metavar='PATH',
        help='Also save captured audio to a WAV file (at capture rate)',
    )
    parser.add_argument(
        '--sr', type=int, default=16000,
        help='Internal sample rate (default: 16000)',
    )

    args = parser.parse_args()

    if args.list:
        list_devices()
        return

    run_live(device=args.device, record_path=args.record, target_sr=args.sr)


if __name__ == '__main__':
    main()
