import type { ActivityResponse } from '../interfaces/ActivityRankData'

const ACTIVITY_RANK_QUERY = `
    query ActivityRank($city: String!) {
        activityRank(city: $city) {
            skiing  { days { day date rank score } }
            surfing { days { day date rank score } }
            outdoor { days { day date rank score } }
            indoor  { days { day date rank score } }
        }
    }
`

export async function fetchActivityRank(city: string): Promise<ActivityResponse> {
    const response = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ACTIVITY_RANK_QUERY, variables: { city } }),
    })

    if (!response.ok) 
    {
        throw new Error(`Request failed with status ${response.status}`)
    }

    const result: ActivityResponse & { errors?: { message: string }[] } = await response.json()

    // GraphQL can reply 200 code with { errors: [...] } (eg.: city not found)
    if (result.errors?.length) 
    {
        throw new Error(result.errors.map((e) => e.message).join(', '))
    }

    return result
}
