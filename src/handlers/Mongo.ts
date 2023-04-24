import { Client } from "discord.js";
import mongoose from "mongoose";
import { color } from "../functions";

module.exports = (client: Client) => {
  const MONGO_URI =
    "mongodb+srv://yatsuki:dnIdadhdytI8HTUN8injxETQ3XeIfC5S4Ob5vdyLQKb/Yvi00vyxivB53hPkvzcRMsf64T0rtMoGrfWq@137.184.44.90/?retryWrites=true";
  if (!MONGO_URI)
    return console.log(
      color("text", `🍃 Mongo URI not found, ${color("error", "skipping.")}`)
    );
  mongoose
    .connect(
      "mongodb://127.0.0.1:27017/celineprod?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.8.0"
    )
    .then((mongodb) => {
      client.mongo = mongodb;
      console.log(
        color(
          "text",
          `🍃 MongoDB connection has been ${color("variable", "established.")}`
        )
      );
    })
    .catch((err) =>
      console.log(
        color(
          "text",
          `🍃 MongoDB connection has been ${color("error", "failed.")}`
        ),
        err
      )
    );
};
