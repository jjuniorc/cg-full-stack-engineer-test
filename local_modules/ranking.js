/**
 * Ranking helpers shared by every activity defined in ./activities.js.
 *
 * Each activity converts the daily Open-Meteo values into a 0..100 score.
 * This module keeps the shared math (piecewise scoring, weighted average and the
 * score -> rank mapping) in one place so all activities rank consistently.
 */

export const RANK = {
    BAD: "BAD",
    REGULAR: "REGULAR",
    GOOD: "GOOD"
};

export const SCORE_RANGE = {
    MIN: 0,
    MAX: 100
};

// A day needs REGULAR points to be "REGULAR" and GOOD points to reach "GOOD".
export const RANK_THRESHOLDS = {
    REGULAR: 40,
    GOOD: 70
};

/**
 * Keep a number inside the score range.
 *
 * @param {number} value
 * @param {number} [min]
 * @param {number} [max]
 * @returns {number}
 */
export function clamp(value, min = SCORE_RANGE.MIN, max = SCORE_RANGE.MAX)
{
    if(!Number.isFinite(value))
    {
        return min;
    }

    return Math.min(Math.max(value, min), max);
}

/**
 * Map a daily weather value to a sub-score using ascending breakpoints.
 *
 * @param {number} value Daily weather value (temperature, wind, ...).
 * @param {Array<{upTo: number, score: number}>} points Breakpoints ordered from
 *        the smallest `upTo` to the largest. Use `Infinity` on the last bucket.
 * @returns {number|null} The matching sub-score or null when there is no data.
 */
export function piecewiseScore(value, points)
{
    if(!Number.isFinite(value) || !Array.isArray(points) || points.length === 0)
    {
        return null;
    }

    for(const point of points)
    {
        if(value <= point.upTo)
        {
            return point.score;
        }
    }

    // Value is above every breakpoint: fall back to the last bucket.
    return points[points.length - 1].score;
}

/**
 * Combine weighted sub-scores into a single 0..100 score.
 *
 * Factors without a numeric score are ignored and the remaining weights are
 * re-normalized, so a missing daily value never drags the rank down.
 *
 * @param {Array<{score: number|null, weight: number}>} factors
 * @returns {number|null} The weighted score or null when nothing could be scored.
 */
export function weightedScore(factors)
{
    if(!Array.isArray(factors) || factors.length === 0)
    {
        return null;
    }

    let totalWeight = 0;
    let totalScore = 0;

    for(const factor of factors)
    {
        const score = factor?.score;
        const weight = Number.isFinite(factor?.weight) ? factor.weight : 1;

        if(!Number.isFinite(score) || weight <= 0)
        {
            continue;
        }

        totalWeight += weight;
        totalScore += score * weight;
    }

    if(totalWeight === 0)
    {
        return null;
    }

    return clamp(totalScore / totalWeight);
}

/**
 * Translate a 0..100 score into the public rank tiers.
 *
 * @param {number} score
 * @returns {string} One of RANK.BAD, RANK.REGULAR or RANK.GOOD.
 */
export function scoreToRank(score)
{
    if(!Number.isFinite(score))
    {
        return RANK.REGULAR;
    }

    if(score >= RANK_THRESHOLDS.GOOD)
    {
        return RANK.GOOD;
    }

    if(score >= RANK_THRESHOLDS.REGULAR)
    {
        return RANK.REGULAR;
    }

    return RANK.BAD;
}

/**
 * Round a score for output.
 *
 * @param {number} score
 * @param {number} [decimals]
 * @returns {number|null}
 */
export function roundScore(score, decimals = 0)
{
    if(!Number.isFinite(score))
    {
        return score;
    }

    const factor = 10 ** decimals;

    return Math.round(score * factor) / factor;
}

/**
 * Average of the finite numbers in a list (ignores null/undefined gaps).
 *
 * @param {Array<number|null>} values
 * @returns {number|null}
 */
export function average(values)
{
    if(!Array.isArray(values))
    {
        return null;
    }

    const valid = values.filter((value) => Number.isFinite(value));

    if(valid.length === 0)
    {
        return null;
    }

    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

// WMO weather interpretation codes (WMO WW) mapped to a 0..100 severity where a
// higher value means nastier outdoor weather.
export const WMO_WEATHER_CODES = {
    0: { description: "Clear sky", severity: 0 },
    1: { description: "Mainly clear", severity: 5 },
    2: { description: "Partly cloudy", severity: 10 },
    3: { description: "Overcast", severity: 20 },
    45: { description: "Fog", severity: 45 },
    48: { description: "Depositing rime fog", severity: 50 },
    51: { description: "Light drizzle", severity: 40 },
    53: { description: "Moderate drizzle", severity: 50 },
    55: { description: "Dense drizzle", severity: 60 },
    56: { description: "Light freezing drizzle", severity: 70 },
    57: { description: "Dense freezing drizzle", severity: 75 },
    61: { description: "Slight rain", severity: 55 },
    63: { description: "Moderate rain", severity: 65 },
    65: { description: "Heavy rain", severity: 80 },
    66: { description: "Light freezing rain", severity: 85 },
    67: { description: "Heavy freezing rain", severity: 90 },
    71: { description: "Slight snowfall", severity: 60 },
    73: { description: "Moderate snowfall", severity: 70 },
    75: { description: "Heavy snowfall", severity: 85 },
    77: { description: "Snow grains", severity: 55 },
    80: { description: "Slight rain showers", severity: 50 },
    81: { description: "Moderate rain showers", severity: 65 },
    82: { description: "Violent rain showers", severity: 85 },
    85: { description: "Slight snow showers", severity: 65 },
    86: { description: "Heavy snow showers", severity: 85 },
    95: { description: "Thunderstorm", severity: 90 },
    96: { description: "Thunderstorm with slight hail", severity: 95 },
    97: { description: "Heavy thunderstorm", severity: 95 },
    99: { description: "Thunderstorm with heavy hail", severity: 100 }
};

/**
 * Description and severity for a WMO weather code.
 *
 * @param {number} code
 * @returns {{description: string, severity: number|null}}
 */
export function weatherCodeInfo(code)
{
    return WMO_WEATHER_CODES[code] ?? { description: "Unknown weather code", severity: null };
}

/**
 * Severity (0..100) for a WMO weather code.
 *
 * @param {number} code
 * @returns {number|null}
 */
export function weatherSeverity(code)
{
    return weatherCodeInfo(code).severity;
}

export function isClear(code)
{
    return code === 0 || code === 1;
}

export function isFog(code)
{
    return code === 45 || code === 48;
}

export function isDrizzle(code)
{
    return code >= 51 && code <= 57;
}

export function isRain(code)
{
    return code >= 61 && code <= 67;
}

export function isRainShowers(code)
{
    return code >= 80 && code <= 82;
}

export function isFreezingRain(code)
{
    return code === 66 || code === 67;
}

export function isSnow(code)
{
    return (code >= 71 && code <= 77) || code === 85 || code === 86;
}

export function isThunderstorm(code)
{
    return code >= 95 && code <= 99;
}
