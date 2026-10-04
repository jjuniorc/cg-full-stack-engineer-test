import type { ActivityResponse } from "../interfaces/ActivityRankData";

interface ActivityListProps
{
    searchResponse: ActivityResponse
}

function ActivityList({ searchResponse } : ActivityListProps)
{
    function loadList(): React.ReactNode
    {
        const listItems: React.ReactNode[] = [];

        const skiing = searchResponse.data.activityRank.skiing;
        const surfing = searchResponse.data.activityRank.surfing;
        const indoor = searchResponse.data.activityRank.indoor;
        const outdoor = searchResponse.data.activityRank.indoor;

        for(let ix = 0; ix < skiing.days.length; ix++)
        {
            const skiingDay = skiing.days[ix];
            const surfingDay = surfing.days[ix];
            const outdoorDay = outdoor.days[ix];
            const indoorDay = indoor.days[ix];

            listItems.push(<li key={skiingDay.date} className="bg-slate-400 p-2 rounded-md">
                <h3 className="text-xl text-white font-bold">{skiingDay.date}</h3>

                <div className="flex gap-2">
                    <div className="text-white font-bold">Skiing</div>
                    <div className="text-white">{skiingDay.rank}</div>
                    <div className="text-white">Score: {skiingDay.score}/100</div>
                </div>

                <div className="flex gap-2">
                    <div className="text-white font-bold">Surfing</div>
                    <div className="text-white">{surfingDay.rank}</div>
                    <div className="text-white">Score: {surfingDay.score}/100</div>
                </div>

                <div className="flex gap-2">
                    <div className="text-white font-bold">Outdoor sightseeing</div>
                    <div className="text-white">{outdoorDay.rank}</div>
                    <div className="text-white">Score: {outdoorDay.score}/100</div>
                </div>

                <div className="flex gap-2">
                    <div className="text-white font-bold">Indoor sightseeing</div>
                    <div className="text-white">{indoorDay.rank}</div>
                    <div className="text-white">Score: {indoorDay.score}/100</div>
                </div>
            </li>)
        }

        return listItems;
    }

    return (
        <div>
            <ul className="space-y-4 p-6 bg-slate-200 rounded-md shadow">
                {loadList()}
            </ul>
        </div>
    )
}

export default ActivityList;