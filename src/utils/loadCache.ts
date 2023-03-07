import { Queue, Worker } from "bullmq";
import { type Client, type OAuth2Guild } from "discord.js";

import GuildModel from "../schemas/Guild";

module.exports = async (client: Client) => {
  console.log("launching cache handler");

  const userPermissionsQueue = new Queue("UserPermissionsQueue", {
    connection: client.redis,
  });
  const rolePermissionsQueue = new Queue("RolePermissionsQueue", {
    connection: client.redis,
  });
  const persistQueue = new Queue("PersistQueue", {
    connection: client.redis,
  });

  client.queues = {
    ...client.queues,
    userPermissionsQueue: userPermissionsQueue,
    rolePermissionsQueue: rolePermissionsQueue,
    persistQueue: persistQueue,
  };

  client.guilds.fetch().then((guilds) => {
    guilds.forEach(async (guild: OAuth2Guild) => {
      const dbGuild = await GuildModel.findOne({ guildID: guild.id }).catch();
      if (!dbGuild) return;

      if (
        dbGuild.userPermissions &&
        Object.keys(dbGuild.userPermissions).length > 0
      ) {
        userPermissionsQueue.add(dbGuild.guildID, {
          userPermissions: dbGuild.userPermissions,
        });
      }
      if (
        dbGuild.rolePermissions &&
        Object.keys(dbGuild.rolePermissions).length > 0
      ) {
        console.log("adding");
        rolePermissionsQueue.add(
          dbGuild.guildID,
          {
            roles: dbGuild.rolePermissions,
          },
          { jobId: dbGuild.guildID }
        );
      }
      if (dbGuild.rolePersist && dbGuild.rolePersist.length > 0) {
        persistQueue.add(dbGuild.guildID, { roles: dbGuild.rolePersist });
      }
    });
  });

  new Worker(
    "UserPermissionsQueue",
    async (job) => {
      console.log("UserPermissionsQueue");
    },
    { connection: client.redis }
  );

  const RolePermissionsWorker = new Worker(
    "RolePermissionsQueue",
    async (job) => {
      console.log("starting");
      let i = 1;
      console.log(i);
    },
    { connection: client.redis }
  );

  new Worker(
    "PersistQueue",
    async (job) => {
      console.log("PersistQueue");
    },
    { connection: client.redis }
  );
};
