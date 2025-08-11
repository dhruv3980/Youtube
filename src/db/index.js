import { dbname } from "../constants.js";
import mongoose from "mongoose";

export const dbconnect = async()=>{
    try{
        const connectionInstance =await mongoose.connect(`${process.env.Mongodb_Url}/${dbname}`)

        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`)

    }catch(err){
        console.error("Db-error", err);
        process.exit(1);

    }

}