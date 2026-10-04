import { useState } from 'react'
import './App.css'
import SearchBox from './components/SearchBox'
import ActivityList from './components/ActivityList';
import type { ActivityResponse } from './interfaces/ActivityRankData';
import { fetchActivityRank } from './services/activityRank';

function App() {

    const [searchValue, setSearchValue] = useState("");
    const [searchResponse, setSearchResponse] = useState<ActivityResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null)
    
    async function onSearchButtonClick()
    {
        const city = searchValue.trim();

        if(!city || isLoading)
        {
            return;
        }

        setIsLoading(true);
        setError(null);

        try
        {
            const response: ActivityResponse = await fetchActivityRank(city);
            setSearchResponse(response);
        }
        catch(err)
        {
            setError(err instanceof Error ? err.message : "Unexpected error");
            setSearchResponse(null);
        }
        finally
        {
            setIsLoading(false);
        }
    }

    return (
        <div className="w-screen min-h-screen bg-slate-500 p-6">
            <h1 className="text-3xl text-slate-100 font-bold text-center">Next 7-days Activities</h1>
            <h2 className="text-xl text-slate-200 font-bold text-center">Weather for activities over the next 7 days</h2>
            <div className='flex justify-center'>
                <SearchBox searchValue={searchValue} setSearchValue={setSearchValue} onSearchButtonClick={onSearchButtonClick}  />
            </div>
            <div className='flex justify-center mt-5'>
                {isLoading && <p className='text-slate-100'>Loading...</p>}
                {error && !isLoading && <p className='text-red-200'>{error}</p>}
                {searchResponse && !isLoading && <ActivityList searchResponse={searchResponse} />}
            </div>
        </div>
    )
}

export default App
