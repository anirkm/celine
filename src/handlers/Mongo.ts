import mongoose from "mongoose";
import { color } from "../functions";
import { Client } from "discord.js";

module.exports = (client: Client) => {
  const MONGO_URI =
    "mongodb+srv://yatsuki:Anirhunter1@cluster0.quhde.mongodb.net/modtest?retryWrites=true";
  if (!MONGO_URI)
    return console.log(
      color("text", `🍃 Mongo URI not found, ${color("error", "skipping.")}`)
    );
  mongoose
    .connect(
      `mongodb+srv://yatsuki:Anirhunter1@cluster0.quhde.mongodb.net/modtest?retryWrites=true`
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
