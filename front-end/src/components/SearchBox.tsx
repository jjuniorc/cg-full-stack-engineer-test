import { SearchIcon } from "lucide-react";

interface SearchBoxProps
{
    searchValue: string;
    setSearchValue(value: string): void;
    onSearchButtonClick(): void;
}

function SearchBox({searchValue, setSearchValue, onSearchButtonClick}: SearchBoxProps)
{
    function OnCityOrTownChange(value: string)
    {
        setSearchValue(value);
    }

    return (
        <div className="flex gap-2">
            <input
                className="border border-slate-300 outline-slate-400 bg-white px-4 py-2 rounded-md"
                placeholder="Type a city or town"
                aria-label="City or town"
                value={searchValue}
                onChange={(event) => { OnCityOrTownChange(event.target.value) }}
             />
             <button className="bg-slate-400 text-white p-2 rounded-md"
                onClick={() => {onSearchButtonClick()}}
             >
                <SearchIcon />
            </button>
        </div>
    )
}

export default SearchBox