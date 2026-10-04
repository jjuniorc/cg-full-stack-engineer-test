// 1. Possible values for the rank
export type RankStatus = 'BAD' | 'REGULAR' | 'GOOD';

// 2. Interface for each day of the object
export interface DayData {
    day: number;
    date: string; // YYYY-MM-DD date format
    rank: RankStatus;
    score: number;
}

// 3. Interface for the list of days inside each activity
export interface ActivityDetails {
    days: DayData[];
}

// 4. Interface to group all activities
export interface ActivityRank {
    skiing: ActivityDetails;
    surfing: ActivityDetails;
    outdoor: ActivityDetails;
    indoor: ActivityDetails;
}

// 5. Main interface to wrap the JSON response
export interface ActivityResponse {
    data: {
        activityRank: ActivityRank;
    };
}