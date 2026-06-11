# Drone Detector -- Real-time Acoustic Early Warning

Detects approaching multirotor / FPV drones from their sound, running in
real time on a computer microphone.  Answers three questions:

1. **Is a drone present?** -- harmonic comb signature detection.
2. **Is it persisting?** -- temporal integration rejects transient sounds.
3. **Is it getting closer?** -- energy-trend and f0-drift (Doppler proxy).

No training data required.  The core discriminator is
**harmonicity x tonality, integrated over time** -- pure signal physics.

## Install

```bash
pip install -r requirements.txt
```

On Linux you also need PortAudio:

```bash
sudo apt-get install libportaudio2
```

## Quick start

List available audio devices:

```bash
python drone_detector/realtime.py --list
```

Run live detection on the default microphone:

```bash
python drone_detector/realtime.py
```

Choose a specific device and record the captured audio:

```bash
python drone_detector/realtime.py --device 2 --record capture.wav
```

Run with the optional visualizer (requires matplotlib):

```bash
python drone_detector/visualize.py
```

## Tests

```bash
python -m pytest drone_detector/tests/ -v
```

All tests use synthetic signals -- no external audio files needed.

## Tuning workflow

1. Play real drone audio through a speaker near the mic (or use a
   recording via `--record`).
2. Also capture your site's ambient noise (wind, traffic, machinery).
3. Watch the live `score` value.
4. Adjust thresholds in `DetectorConfig`:
   - **`score_thresh`** (default 0.08): raise to reduce false alarms,
     lower for more sensitivity.
   - **`persist_frames`** (default 12) / **`persist_ratio`** (default 0.6):
     how many consecutive frames must score above threshold before a
     detection is declared.  Increase to reject more transient sounds;
     decrease for faster response.
5. Verify: drone audio triggers `DETECTED`, ambient noise does not.

## How it works

A multirotor produces a **comb of harmonics** on top of its blade-pass
frequency (BPF), fundamental typically 100--300 Hz, harmonics extending
to several kHz.  Broadband noise (wind, traffic) has no such comb.

For each STFT frame:

- **Harmonic summation**: sweep candidate f0 values, sum spectral energy
  at k*f0 for k=1..8.  The best f0 and its harmonicity ratio are returned.
- **Spectral flatness**: geometric/arithmetic mean ratio of the in-band
  spectrum.  Tonality = 1 - flatness.
- **Score = harmonicity x tonality**: high for a harmonic source, ~0 for
  noise.  Amplitude-scale-invariant (ratios only).

Temporal integration:

- A rolling window of `persist_frames` checks whether `score > threshold`
  in at least `persist_ratio` of frames.  This rejects bird chirps and
  other transients.

Approach estimation:

- Least-squares slope of band energy over `history_seconds`: positive
  slope means the source is getting louder (closing).
- f0 drift rate (Hz/s) as a Doppler proxy.

## Drone specificity (`require_specificity=True`)

Stage 1 detects any **sustained harmonic source**.  This is correct for
rejecting wind and bird chirps, but it also trips on steady machinery
(generators, AC compressors, lawnmowers, pumps).  The specificity
features exploit what is **physically unique to a flying multirotor**:

- **AM index** (`am_index`): a multirotor has several rotors at slightly
  different RPMs that beat against each other, producing low-frequency
  amplitude modulation (2--15 Hz).  Single-engine machinery has a cleaner,
  less-modulated comb.
- **f0 jitter** (`f0_jitter`): a flying drone constantly trims motor RPMs
  to stabilise, so its fundamental jitters.  Steady machinery holds
  near-constant f0.
- **`drone_likeness`**: weighted combination of AM index + f0 jitter.
  Exposed on every `FrameResult`.

Set `require_specificity=True` in `DetectorConfig` to gate detection on
these dynamics.  With the flag off (default), Stage-1 behaviour is
unchanged.

### Confuser masking (fixed-site deployment)

For a fixed location, you can record the f0 (and bearing, once the
array exists) of persistent local harmonic sources and add them to
`known_static_sources` in the config:

```python
from drone_detector.detector import DetectorConfig, KnownStaticSource

cfg = DetectorConfig(
    require_specificity=True,
    known_static_sources=[
        KnownStaticSource(f0=150, tol=5.0),   # generator
        KnownStaticSource(f0=200, tol=3.0),   # AC unit
    ],
)
```

A detection whose f0 matches a known source *and* lacks drone dynamics
(`drone_likeness` low) is suppressed automatically.

### Spatial / approach test (strongest discriminator)

The decisive real-world discriminator: a drone is **elevated, moving,
and on an approach vector**; a generator sits at a fixed ground
location.  With a single mic you get detection + closing + drone
dynamics.  With >=2 mics you add bearing; with a 3D array you add
elevation.  See `fusion.drone_approach_alarm()`.  **This is the main
reason to build the multi-mic array.**

## Roadmap

1. **Single mic** (current): detection + closing + drone specificity.
2. **Two USB mics**: TDOA-based coarse bearing.  Enables
   constant-bearing-decreasing-range (CBDR) alarm in `fusion.py`.
3. **Distributed MEMS array**: cheap INMP441 + ESP32/Pi nodes reporting
   to one host.  Full bearing + elevation.  Unlocks the spatial/approach
   test — the highest-specificity discriminator.
4. **Stage 2 learned refinement**: RandomForest on engineered features
   (`stage2/train_rf.py`), then log-mel CNN (`stage2/train_cnn.py`).
   Train on `saraalemadi/DroneAudioDataset` + ESC-50/UrbanSound8K at
   low SNR; validate on held-out drone types and environments.
