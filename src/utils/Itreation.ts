import { Client, GuildMember } from "discord.js";
import { Redis } from "ioredis";
import emoji from "../data/emojies.json";
import GuildModel from "../schemas/Guild";
import { RtextEmbed } from "./msgUtils";

module.exports = async (client: Client, redis: Redis) => {
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "*_*");
    cursor = nextCursor;
    for await (const key of keys) {
      let prefix = key.split("_")[0] || "none";
      if (["jr", "lastmsg", "msgcount"].includes(prefix)) continue;
      let guildID = key.split("_")[1];
      let userID = key.split("_")[2];
      let expireTime = (await redis.get(key)) || 0;

      let guild = await client.guilds.fetch(guildID).catch(() => {});
      let dbGuild = await GuildModel.findOne({ guildID: guild!.id }).catch(
        (e) => {
          console.log("dbguild irreation", e);
        }
      );

      if (!guild || !dbGuild) {
        console.log(prefix, "failed to fetch guild/dbguild");
        continue;
      }

      switch (prefix) {
        case "banqueue":
          if (Number(expireTime) < new Date().getTime()) {
            let user = await client.users.fetch(userID).catch(() => {});
            if (!user) {
              redis.del(key).catch(() => {});
              continue;
            }
            guild.members.unban(user, "Ban expired.").then(() => {
              console.log("ban expired");
              redis.del(key).catch(() => {});
            });
          }
          break;
        case "mutequeue":
          if (Number(expireTime) < new Date().getTime()) {
            let user = await guild!.members.fetch(userID).catch(() => {});
            if (!user) {
              redis.del(key).catch(() => {});
              continue;
            }
            let dbMuteRole = dbGuild.options.muteRole || "none";
            let muteRole = await guild.roles.fetch(dbMuteRole).catch(() => {});
            if (!muteRole) {
              continue;
            }
            (user as GuildMember).roles
              .remove(muteRole, "Mute Expired")
              .then(async (user) => {
                user.send({
                  embeds: [
                    await RtextEmbed(
                      `${emoji.confetti} | Your text-mute has expired in ${user.guild.name}`
                    ),
                  ],
                });
                console.log("mute expired");
                redis.del(key).catch((e) => {
                  console.log("muteexpire error", e);
                });
              })
              .catch((e) => {
                console.log("muteexpire error", e);
              });
          }
          break;
        case "vmutequeue":
          if (Number(expireTime) < new Date().getTime()) {
            let user = await guild!.members.fetch(userID).catch(() => {});
            if (!user) {
              redis.del(key).catch(() => {});
              continue;
            }
            if ((user as GuildMember).voice.channel) {
              (user as GuildMember).voice.setMute(false, "Mute expired");
            }
            client.redis
              .del(key)
              .then(async () => {
                user!.send({ embeds: [await RtextEmbed(`${emoji.confetti} | Your voice-mute has expired in ${user!.guild.name}`)] });
              })
              .catch(() => {});
            client.redis
              .set(`vmex_${guildID}_${userID}`, 0, "EX", 172800)
              .catch(console.log);
          }
        case "jailqueue":
          if (Number(expireTime) < new Date().getTime()) {
            let user = await guild!.members.fetch(userID).catch(() => {});
            if (!user) {
              redis.del(key).catch(() => {});
              continue;
            }
            let dbJailRole = dbGuild.options.jailRole || "none";
            let jailRole = await guild.roles.fetch(dbJailRole).catch(() => {});
            if (!jailRole) {
              continue;
            }
            (user as GuildMember).roles
              .remove(jailRole, "Jail Expired")
              .then(async (user) => {
                user!.send({ embeds: [await RtextEmbed(`${emoji.confetti} | Your jail sanction has expired in ${user!.guild.name}`)] });
                console.log("jail expired");
                redis.del(key).catch((e) => {
                  console.log("redjail", e);
                });
                let resotredRoles = await client.redis
                  .lrange(`jr_${guild?.id}_${user.id}`, 0, -1)
                  .catch(() => {});

                if (resotredRoles && resotredRoles.length > 0) {
                  resotredRoles.forEach(async (role) => {
                    await user.roles
                      .add(role, "Jail restore roles")
                      .then(() => {
                        client.redis
                          .del(`jr_${guild?.id}_${user.id}`)
                          .catch((e) => {
                            console.log("redjail", e);
                          });
                      })
                      .catch(() => {});
                  });
                }
              })
              .catch((e) => {
                console.log("jailerr", e);
              });
          }
          break;
        case "tr":
          if (Number(expireTime) < new Date().getTime()) {
            let user = await guild!.members.fetch(userID).catch(() => {});
            if (!user) {
              redis.del(key).catch((e) => {
                console.log("tr", e);
              });
              continue;
            }
            let roleEnQuestion = await guild.roles
              .fetch(key.split("_")[3])
              .catch(() => {});
            if (!roleEnQuestion) {
              redis.del(key).catch(() => {});
              continue;
            }
            await (user as GuildMember).roles
              .remove(roleEnQuestion, "Role Expired")
              .then(() => {
                console.log("role expired");
                redis.del(key).catch(() => {});
              })
              .catch((e) => {
                console.log("jailerr", e);
              });
          }
          break;
        default:
          break;
      }
    }
  } while (cursor !== "0");
};
