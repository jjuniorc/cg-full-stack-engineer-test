import path from "node:path"
import fs from "node:fs"

const envPath = path.resolve(process.cwd(), '.env');

if (!fs.existsSync(envPath)) 
{
    console.error('Unable to find .env file. Copy from env.example a new .env file at the project root.');
    process.exit(1);
}

import 'dotenv/config'; 
import express from 'express';

const app = express();
const PORT = process.env.PORT;

app.use(express.json());

import routerGraphQL from "./routes/graphql.js"

app.use('/graphql', routerGraphQL);

// Serve the built React front-end (./front-end/dist) on the same origin as the API
app.use(express.static(path.resolve(process.cwd(), 'front-end/dist')));

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});