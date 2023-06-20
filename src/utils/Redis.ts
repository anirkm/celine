import { Client } from "discord.js";
import Redis from "ioredis";
import { color } from "../functions";
import cachePermissions from "./cachePermissions";

module.exports = async (client: Client) => {
  const REDIS_HOST = process.env.REDIS_HOST;
  const REDIS_PW = process.env.REDIS_PW;

  const redis = new Redis({
    port: 6379, // Redis port
    host: REDIS_HOST, // Redis host
    password: REDIS_PW,
    maxRetriesPerRequest: null,
    db: 10,
  });

  const cacheRedis = new Redis({
    port: 6379, // Redis port
    host: REDIS_HOST, // Redis host
    password: REDIS_PW,
    maxRetriesPerRequest: null,
    db: 9,
  });

  const persistanceRedis = new Redis({
    port: 6379, // Redis port
    host: REDIS_HOST, // Redis host
    password: REDIS_PW,
    maxRetriesPerRequest: null,
    db: 7,
  });

  const randomRedis = new Redis({
    port: 6379, // Redis port
    host: REDIS_HOST, // Redis host
    password: REDIS_PW,
    maxRetriesPerRequest: null,
    db: 12,
  });

  cacheRedis.on("connect", async () => {
    console.log(
      color(
        "text",
        `🔴 Redis cache connection has been ${color(
          "variable",
          "established."
        )}`
      )
    );
    client.redisCache = cacheRedis;

    cachePermissions(client, cacheRedis);
  });

  persistanceRedis.on("connect", async () => {
    console.log(
      color(
        "text",
        `🔴 Redis persisitance connection has been ${color(
          "variable",
          "established."
        )}`
      )
    );
    client.persistanceRedis = persistanceRedis;
  });


  randomRedis.on("connect", async () => {
    console.log(
      color(
        "text",
        `🔴 Redis random connection has been ${color(
          "variable",
          "established."
        )}`
      )
    );
    client.randomRedis = randomRedis;
  });

  redis.on("connect", async () => {
    redis.setMaxListeners(1337);
    console.log(
      color(
        "text",
        `🔴 Redis connection has been ${color("variable", "established.")}`
      )
    );
    client.redis = redis;

    while ((await redis.ping().catch(() => {})) === "PONG") {
      await require("../utils/Itreation")(client, redis);
      await new Promise((f) => setTimeout(f, 1000));
    }
  });
};
