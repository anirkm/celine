import { Client } from "discord.js";
import Redis from "ioredis";
import { color } from "../functions";

module.exports = (client: Client) => {
  const REDIS_HOST = process.env.REDIS_HOST;
  const REDIS_PW = process.env.REDIS_PW;

  const redis = new Redis({
    port: 6379, // Redis port
    host: REDIS_HOST, // Redis host
    password: REDIS_PW,
  });

  redis.on("connect", async () => {
    console.log(
      color(
        "text",
        `🔴 MongoDB connection has been ${color("variable", "established.")}`
      )
    );
    client.redis = redis;

    while ((await client.redis.ping().catch(() => {})) === "PONG") {
      await require("../utils/Itreation")(client, redis);
      await new Promise((f) => setTimeout(f, 1000));
    }
  });
};
