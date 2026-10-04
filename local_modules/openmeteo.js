import { fetchWeatherApi } from "openmeteo";

async function geocode(city)
{
    const url = new URL(process.env.OPENMETEO_GEOCODING_URL);
    url.searchParams.set("name", city);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const response = await fetch(url);

    if(!response.ok)
    {
        console.error(`Geocode failed: ${response.status}`);
        return null;
    }

    const data = await response.json();

    if(!data.results)
    {
        console.warn(`No location found for the city ${city}`);
        return null;
    }

    if(data.results.length == 0)
    {
        console.warn(`No location found for the city ${city}`);
        return null;
    }

    const result = data.results[0];

    return result;
}

export async function getForecast(city, dailyParams)
{
    if(!city)
    {
        console.warn(`A location name is required for forecast function`)
        return null;
    }

    const location = await geocode(city);

    if(!location)
    {
        return null
    }

    const params = {
	    latitude: location.latitude,
	    longitude: location.longitude,
        timezone: location.timezone,
	    // daily: ["temperature_2m_max", "temperature_2m_mean", "temperature_2m_min"],
        daily: dailyParams
    };

    const url = process.env.OPENMETEO_URL;
    const responses = await fetchWeatherApi(url, params);
    
    const response = responses[0];
    
    const daily = response.daily();
    
    // const temperature_2m_max = daily.variables(0).valuesArray();
    // const temperature_2m_mean = daily.variables(1).valuesArray();
    // const temperature_2m_min = daily.variables(2).valuesArray();

    // const days = temperature_2m_max.length;
    // const start = Number(daily.time());
    // const step = daily.interval();

    // // const dailyInfo = [];
    
    // // for(let ix = 0; ix < days; ix++)
    // // {
    // //     dailyInfo.push({
    // //         "time": new Date((start + ix * step) * 1000).toISOString().slice(0, 10), // YYYY-MM-DD
    // //         "temperature_2m_max": temperature_2m_max[ix],
    // //         "temperature_2m_mean": temperature_2m_mean[ix],
    // //         "temperature_2m_min": temperature_2m_min[ix]
    // //     })
    // // }

    const result = {
        "name": location.name,
        "latitude": response.latitude(),
        "longitude": response.longitude(),
        "elevation": response.elevation(),
        "utcOffsetSeconds": response.utcOffsetSeconds(),
        // "dailyInfo": dailyInfo,
        "dailyVariables": daily.variables.bind(daily),
        "dailyStart": Number(daily.time()),
        "dailyStep": daily.interval(),
    }
    
    return result;
}