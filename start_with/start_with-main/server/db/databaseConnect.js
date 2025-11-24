import mongoose from "mongoose"
import dotenv, { config } from "dotenv"
import {fileURLToPath} from "url"
import path from "path"

// import config from "./config.env"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({
    path: path.join(__dirname,'../config/config.env')
})
const dbname = "start_with_v1"
const dbconnect = async () => {
    try {
        // console.log(`${process.env.MONGO_DB_URI}/${dbname}`)
        // const connectdb = await mongoose.connect(`${process.env.MONGO_DB_URI}/${dbname}`)
        const connectdb = await mongoose.connect(`${process.env.MONGO_DB_URI}`)
        // console.log(`${process.env.MONGO_DB_URI}/${dbname}`)
        console.log(`${process.env.MONGO_DB_URI}`)
        console.log(`MongoDB connected succesfully:-  ${connectdb.connection.host}`);
    } catch (error) {
        console.log(`Error is:::-> `, error);
        process.exit(1)
    }
}

export default dbconnect
