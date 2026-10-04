import { next7DaysSki, next7DaysSurf, next7DaysOutdoor, next7DaysIndoor } from "../local_modules/activities.js"

export default {
    version(){
        return {
            version: 1,
            subversion: 0,
            rc: 0
        }
    },
    activityRank({ city })
    {
        return {
            skiing: next7DaysSki(city),
            surfing: next7DaysSurf(city),
            outdoor: next7DaysOutdoor(city),
            indoor: next7DaysIndoor(city)
        }
    }
}