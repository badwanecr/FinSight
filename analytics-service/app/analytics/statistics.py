"""Pure statistical helpers — NumPy / SciPy, no pandas, no I/O, fully unit-testable."""
from __future__ import annotations

import numpy as np
from scipy import stats

from app.schemas.analytics import Severity


def safe_float(value, default: float = 0.0) -> float:
    try:
        f = float(value)
    except (TypeError, ValueError):
        return default
    if np.isnan(f) or np.isinf(f):
        return default
    return round(f, 2)


def describe(values: np.ndarray) -> dict:
    values = np.asarray(values, dtype="float64")
    if values.size == 0:
        return {k: 0.0 for k in ("mean", "median", "std", "min", "max", "sum", "count")}
    return {
        "mean": safe_float(values.mean()),
        "median": safe_float(np.median(values)),
        "std": safe_float(values.std(ddof=0)),
        "min": safe_float(values.min()),
        "max": safe_float(values.max()),
        "sum": safe_float(values.sum()),
        "count": int(values.size),
    }


def zscores(values: np.ndarray) -> np.ndarray:
    """Standard score of every element. Zero-variance groups return all zeros."""
    values = np.asarray(values, dtype="float64")
    if values.size < 2:
        return np.zeros_like(values)
    std = values.std(ddof=0)
    if std == 0:
        return np.zeros_like(values)
    return (values - values.mean()) / std


def modified_zscores(values: np.ndarray) -> np.ndarray:
    """Median-absolute-deviation based score — robust to the outliers we hunt for."""
    values = np.asarray(values, dtype="float64")
    if values.size < 2:
        return np.zeros_like(values)
    median = np.median(values)
    mad = np.median(np.abs(values - median))
    if mad == 0:
        return np.zeros_like(values)
    return 0.6745 * (values - median) / mad


def iqr_bounds(values: np.ndarray, multiplier: float = 1.5) -> tuple[float, float, float, float]:
    """Return ``(q1, q3, lower_bound, upper_bound)``."""
    values = np.asarray(values, dtype="float64")
    if values.size < 4:
        lo = safe_float(values.min()) if values.size else 0.0
        hi = safe_float(values.max()) if values.size else 0.0
        return lo, hi, lo, hi
    q1, q3 = np.percentile(values, [25, 75])
    iqr = q3 - q1
    return (
        safe_float(q1),
        safe_float(q3),
        safe_float(q1 - multiplier * iqr),
        safe_float(q3 + multiplier * iqr),
    )


def linear_trend(y: np.ndarray) -> float:
    """Slope of a least-squares line through the series (0 when < 2 points)."""
    y = np.asarray(y, dtype="float64")
    if y.size < 2:
        return 0.0
    x = np.arange(y.size, dtype="float64")
    slope, _, _, _, _ = stats.linregress(x, y)
    return safe_float(slope)


def pct_growth(previous: float, current: float) -> float | None:
    if previous in (0, None):
        return None
    return round((current - previous) / abs(previous) * 100, 1)


def severity_from_zscore(z: float, threshold: float = 3.0) -> Severity:
    a = abs(z)
    if a >= threshold * 2:
        return Severity.CRITICAL
    if a >= threshold * 1.5:
        return Severity.HIGH
    if a >= threshold:
        return Severity.MEDIUM
    return Severity.LOW


def severity_from_ratio(ratio: float) -> Severity:
    """``ratio`` = amount / group-average."""
    if ratio >= 10:
        return Severity.CRITICAL
    if ratio >= 5:
        return Severity.HIGH
    if ratio >= 3:
        return Severity.MEDIUM
    return Severity.LOW


def severity_from_isolation_score(score: float) -> Severity:
    """sklearn score_samples: lower (more negative) = more anomalous."""
    if score <= -0.25:
        return Severity.CRITICAL
    if score <= -0.15:
        return Severity.HIGH
    if score <= -0.05:
        return Severity.MEDIUM
    return Severity.LOW
