"""
Stage 2 -- Log-mel CNN classifier (PyTorch).

A small convolutional network on log-mel spectrograms for drone vs. non-drone
classification.  This is the deep-learning upgrade path once sufficient labelled
data is available.

**Stub only** -- not yet implemented.

Architecture
------------
Input:  log-mel spectrogram patch, e.g. 64 mel bins x 64 frames (~2 s).
Model:  3-4 conv layers (small kernels), global average pooling, 1 FC -> sigmoid.
Output: drone probability per patch.

Training data
-------------
- Positive: ``saraalemadi/DroneAudioDataset`` (HuggingFace).
- Negative: ESC-50, UrbanSound8K.
- **Augment at low SNR** (mix drone + ambient at -5 to +10 dB) to match
  real-world conditions.
- **Validate on held-out drone types and environments**, never a random split.
  The model must generalise across drone models, distances, and acoustic
  environments.
- **Critical:** the negative class must include **recorded local confusers**
  (generator, AC compressor, lawnmower, traffic), and the model must be
  **validated on held-out confuser types** -- that is what produces real
  "drone vs machinery" robustness.  The hand-built ``am_index``,
  ``f0_jitter``, and ``drone_likeness`` features from ``detector.py``
  should be concatenated with or appended as auxiliary inputs alongside
  the CNN embedding for best results.

Notes
-----
- A cyclostationary beamforming front-end (cMPDR) is the right low-SNR upgrade
  once a multi-mic array exists.  The CNN operates downstream of beamforming.
- On a Raspberry Pi, use ONNX Runtime or TFLite for inference; PyTorch is for
  training only.

Example (not yet runnable)::

    import torch
    import torch.nn as nn

    class DroneNet(nn.Module):
        def __init__(self, n_mels=64):
            super().__init__()
            self.features = nn.Sequential(
                nn.Conv2d(1, 16, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
                nn.Conv2d(16, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
                nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(),
                nn.AdaptiveAvgPool2d(1),
            )
            self.classifier = nn.Linear(64, 1)

        def forward(self, x):
            x = self.features(x)
            x = x.view(x.size(0), -1)
            return torch.sigmoid(self.classifier(x))
"""


def build_dataset(drone_dir, ambient_dir, snr_range=(-5, 10)):
    """Build a training dataset from drone and ambient audio directories.

    Parameters
    ----------
    drone_dir : str
        Directory of drone audio files.
    ambient_dir : str
        Directory of ambient / non-drone audio files.
    snr_range : tuple of float
        (min_snr_db, max_snr_db) for augmentation mixing.

    Returns
    -------
    Dataset
        PyTorch Dataset yielding (log_mel_patch, label) pairs.
    """
    raise NotImplementedError("Stage 2 -- implement with PyTorch + torchaudio")


def train(dataset, output_path, epochs=50, lr=1e-3):
    """Train the CNN and save the best checkpoint.

    Parameters
    ----------
    dataset : Dataset
        From ``build_dataset``.
    output_path : str
        Path to save the trained model (.pt).
    epochs : int
        Training epochs.
    lr : float
        Learning rate.
    """
    raise NotImplementedError("Stage 2 -- implement with PyTorch")
