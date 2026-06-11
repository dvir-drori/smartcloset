"""
Optional live spectrogram + score plot for the drone detector.

Requires matplotlib (not needed for core detection).

Usage::

    python -m drone_detector.visualize [--device N]
"""

import argparse
import queue
import sys
import threading
from math import gcd

import numpy as np
from scipy.signal import resample_poly

try:
    from drone_detector.detector import DroneDetector, DetectorConfig
    from drone_detector.realtime import CausalHighpass, StreamingFramer, Resampler
except ImportError:
    from detector import DroneDetector, DetectorConfig
    from realtime import CausalHighpass, StreamingFramer, Resampler


def run_visualizer(device=None, target_sr=16000, history_sec=10.0):
    """Launch a live matplotlib window with spectrogram and detection score.

    Parameters
    ----------
    device : int or None
        Audio device index (None = default).
    target_sr : int
        Internal sample rate.
    history_sec : float
        Seconds of history shown in the scrolling plots.
    """
    try:
        import sounddevice as sd
    except ImportError:
        print("sounddevice not installed.  pip install sounddevice")
        sys.exit(1)
    try:
        import matplotlib
        matplotlib.use('TkAgg')
        import matplotlib.pyplot as plt
        from matplotlib.animation import FuncAnimation
    except ImportError:
        print("matplotlib not installed.  pip install matplotlib")
        sys.exit(1)

    # Query device
    if device is not None:
        dev_info = sd.query_devices(device, 'input')
    else:
        dev_info = sd.query_devices(sd.default.device[0], 'input')
    device_sr = int(dev_info['default_samplerate'])

    # Processing chain
    cfg = DetectorConfig(sr=target_sr)
    detector = DroneDetector(cfg)
    resampler = Resampler(device_sr, target_sr)
    hp_filter = CausalHighpass(target_sr)
    framer = StreamingFramer(cfg.n_fft, cfg.hop, target_sr)

    n_freq = cfg.n_fft // 2 + 1
    frame_dt = cfg.hop / cfg.sr
    n_history = int(history_sec / frame_dt)

    # Rolling data buffers
    spec_img = np.zeros((n_freq, n_history))
    score_buf = np.zeros(n_history)
    det_buf = np.zeros(n_history)

    result_queue: queue.Queue = queue.Queue()
    mag_queue: queue.Queue = queue.Queue()

    block_size = int(device_sr * 0.064)

    def audio_callback(indata, frames, time_info, status):
        mono = indata[:, 0].copy()
        resampled = resampler.process(mono)
        filtered = hp_filter.process(resampled)
        frame_list = framer.process(filtered)
        for mag, freqs, t in frame_list:
            result = detector.process_frame(mag, freqs, t)
            result_queue.put(result)
            mag_queue.put(mag)

    stream = sd.InputStream(
        device=device, channels=1, samplerate=device_sr,
        blocksize=block_size, callback=audio_callback,
    )

    fig, (ax_spec, ax_score) = plt.subplots(2, 1, figsize=(12, 6))
    fig.suptitle("Drone Detector -- Live")

    # Spectrogram image (show up to 4 kHz for readability)
    max_freq_idx = min(int(4000 / (target_sr / cfg.n_fft)), n_freq)
    im = ax_spec.imshow(
        spec_img[:max_freq_idx, :],
        aspect='auto', origin='lower',
        extent=[0, history_sec, 0, 4000],
        vmin=-60, vmax=0, cmap='inferno',
    )
    ax_spec.set_ylabel("Freq (Hz)")
    ax_spec.set_xlabel("Time (s)")
    fig.colorbar(im, ax=ax_spec, label="dB")

    line_score, = ax_score.plot([], [], 'b-', label='score')
    line_det, = ax_score.plot([], [], 'r-', linewidth=2, label='detected')
    ax_score.axhline(cfg.score_thresh, color='gray', linestyle='--', alpha=0.5)
    ax_score.set_ylim(-0.05, 1.0)
    ax_score.set_xlim(0, history_sec)
    ax_score.set_ylabel("Score")
    ax_score.set_xlabel("Time (s)")
    ax_score.legend(loc='upper right')

    t_axis = np.linspace(0, history_sec, n_history)

    def update(frame_num):
        # Drain queues
        while not result_queue.empty():
            try:
                r = result_queue.get_nowait()
                score_buf[:-1] = score_buf[1:]
                score_buf[-1] = r.score
                det_buf[:-1] = det_buf[1:]
                det_buf[-1] = float(r.detected)
            except queue.Empty:
                break
        while not mag_queue.empty():
            try:
                m = mag_queue.get_nowait()
                spec_img[:, :-1] = spec_img[:, 1:]
                spec_img[:, -1] = 20 * np.log10(m + 1e-30)
            except queue.Empty:
                break

        im.set_data(spec_img[:max_freq_idx, :])
        line_score.set_data(t_axis, score_buf)
        line_det.set_data(t_axis, det_buf * 0.95)
        return im, line_score, line_det

    stream.start()
    ani = FuncAnimation(fig, update, interval=100, blit=True)  # noqa: F841
    plt.tight_layout()
    plt.show()
    stream.stop()


def main():
    parser = argparse.ArgumentParser(description="Live drone detector visualizer")
    parser.add_argument('--device', type=int, default=None, help='Input device index')
    parser.add_argument('--sr', type=int, default=16000, help='Internal sample rate')
    args = parser.parse_args()
    run_visualizer(device=args.device, target_sr=args.sr)


if __name__ == '__main__':
    main()
