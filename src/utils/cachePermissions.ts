import { Job, Queue, Worker } from "bullmq";
import { Client } from "discord.js";
import { Redis } from "ioredis";
import GuildModel from "../schemas/Guild";

const cachePermissions = async (client: Client, redis: Redis) => {
  console.log("caching");

  const bullMqRedis = new Redis({
    port: 6379, // Redis port
    host: process.env.REDIS_HOST, // Redis host
    password: process.env.REDIS_PW,
    maxRetriesPerRequest: null,
    db: 8,
  });

  const userPermissionsQueue = new Queue("userPermissionsQueue", {
    connection: bullMqRedis,
  });
  const rolePermissionsQueue = new Queue("rolePermissionsQueue", {
    connection: bullMqRedis,
  });
  const allRolesQueue = new Queue("allRolesQueue", {
    connection: bullMqRedis,
  });

  const guilds = await GuildModel.find({});

  for (const guild of guilds) {
    await allRolesQueue.add(
      `all:${guild.guildID}`,
      {
        guildId: guild.guildID,
        roles: guild.rolePermissions.map((role) => role.roleId),
      },
      {
        removeOnComplete: true,
        removeOnFail: true,
      },
    );

    for (const user of guild.userPermissions) {
      console.log(user.userId, user.permissions.length);
      userPermissionsQueue.add(
        `r:${guild.guildID}-${user.userId}`,
        {
          guildId: guild.guildID,
          userId: user.userId,
          permissions: user.permissions,
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    }
  }

  const allRolesWorker = new Worker(
    "allRolesQueue",
    async (job: Job) => {
      redis.set(
        `permroles:${job.data.guildId}`,
        JSON.stringify(job.data.roles),
      );
    },
    {
      connection: bullMqRedis,
    },
  );

  const userPermissionsWorker = new Worker(
    "userPermissionsQueue",
    async (job: Job) => {
      if (job.data.permissions.length === 0) {
        return redis.del(
          `permissions:member:${job.data.userId}:${job.data.guildId}`,
        );
      }
      redis
        .set(
          `permissions:member:${job.data.userId}:${job.data.guildId}`,
          JSON.stringify(job.data.permissions),
        )
        .then(() => {
          return "success";
        })
        .catch((err) => {
          throw err;
        });
    },
    {
      connection: bullMqRedis,
    },
  );

  const rolePermissionsWorker = new Worker(
    "rolePermissionsQueue",
    async (job: Job) => {
      redis
        .set(
          `permissions:role:${job.data.roleId}:${job.data.guildId}`,
          JSON.stringify(job.data.permissions),
        )
        .then(() => {
          return "success";
        })
        .catch((err) => {
          throw err;
        });
    },
    {
      connection: bullMqRedis,
    },
  );

  rolePermissionsWorker.on("error", (e) => {
    console.log("error rolePermissionsWorker", e);
  });
  userPermissionsWorker.on("active", (e) => {});
};

export default cachePermissions;
