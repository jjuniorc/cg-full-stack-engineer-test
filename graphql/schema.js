import { buildSchema } from "graphql"
export default buildSchema(`
    type VersionData {
        version: Int!,
        subversion: Int!,
        rc: Int!
    }

    type RankDay {
        day: Int!,
        date: String!,
        rank: String!,
        score: Float!
    }

    type RankData {
        days: [RankDay!]!
    }
    
    type ActivityRankData {
        skiing: RankData!,
        surfing: RankData!,
        outdoor: RankData!,
        indoor: RankData!
    }

    type RootQuery {
        version: VersionData!
        activityRank(city: String!): ActivityRankData!
    }

    schema {
        query: RootQuery
    }

`)