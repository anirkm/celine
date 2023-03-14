import {
  ActionRowBuilder,
  Client,
  EmbedBuilder,
  Interaction,
  StringSelectMenuBuilder,
} from "discord.js";
import emoji from "../data/emojies.json";
import permissions from "../data/perms";
import GuildModel from "../schemas/Guild";
import PermissionHistoryModel from "../schemas/PermissionHistory";
import { BotEvent, IGuild } from "../types";
import { RtextEmbed } from "../utils/msgUtils";

const event: BotEvent = {
  name: "interactionCreate",
  execute: async (client: Client, interaction: Interaction) => {
    let prevPermsArr: Array<string> = [];

    let deletedPermsArr: Array<string> = [];
    let addedPermsArr: Array<string> = [];

    let rawPerms = permissions;

    let newOpts: Array<any> = [];

    if (interaction.isStringSelectMenu()) {
      let [menutype, guild, ogMessageAuhtorId, target, type] =
        interaction.customId.split("_");

      if (menutype === "menuperm") {
        if (
          new Date().getTime() -
            (interaction.message.editedTimestamp! ||
              interaction.message.createdTimestamp) >
          60 * 1000
        ) {
          return await interaction.message.edit({
            embeds: [
              await RtextEmbed(
                `${emoji.cantsee} | This menu has expired due to inactivity, create a new one if nedded (your changes aren't saved)`
              ),
            ],
            components: [],
          });
        }

        if (interaction.user.id !== ogMessageAuhtorId)
          return await interaction.reply({
            embeds: [
              await RtextEmbed(
                `:grimacing: | This menu is not for you so don't touch it ever again.`
              ),
            ],
            ephemeral: true,
          });

        let timeout = client.timeouts.get(`menuperm_${guild}_${target}`);

        if (timeout) {
          clearTimeout(timeout[1]);
          let newTimeout = setTimeout(async () => {
            client.timeouts.delete(`menuperm_${guild}_${target}`);
            await interaction.message.edit({
              embeds: [
                await RtextEmbed(
                  `${emoji.cantsee} | This menu has expired due to inactivity, create a new one if nedded`
                ),
              ],
              components: [],
            });
          }, 60 * 1000);
          client.timeouts.set(`menuperm_${guild}_${target}`, [
            {
              messageId: timeout[0].messageId,
              messageMember: timeout[0].messageMember,
              messageChannelId: interaction.message.channel.id,
            },
            newTimeout,
          ]);
        }

        interaction.component.options.forEach((option) => {
          if (option.default) prevPermsArr.push(option.value);
        });

        prevPermsArr.forEach((value) => {
          if (!interaction.values.includes(value)) {
            deletedPermsArr.push(
              `◟ ${
                permissions.find(
                  (perm) => perm.permission === value.split("-")[1]
                )?.permission
              }`
            );
          }
        });

        interaction.values.forEach((value) => {
          if (!prevPermsArr.includes(value)) {
            addedPermsArr.push(
              `◟ ${
                permissions.find(
                  (perm) => perm.permission === value.split("-")[1]
                )?.permission
              }`
            );
          }
        });

        let enabledPermsValues = interaction.values.concat(addedPermsArr);

        for (let index = 0; index < rawPerms.length; index++) {
          const perm = rawPerms[index];
          newOpts.push({
            default: enabledPermsValues.includes(
              `menuperm_${perm.cmd}_cmd-${perm.permission}`
            ),
            label: `&${perm.cmd.toLowerCase()}`,
            description: `Permission for the &${perm.permFor.join(
              " &"
            )} command`,
            value: `menuperm_${perm.cmd}_cmd-${perm.permission}`,
          });
        }

        const updatedRow =
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            StringSelectMenuBuilder.from(interaction.component).setOptions(
              ...newOpts
            )
          );

        interaction.deferUpdate().then(async () => {
          const filter = { guildID: guild };
          let pushUpdate: any, setUpdate: any, arrayFilter: any;
          if (type === "member") {
            arrayFilter = { "userElem.userId": target };
            pushUpdate = {
              $push: {
                userPermissions: {
                  userId: target,
                  permissions: interaction.values.map((value) => {
                    return value.split("-")[1];
                  }),
                },
              },
            };
            setUpdate = {
              $set: {
                "userPermissions.$[userElem].permissions":
                  interaction.values.map((value) => {
                    return value.split("-")[1];
                  }),
              },
            };
          } else if (type == "role") {
            arrayFilter = { "roleElem.roleId": target };
            pushUpdate = {
              $push: {
                rolePermissions: {
                  roleId: target,
                  permissions: interaction.values.map((value) => {
                    return value.split("-")[1];
                  }),
                },
              },
            };
            setUpdate = {
              $set: {
                "rolePermissions.$[roleElem].permissions":
                  interaction.values.map((value) => {
                    return value.split("-")[1];
                  }),
              },
            };
          }

          await GuildModel.findOne(filter)
            .then((guild: IGuild | null) => {
              if (!guild) {
                throw new Error("Guild not found");
              }
              let updated = false;
              let previousPermissions: Array<string> = [];
              if (type === "member") {
                const index = guild.userPermissions.findIndex(
                  (userPermission) => userPermission.userId === target
                );
                if (index !== -1) {
                  previousPermissions =
                    guild.userPermissions[index].permissions;
                  guild.userPermissions[index].permissions = interaction.values;
                  updated = true;
                }
              } else {
                const index = guild.rolePermissions.findIndex(
                  (rolePermission) => rolePermission.roleId === target
                );
                if (index !== -1) {
                  previousPermissions =
                    guild.rolePermissions[index].permissions;
                  guild.rolePermissions[index].permissions = interaction.values;
                  updated = true;
                }
              }
              if (updated) {
                const permissionHistory = new PermissionHistoryModel({
                  guildId: guild.guildID,
                  targetType: type,
                  targetId: target,
                  changedBy: ogMessageAuhtorId,
                  previousPermissions: prevPermsArr.map((value) => {
                    return permissions.find(
                      (perm) => perm.permission === value.split("-")[1]
                    )?.permission;
                  }),
                  currentPermissions: interaction.values.map((value) => {
                    return permissions.find(
                      (perm) => perm.permission === value.split("-")[1]
                    )?.permission;
                  }),
                });
                permissionHistory.save();

                return GuildModel.findOneAndUpdate(filter, setUpdate, {
                  new: true,
                  arrayFilters: [arrayFilter],
                });
              } else {
                return GuildModel.findOneAndUpdate(filter, pushUpdate, {
                  new: true,
                });
              }
            })
            .then(async (updatedGuild: IGuild | null) => {
              if (updatedGuild) {
                let updateEmbed = EmbedBuilder.from(
                  interaction.message.embeds[0]
                ).setDescription(
                  [
                    `**» Permission manager for ${type} :: <@${target}>**`,
                    `◟With the menu bellow you can add or remove permissions.\n`,
                    `${emoji.enter} **Added permissions** ::`,
                    addedPermsArr.length > 0
                      ? addedPermsArr.join("\n") + `\n`
                      : "◟None\n",
                    `${emoji.leave} **Removed permissions** ::`,
                    deletedPermsArr.length > 0
                      ? deletedPermsArr.join("\n") + `\n`
                      : "◟None\n",
                  ]
                    .filter((v) => v != "")
                    .join("\n")
                );

                await interaction.message.edit({
                  components: [updatedRow],
                  embeds: [updateEmbed],
                });

                await client.redisCache
                  .set(
                    `permroles:${updatedGuild.guildID}`,
                    JSON.stringify(
                      updatedGuild.rolePermissions.map((role) => role.roleId)
                    )
                  )
                  .catch((error: Error) => {
                    console.log("redis perm role caching very bad", error);
                  });

                const cacheKey = `permissions:${type}:${target}:${updatedGuild.guildID}`;
                const permissions = interaction.values.map((value) => {
                  return value.split("-")[1];
                });
                console.log(permissions);
                if (permissions.length > 0) {
                  await client.redisCache
                    .set(cacheKey, JSON.stringify(permissions))
                    .then(() => {
                      console.log("saved new");
                    })
                    .catch((error: Error) => {
                      console.log("redis perm caching very bad", error);
                    });
                } else {
                  await client.redisCache.del(cacheKey);
                }
              } else {
                interaction.message.reply(
                  "nothing has been updated which is weird, contact an admin"
                );
              }
            })
            .catch((error: Error) => {
              console.error(error);
            });
        });
      }
    }
  },
};

export default event;
