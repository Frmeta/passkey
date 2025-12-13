import express, { Express } from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import * as dotenv from 'dotenv';

import { router as passkeyRoutes } from "./routes/routes";
import session from "express-session";

dotenv.config();
 
const app: Express = express();
 
declare module "express-session" {
    interface SessionData {
        currentChallenge?: string;
        loggedInUserId?: string;
    }
}
 
/************************************************************************************
 *                              Basic Express Middlewares
 ***********************************************************************************/
app.set("json spaces", 4);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
 
app.use(
    session({
        secret: process.env.SESSION_SECRET as string,
        saveUninitialized: true,
        resave: false,
        cookie: {
            maxAge: 86400000,
            httpOnly: true, // Ensure to not expose session cookies to clientside scripts
        },
    }),
);
 
// Handle logs in console during development
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
    app.use(cors());
}
 
// Handle security and origin in production
if (process.env.NODE_ENV === "production") {
    app.use(helmet());
}
 
/************************************************************************************
 *                               Register all routes
 ***********************************************************************************/
app.use("/api/passkey", passkeyRoutes);
 
app.use(express.static("src/public"));
 
export default app;