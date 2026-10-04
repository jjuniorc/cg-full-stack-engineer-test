import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import schema from '../graphql/schema.js'
import resolvers from '../graphql/resolvers.js'

const router = express.Router();

/**
 * GraphQL Response
*/
router.use('/', graphqlHTTP({
    schema,
    rootValue: resolvers,
    graphiql: true
}))

export default router;