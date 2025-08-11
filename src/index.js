import dotenv from "dotenv";
import { dbconnect } from "./db/index.js";

dotenv.config({
    path:'./env'
})

dbconnect();