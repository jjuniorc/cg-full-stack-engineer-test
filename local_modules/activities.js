import { getForecast } from "./openmeteo.js"
import { piecewiseScore, weightedScore, scoreToRank, weatherSeverity, roundScore, 
    isClear,
    isFog,
    isDrizzle,
    isRain,
    isRainShowers,
    isSnow,
    isThunderstorm } from "./ranking.js";

const SIGHTSEEING_DAILY_PARAMS = [
    "temperature_2m_mean",            // comfort
    "precipitation_sum",              // dryness / rain
    "precipitation_probability_max",  // risk of rain
    "wind_speed_10m_max",             // calm vs blustery
    "weather_code",                   // sky + hazard
    "sunshine_duration",              // sunniness
    "daylight_duration"               // day length (ratio with the above)
];

export async function next7DaysSki(city)
{
    const dailyParams = [
        "temperature_2m_max",
        "snowfall_sum",
        "wind_gusts_10m_max",
        "weather_code",
        "temperature_2m_min"
    ];

    const forecast = await getForecast(city, dailyParams);

    const result = {
        "days": []
    }

    if(!forecast)
    {
        return result;
    }

    if(!forecast.dailyVariables)
    {
        return result;
    }

    const columns = {};

    dailyParams.forEach((name, position) => {
        columns[name] = forecast.dailyVariables(position).valuesArray();
    });

    const days = columns['temperature_2m_max'].length;
    const start = forecast.dailyStart;
    const step = forecast.dailyStep;

    // snowfall_sum (cm) -> reward fresh snow; no fresh snow only scores the base.
    const snowPoints = [
        { "upTo": 0, "score": 20 },          // no new snow (existing base only)
        { "upTo": 1, "score": 40 },
        { "upTo": 5, "score": 65 },
        { "upTo": 10, "score": 85 },
        { "upTo": Infinity, "score": 100 }   // 10 cm+ dump
    ];

    // temperature_2m_max (°C) -> snow must stay frozen through the day.
    const coldPoints = [
        { "upTo": 0, "score": 100 },         // stays below freezing all day
        { "upTo": 2, "score": 80 },
        { "upTo": 5, "score": 50 },          // marginal: starts melting
        { "upTo": Infinity, "score": 0 }     // too warm, snow turns to slush
    ];

    // wind_gusts_10m_max (km/h) -> strong gusts hold/closes lifts and scours snow.
    const gustPoints = [
        { "upTo": 30, "score": 100 },
        { "upTo": 50, "score": 60 },
        { "upTo": 70, "score": 30 },
        { "upTo": Infinity, "score": 0 }     // lift closures likely
    ];

    // temperature_2m_min (°C) -> a nightly freeze preserves the base (colder = better).
    const freezePoints = [
        { "upTo": -5, "score": 100 },        // deep overnight freeze
        { "upTo": -2, "score": 85 },
        { "upTo": 0, "score": 60 },          // marginal freeze
        { "upTo": Infinity, "score": 20 }    // no freeze, base softens/wets
    ];

    for(let ix = 0; ix < days; ix++)
    {
        const tempMax     = columns.temperature_2m_max[ix];
        const snowfall    = columns.snowfall_sum[ix];
        const windGust    = columns.wind_gusts_10m_max[ix];
        const weatherCode = columns.weather_code[ix];
        const tempMin     = columns.temperature_2m_min[ix];

        const score = weightedScore([
            { "score": piecewiseScore(snowfall,  snowPoints),  "weight": 0.35 },
            { "score": piecewiseScore(tempMax,   coldPoints),  "weight": 0.30 },
            { "score": piecewiseScore(windGust,  gustPoints),  "weight": 0.20 },
            { "score": skiWeatherScore(weatherCode),           "weight": 0.10 },
            { "score": piecewiseScore(tempMin,   freezePoints),"weight": 0.05 }
        ]);

        result.days.push({
            "day": ix + 1,
            "date": new Date((start + ix * step) * 1000).toISOString().slice(0, 10), // YYYY-MM-DD
            "rank": scoreToRank(score),
            "score": roundScore(score),
            "metrics": {
                "temperature_2m_max": tempMax,
                "snowfall_sum": snowfall,
                "wind_gusts_10m_max": windGust,
                "temperature_2m_min": tempMin,
                "weather_code": weatherCode
            }
        })
    }

    return result;
}

export async function next7DaysSurf(city)
{
    const dailyParams = [
        "temperature_2m_mean",
        "wind_speed_10m_max",
        "wind_gusts_10m_max",
        "weather_code",
        "precipitation_sum"
    ];

    const forecast = await getForecast(city, dailyParams);

    const result = {
        "days": []
    }

    if(!forecast)
    {
        return result;
    }

    if(!forecast.dailyVariables)
    {
        return result;
    }

    // Read each requested variable once. Open-Meteo preserves the order of
    // dailyParams in the response, so every column name maps to its own values.
    const columns = {};

    dailyParams.forEach((name, position) => {
        columns[name] = forecast.dailyVariables(position).valuesArray();
    });

    const days = columns['temperature_2m_mean'].length;
    const start = forecast.dailyStart;
    const step = forecast.dailyStep;

    for(let ix = 0; ix < days; ix++)
    {
        const meanTemp = columns.temperature_2m_mean[ix];
        const windSpeed = columns.wind_speed_10m_max[ix];
        const windGusts = columns.wind_gusts_10m_max[ix];
        const weatherCode = columns.weather_code[ix];
        const precipitation = columns.precipitation_sum[ix];

        // Wind drives both swell generation and surface texture, so it carries
        // the most weight; the weather system and comfort fill in the rest.
        const score = weightedScore([
            {
                "score": piecewiseScore(windSpeed, [
                    { "upTo": 8, "score": 60 },          // glassy but often flat
                    { "upTo": 20, "score": 85 },         // workable, some texture
                    { "upTo": 30, "score": 55 },
                    { "upTo": 45, "score": 30 },
                    { "upTo": Infinity, "score": 0 }     // blown out
                ]),
                "weight": 0.40
            },
            {
                "score": piecewiseScore(windGusts, [
                    { "upTo": 25, "score": 100 },
                    { "upTo": 40, "score": 70 },
                    { "upTo": 55, "score": 40 },
                    { "upTo": Infinity, "score": 10 }    // choppy
                ]),
                "weight": 0.20
            },
            {
                "score": surfWeatherScore(weatherCode),
                "weight": 0.20
            },
            {
                "score": piecewiseScore(precipitation, [
                    { "upTo": 0, "score": 60 },
                    { "upTo": 5, "score": 70 },          // system energy
                    { "upTo": 15, "score": 60 },
                    { "upTo": Infinity, "score": 35 }    // heavy mess
                ]),
                "weight": 0.10
            },
            {
                "score": piecewiseScore(meanTemp, [
                    { "upTo": 5, "score": 40 },          // cold, wetsuit required
                    { "upTo": 10, "score": 60 },
                    { "upTo": 18, "score": 80 },
                    { "upTo": Infinity, "score": 100 }   // mild
                ]),
                "weight": 0.10
            }
        ]);

        result.days.push({
            "day": ix + 1,
            "date": new Date((start + ix * step) * 1000).toISOString().slice(0, 10), // YYYY-MM-DD
            "rank": scoreToRank(score),
            "score": roundScore(score),
            "metrics": {
                "wind_speed_10m_max": windSpeed,
                "wind_gusts_10m_max": windGusts,
                "precipitation_sum": precipitation,
                "temperature_2m_mean": meanTemp,
                "weather_code": weatherCode
            }
        })
    }

    return result;
}

export async function next7DaysOutdoor(city)
{
    return buildSightseeingDays(city, outdoorScore);
}

export async function next7DaysIndoor(city)
{
    return buildSightseeingDays(city, indoorScore);
}


/**
 * Weather-only surf proxy score (0..100).
 *
 * The weather forecast endpoint has no wave data, so we approximate surfability
 * from the weather system itself: passing systems bring swell (good) but also
 * mess and danger (bad). This is a proxy for "surface conditions + likely swell
 * energy", NOT a real wave height/period reading. To make it exact, replace this
 * single function (and the dailyParams list) with a Marine API call.
 *
 * @param {number} code WMO weather code.
 * @returns {number}
 */
function surfWeatherScore(code)
{
    if(isThunderstorm(code))
    {
        // Dangerous, messy and often blown out.
        return 20;
    }

    if(isFog(code))
    {
        // Morning glass-off conditions are common at surf spots.
        return 80;
    }

    if(isRainShowers(code))
    {
        // Active system: energy, but with texture.
        return 75;
    }

    if(isRain(code))
    {
        return 60;
    }

    if(isDrizzle(code))
    {
        return 55;
    }

    if(isSnow(code))
    {
        return 30;
    }

    if(isClear(code))
    {
        // Clean, but often flat without an incoming swell.
        return 65;
    }

    // Partly cloudy / overcast.
    return 70;
}


async function buildSightseeingDays(city, scoreDay)
{
    const forecast = await getForecast(city, SIGHTSEEING_DAILY_PARAMS);

    const result = { "days": [] };

    if(!forecast || !forecast.dailyVariables)
    {
        return result;
    }

    const columns = {};

    SIGHTSEEING_DAILY_PARAMS.forEach((name, position) => {
        columns[name] = forecast.dailyVariables(position).valuesArray();
    });

    const days = columns.temperature_2m_mean.length;
    const start = forecast.dailyStart;
    const step = forecast.dailyStep;

    for(let ix = 0; ix < days; ix++)
    {
        // Normalized day object handed to the activity-specific scorer.
        const day = {
            "temperature_2m_mean": columns.temperature_2m_mean[ix],
            "precipitation_sum": columns.precipitation_sum[ix],
            "precipitation_probability_max": columns.precipitation_probability_max[ix],
            "wind_speed_10m_max": columns.wind_speed_10m_max[ix],
            "weather_code": columns.weather_code[ix],
            "sunshine_duration": columns.sunshine_duration[ix],
            "daylight_duration": columns.daylight_duration[ix]
        };

        const scored = scoreDay(day);

        result.days.push({
            "day": ix + 1,
            "date": new Date((start + ix * step) * 1000).toISOString().slice(0, 10), // YYYY-MM-DD
            "rank": scoreToRank(scored.score),
            "score": roundScore(scored.score),
            "metrics": scored.metrics
        })
    }

    return result;
}

function outdoorScore(day)
{
    const comfortPoints = [
        { "upTo": 5,  "score": 10 }, { "upTo": 12, "score": 40 }, { "upTo": 18, "score": 70 },
        { "upTo": 26, "score": 100 }, { "upTo": 30, "score": 70 }, { "upTo": 35, "score": 40 },
        { "upTo": Infinity, "score": 10 }          // band: 18..26 C is ideal
    ];
    const precipPoints = [
        { "upTo": 0, "score": 100 }, { "upTo": 1, "score": 80 }, { "upTo": 4, "score": 50 },
        { "upTo": Infinity, "score": 10 }
    ];
    const probabilityPoints = [
        { "upTo": 20, "score": 100 }, { "upTo": 40, "score": 80 }, { "upTo": 60, "score": 55 },
        { "upTo": Infinity, "score": 30 }
    ];
    const windPoints = [
        { "upTo": 15, "score": 100 }, { "upTo": 25, "score": 70 }, { "upTo": 40, "score": 40 },
        { "upTo": Infinity, "score": 10 }
    ];
    const sunPoints = [
        { "upTo": 0.2, "score": 40 }, { "upTo": 0.5, "score": 70 }, { "upTo": 0.8, "score": 90 },
        { "upTo": Infinity, "score": 100 }
    ];

    const sunRatio = Number.isFinite(day.daylight_duration) && day.daylight_duration > 0
        ? day.sunshine_duration / day.daylight_duration
        : null;

    const score = weightedScore([
        { "score": piecewiseScore(day.temperature_2m_mean, comfortPoints), "weight": 0.30 },
        { "score": piecewiseScore(day.precipitation_sum, precipPoints), "weight": 0.25 },
        { "score": piecewiseScore(day.precipitation_probability_max, probabilityPoints), "weight": 0.15 },
        { "score": piecewiseScore(day.wind_speed_10m_max, windPoints), "weight": 0.15 },
        { "score": outdoorWeatherScore(day.weather_code), "weight": 0.10 },
        { "score": piecewiseScore(sunRatio, sunPoints), "weight": 0.05 }
    ]);

    return {
        "score": score,
        "metrics": {
            "temperature_2m_mean": day.temperature_2m_mean,
            "precipitation_sum": day.precipitation_sum,
            "wind_speed_10m_max": day.wind_speed_10m_max,
            "weather_code": day.weather_code
        }
    };
}

function indoorScore(day)
{
    const precipPoints = [
        { "upTo": 0, "score": 20 }, { "upTo": 1, "score": 40 }, { "upTo": 5, "score": 70 },
        { "upTo": Infinity, "score": 100 }         // more rain => better indoors
    ];
    const windPoints = [
        { "upTo": 15, "score": 30 }, { "upTo": 25, "score": 60 }, { "upTo": 40, "score": 80 },
        { "upTo": Infinity, "score": 100 }
    ];
    const extremityPoints = [
        { "upTo": 3, "score": 20 }, { "upTo": 8, "score": 50 }, { "upTo": 15, "score": 80 },
        { "upTo": Infinity, "score": 100 }         // far from 21 C => stay inside
    ];

    const extremity = Number.isFinite(day.temperature_2m_mean)
        ? Math.abs(day.temperature_2m_mean - 21)
        : null;

    const score = weightedScore([
        { "score": piecewiseScore(day.precipitation_sum, precipPoints), "weight": 0.35 },
        { "score": indoorWeatherScore(day.weather_code), "weight": 0.25 },
        { "score": piecewiseScore(extremity, extremityPoints), "weight": 0.20 },
        { "score": piecewiseScore(day.wind_speed_10m_max, windPoints), "weight": 0.20 }
    ]);

    return {
        "score": score,
        "metrics": {
            "temperature_2m_mean": day.temperature_2m_mean,
            "precipitation_sum": day.precipitation_sum,
            "wind_speed_10m_max": day.wind_speed_10m_max,
            "weather_code": day.weather_code
        }
    };
}



/**
 * Ski condition score (0..100) for a WMO weather code.
 *
 * Scores only sky/visibility and precipitation type (hazard). Snow amount and
 * temperature are handled by the snowfall_sum and temperature_2m_max factors.
 * Returns null for an unknown code so the factor is ignored by weightedScore.
 *
 * @param {number} code WMO weather code.
 * @returns {number|null}
 */
function skiWeatherScore(code)
{
    // WMO weather code -> ski condition score (visibility + precip type/hazard).
    // Snow accumulation and cold are scored separately (snowfall_sum / temperature).
    const SKI_WEATHER_SCORES = {
        0: 100, 1: 95, 2: 85, 3: 65,
        45: 15, 48: 10,
        51: 35, 53: 25, 55: 15, 56: 10, 57: 5,
        61: 25, 63: 15, 65: 5, 66: 5, 67: 0,
        71: 85, 73: 90, 75: 75, 77: 80,
        80: 30, 81: 20, 82: 5,
        85: 88, 86: 78,
        95: 5, 96: 0, 97: 0, 99: 0
    };

    return SKI_WEATHER_SCORES[code] ?? null;
}

function outdoorWeatherScore(code)
{
    const OUTDOOR_WEATHER_SCORES = {
        0: 100, 1: 95, 2: 85, 3: 60,
        45: 30, 48: 25,
        51: 40, 53: 30, 55: 20, 56: 10, 57: 10,
        61: 35, 63: 20, 65: 5, 66: 0, 67: 0,
        71: 55, 73: 40, 75: 20, 77: 50,
        80: 40, 81: 25, 82: 5,
        85: 50, 86: 25,
        95: 5, 96: 0, 97: 0, 99: 0
    };

    return OUTDOOR_WEATHER_SCORES[code] ?? null;
}

function indoorWeatherScore(code)
{
    const INDOOR_WEATHER_SCORES = {
        0: 10, 1: 15, 2: 25, 3: 45,
        45: 70, 48: 75,
        51: 65, 53: 70, 55: 75, 56: 85, 57: 85,
        61: 75, 63: 85, 65: 95, 66: 95, 67: 95,
        71: 70, 73: 80, 75: 90, 77: 65,
        80: 70, 81: 80, 82: 95,
        85: 75, 86: 85,
        95: 100, 96: 100, 97: 100, 99: 100
    };

    return INDOOR_WEATHER_SCORES[code] ?? null;
}