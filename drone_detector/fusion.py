"""
Multi-node approach-vector logic for distributed microphone arrays.

This module provides bearing and approach analysis once multiple
microphones or nodes are available.  With a single microphone only
detection + closing (energy trend) is available.  Adding a second mic
enables coarse bearing; a distributed array of cheap MEMS mics
(e.g. INMP441 + ESP32 / Pi) enables a full approach-vector estimate.

**Currently a sketch** -- activate once >=2 mics give a bearing.
"""

import numpy as np
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class BearingObservation:
    """A single bearing/energy observation from a mic pair or node."""
    t: float            # timestamp (s)
    bearing_deg: float  # estimated bearing [0, 360)
    energy: float       # signal energy at this observation


def constant_bearing_alarm(bearings_deg: List[float],
                           energies: List[float],
                           window: int = 10,
                           bearing_tol: float = 8.0) -> bool:
    """Collision-course test -- bearing ~constant while energy rises => inbound.

    A target on a collision course maintains approximately constant bearing
    while its signal strength increases ("constant bearing, decreasing range"
    / CBDR).  Only coarse bearing is needed, so cheap distributed mics
    suffice.

    Parameters
    ----------
    bearings_deg : list of float
        Recent bearing estimates in degrees.
    energies : list of float
        Corresponding signal energies (same length as *bearings_deg*).
    window : int
        Number of most-recent observations to consider.
    bearing_tol : float
        Maximum bearing spread (degrees) to count as "constant".

    Returns
    -------
    bool
        True if bearing is roughly constant **and** energy is increasing.

    Notes
    -----
    This function activates meaningfully only when >=2 mics provide bearing
    estimates.  A single mic provides detection + closing (energy trend)
    only, with no bearing information.
    """
    if len(bearings_deg) < window or len(energies) < window:
        return False

    recent_bearings = np.array(bearings_deg[-window:])
    recent_energies = np.array(energies[-window:])

    # Bearing constancy -- circular statistics (handle 0/360 wraparound)
    rad = np.deg2rad(recent_bearings)
    mean_sin = np.mean(np.sin(rad))
    mean_cos = np.mean(np.cos(rad))
    mean_bearing = np.rad2deg(np.arctan2(mean_sin, mean_cos)) % 360

    deviations = recent_bearings - mean_bearing
    deviations = (deviations + 180) % 360 - 180  # wrap to [-180, 180]
    bearing_spread = float(np.max(np.abs(deviations)))

    if bearing_spread > bearing_tol:
        return False

    # Energy trend (least-squares slope)
    t = np.arange(window, dtype=float)
    n = len(t)
    sum_t = np.sum(t)
    sum_e = np.sum(recent_energies)
    sum_tt = np.sum(t * t)
    sum_te = np.sum(t * recent_energies)
    denom = n * sum_tt - sum_t * sum_t
    if abs(denom) < 1e-12:
        return False
    slope = (n * sum_te - sum_t * sum_e) / denom

    return bool(slope > 0)


def estimate_bearing_tdoa(signal_a: np.ndarray,
                          signal_b: np.ndarray,
                          sr: int,
                          mic_distance_m: float,
                          speed_of_sound: float = 343.0) -> Optional[float]:
    """Estimate bearing from time-difference-of-arrival (TDOA) of two mics.

    **Stub** -- not yet implemented.  Will use GCC-PHAT cross-correlation
    for robust TDOA estimation, converting the delay to a bearing angle.

    Parameters
    ----------
    signal_a, signal_b : ndarray
        Aligned audio chunks from two microphones.
    sr : int
        Sample rate (Hz).
    mic_distance_m : float
        Physical distance between the two mics (metres).
    speed_of_sound : float
        Speed of sound (m/s), default 343.

    Returns
    -------
    float or None
        Bearing in degrees, or None if the estimate is unreliable.

    Notes
    -----
    - With two mics there is a front/back ambiguity (+/-theta).
      Three or more mics resolve this.
    - The spatial / approach test (elevation + motion) is the
      highest-specificity discriminator and the main reason to build the
      multi-mic array.  A drone is elevated, moving, and on an approach
      vector; a generator sits at a fixed ground location.
    """
    # TODO: Implement GCC-PHAT cross-correlation for robust TDOA
    # TODO: Multi-mic generalisation for full 360-degree bearing
    raise NotImplementedError(
        "TDOA bearing estimation requires >=2 mics (Stage 2+)"
    )


# ---------------------------------------------------------------------------
# Drone approach alarm (spatial + dynamics, requires array)
# ---------------------------------------------------------------------------

def drone_approach_alarm(bearings_deg: List[float],
                         energies: List[float],
                         elevations_deg: Optional[List[float]] = None,
                         bearing_rates: Optional[List[float]] = None,
                         drone_likeness: float = 0.0,
                         window: int = 10,
                         bearing_tol: float = 8.0,
                         elevation_min: float = 5.0) -> bool:
    """Full drone-specific approach alarm — strongest overall discriminator.

    Combines **spatial** and **dynamics** tests.  The decisive real-world
    discriminator: a drone is **elevated, moving, and on an approach
    vector**; a generator sits at a fixed ground location.

    The alarm fires when ALL of the following hold:

    1. Harmonic detection is active (caller checks this).
    2. ``drone_likeness >= threshold`` (AM beating + f0 jitter from
       ``detector.py``).
    3. **Moving**: the bearing is changing over time (bearing rate != 0),
       OR the constant-bearing + rising-energy (CBDR) condition holds.
    4. **Elevated** (optional, requires 3D array): elevation estimate is
       above ``elevation_min`` degrees.

    This test is **the main reason to build the multi-mic array**.  With a
    single mic you only get detection + closing (energy trend) + drone
    dynamics.  With >=2 mics you add bearing; with a 3D arrangement you
    add elevation.

    Parameters
    ----------
    bearings_deg : list of float
        Recent bearing estimates (degrees).
    energies : list of float
        Corresponding signal energies.
    elevations_deg : list of float or None
        Elevation estimates from 3D array (None if unavailable).
    bearing_rates : list of float or None
        Rate of bearing change (deg/s); positive = clockwise.
    drone_likeness : float
        Combined AM + jitter score from ``DroneDetector``.
    window : int
        Number of recent observations to consider.
    bearing_tol : float
        Max bearing spread for "constant bearing" CBDR test.
    elevation_min : float
        Minimum elevation (degrees) to count as "elevated".

    Returns
    -------
    bool
        True if the target is very likely a drone on an inbound course.

    Notes
    -----
    This function stays inactive until the array is connected (needs at
    least ``window`` bearing observations).  It is the highest-specificity
    test and the main reason to build the multi-mic array.
    """
    if len(bearings_deg) < window or len(energies) < window:
        return False

    # Require drone dynamics (from single-mic features)
    if drone_likeness < 0.3:
        return False

    # Check if target is moving (bearing changing) or on collision course
    on_collision_course = constant_bearing_alarm(
        bearings_deg, energies, window=window, bearing_tol=bearing_tol,
    )

    is_moving = False
    if bearing_rates is not None and len(bearing_rates) >= window:
        recent_rates = np.array(bearing_rates[-window:])
        is_moving = float(np.mean(np.abs(recent_rates))) > 0.5  # deg/s

    if not (on_collision_course or is_moving):
        return False

    # Elevation check (only if 3D array provides it)
    if elevations_deg is not None and len(elevations_deg) >= window:
        recent_elev = np.array(elevations_deg[-window:])
        if float(np.mean(recent_elev)) < elevation_min:
            return False

    return True
