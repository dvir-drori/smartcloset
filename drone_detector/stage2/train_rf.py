"""
Stage 2 -- RandomForest / SVM classifier on engineered features.

This is the most data-efficient first learned step: train a shallow classifier
on the physics-derived features from Stage 1, using a small labelled dataset.

**Stub only** -- not yet implemented.

Feature vector (per frame)
--------------------------
From Stage 1:
    harmonicity, tonality, f0, energy

From drone-specificity features:
    am_index, f0_jitter, drone_likeness

Deltas (frame-to-frame differences):
    d_harmonicity, d_tonality, d_f0, d_energy, d_am_index

Context (window statistics):
    mean_score, std_score, energy_slope, f0_slope

Training data
-------------
- Positive: recordings of drones at various distances and angles.
- Negative: typical ambient sounds (wind, traffic, birds, machinery).
  **Critical:** the negative class must include **recorded local confusers**
  (generator, AC compressor, lawnmower, traffic, idling motorbike), and the
  model must be **validated on held-out confuser types** (never a random
  split) -- this is what produces real "drone vs machinery" robustness.
- Augmentation: mix drone audio with ambient at various SNR levels.

Recommended workflow
--------------------
1. Collect ~30 min of labelled audio (drone / not-drone).
2. Extract per-frame features using ``DroneDetector.process_clip``.
3. Train scikit-learn ``RandomForestClassifier`` or ``SVC`` (RBF kernel).
4. Evaluate with leave-one-environment-out cross-validation.
5. Export the trained model and integrate as a post-filter in the detector.

Example (not yet runnable)::

    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import GroupKFold

    X, y, groups = load_features(...)  # (n_frames, n_features)
    cv = GroupKFold(n_splits=5)
    clf = RandomForestClassifier(n_estimators=200, max_depth=10)
    scores = cross_val_score(clf, X, y, cv=cv, groups=groups)
"""


def extract_features(results):
    """Extract feature matrix from a list of FrameResult objects.

    Parameters
    ----------
    results : list of FrameResult
        Output of ``DroneDetector.process_clip`` or streaming.

    Returns
    -------
    ndarray, shape (n_frames, n_features)
        Feature matrix ready for sklearn.
    """
    raise NotImplementedError("Stage 2 -- implement after collecting data")


def train(feature_dir, output_path):
    """Train a RandomForest on extracted features.

    Parameters
    ----------
    feature_dir : str
        Directory of labelled feature files (.npz).
    output_path : str
        Path to save the trained model (.joblib).
    """
    raise NotImplementedError("Stage 2 -- implement after collecting data")
