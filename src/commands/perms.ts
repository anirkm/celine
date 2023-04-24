import {
  ActionRowBuilder,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  Role,
  StringSelectMenuBuilder,
} from "discord.js";

import emoji from "../data/emojies.json";
import permissions from "../data/perms";
import { sendPagination } from "../functions";
import GuildModel from "../schemas/Guild";
import PermissionHistoryModel from "../schemas/PermissionHistory";
import { Command, IGuild } from "../types";
import { RtextEmbed, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "perms",
  execute: async (client, message, args) => {
    let permissionsArr: Array<any> = [];
    let type = "unknown";

    if (
      ![
        "428692060619407370",
        "490667823392096268",
        "786356804107108403",
      ].includes(message.member!.id)
    )
      return;

    if (
      !args[1] ||
      (!args[2] && ["edit", "history"].includes(args[1].toLowerCase()))
    )
      return message.reply("please specify a role or user");

    const target =
      (await message.guild?.members
        .fetch(
          ["edit", "history"].includes(args[1].toLowerCase())
            ? message.mentions.parsedUsers.first() || args[2]
            : message.mentions.parsedUsers.first() || args[1]
        )
        .catch(() => {})) ||
      (await message.guild?.roles
        .fetch(
          ["edit", "history"].includes(args[1].toLowerCase())
            ? args[2]
            : args[1]
        )
        .catch(() => {}));

    if (!target) return message.reply("target not found");

    const guild = await GuildModel.findOne({ guildID: message.guild?.id });

    if (!guild) return message.reply("guild not found");

    if (args[1] === "history") {
      let msg = await textEmbed(
        message,
        `${emoji.loading} | Fetching permissions history for ${target}...`
      );

      let permissionHistory = await PermissionHistoryModel.find({
        guildId: message.guild?.id,
        targetId: target.id,
        targetType: target instanceof GuildMember ? "member" : "role",
      }).sort({ createdAt: -1 });

      if (!permissionHistory || permissionHistory.length === 0) {
        return msg.edit({
          embeds: [
            await RtextEmbed(
              `${emoji.error} | No permission history found for ${target}`
            ),
          ],
        });
      }

      let dataPerPage = 1;
      let totalEmbeds = Math.ceil(permissionHistory.length / dataPerPage);

      let i = 0;
      let embeds: EmbedBuilder[] = [];

      for (let j = 0; j < totalEmbeds; j++) {
        let desc: string[] = [
          `**» Viewing permissions history for ${target}**`,
          `◟a total of ${permissionHistory.length} changes were found\n`,
        ];

        let embed = new EmbedBuilder()
          .setAuthor({
            name: `${message.guild?.name || "Unknown"} Permissions`,
            iconURL:
              message.guild?.iconURL({ size: 4096 }) ||
              "https://cdn.discordapp.com/embed/avatars/5.png",
          })
          .setFooter({
            text: `Requested by ${message.author.tag}`,
            iconURL:
              message.author.displayAvatarURL({ size: 4096 }) ||
              "https://cdn.discordapp.com/embed/avatars/5.png",
          })
          .setTimestamp();

        for (let k = 0; k < dataPerPage; k++) {
          if (permissionHistory[i + k]) {
            desc.push(
              [
                `**Made by** ::: <@${permissionHistory[i + k].changedBy}>`,
                `**Changed at** ::: ${new Date(
                  permissionHistory[i + k].createdAt
                ).toLocaleString()}\n`,
                `${emoji.enter} **New Permissions** ::`,
                permissionHistory[i + k].currentPermissions.length > 0
                  ? permissionHistory[i + k].currentPermissions
                      .map((p) => `◟${p}`)
                      .join("\n") + "\n"
                  : "◟None\n",
                `${emoji.leave} **Previous Permissions** ::`,
                permissionHistory[i + k].previousPermissions.length > 0
                  ? permissionHistory[i + k].previousPermissions
                      .map((p) => `◟${p}`)
                      .join("\n") + "\n"
                  : "◟None\n",
              ]
                .filter((v) => v != "")
                .join("\n")
            );
          }

          embed.setDescription(desc.filter((v) => v != "").join("\n"));
        }

        embeds.push(embed);
        i += dataPerPage;
      }
      return msg
        .delete()
        .then(async () => {
          await sendPagination(message, embeds);
        })
        .catch(async () => {
          await sendPagination(message, embeds);
        });
    }

    if (args[1] === "edit") {
      console.log(target.id);

      let isTimeout = client.timeouts.get(
        `menuperm_${message.guild?.id}_${target.id}`
      );

      if (isTimeout) {
        return message.reply({
          embeds: [
            await RtextEmbed(
              `${emoji.error} | an active menu for ${target} is already open by <@${isTimeout[0].messageMember}>, please wait for it to expire before creating a new one.`
            ),
          ],
        });
      }

      permissions.forEach((perm) => {
        let isDefault = false;
        if (target instanceof GuildMember) {
          type = "member";
          isDefault = guild.userPermissions
            .find((user) => user.userId === target!.id)
            ?.permissions.find((permission) => permission === perm.permission)
            ? true
            : false;
        }
        if (target instanceof Role) {
          type = "role";
          isDefault = guild.rolePermissions
            .find((role) => role.roleId === target!.id)
            ?.permissions.includes(perm.permission)
            ? true
            : false;
        }
        permissionsArr.push({
          default: isDefault,
          label: `&${perm.cmd}`,
          description: `Permission for the &${perm.permFor.join(" &")} command`,
          value: `menuperm_${perm.cmd}_cmd-${perm.permission}`,
        });
      });

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(
            `menuperm_${message.guild?.id}_${message.member?.id}_${target.id}_${type}`
          )
          .setPlaceholder("Edit permissions here")
          .setMinValues(0)
          .setMaxValues(permissions.length)
          .addOptions(...permissionsArr)
      );

      let permMenuEmbed = new EmbedBuilder()
        .setAuthor({
          name: `${message.guild?.name || "Unknown"} Permissions`,
          iconURL:
            message.guild?.iconURL({ size: 4096 }) ||
            "https://cdn.discordapp.com/embed/avatars/5.png",
        })
        .setFooter({
          text: `Executed by ${message.author.tag}`,
          iconURL:
            message.author.displayAvatarURL({ size: 4096 }) ||
            "https://cdn.discordapp.com/embed/avatars/5.png",
        })
        .setTimestamp()
        .setDescription(
          [
            `**» Editing permissions for ${
              target instanceof GuildMember ? "member" : "role"
            } :: ${target}**`,
            "◟With the menu bellow you can add or remove permissions.",
          ]
            .filter((v) => v != "")
            .join("\n")
        );

      return await message
        .reply({ embeds: [permMenuEmbed], components: [row] })
        .then((msg) => {
          let timeout = setTimeout(async () => {
            client.timeouts.delete(
              `menuperm_${message.guild?.id}_${target?.id}`
            );
            await msg.edit({
              embeds: [
                await RtextEmbed(
                  `${emoji.cantsee} | This menu has expired due to inactivity, create a new one if nedded`
                ),
              ],
              components: [],
            });
          }, 60 * 1000);
          client.timeouts.set(`menuperm_${message.guild?.id}_${target?.id}`, [
            {
              messageId: message.id,
              messageMember: message.member?.id,
              messageChannelId: msg.channel.id,
            },
            timeout,
          ]);
        });
    }

    let msg = await textEmbed(
      message,
      `${emoji.loading} | Wait while fetching ${target} permissions`
    );

    const filter = { guildID: message.guild?.id };
    let arrayFilter: any;
    if (target instanceof GuildMember) {
      arrayFilter = { userPermissions: { $elemMatch: { userId: target.id } } };
    } else {
      arrayFilter = { rolePermissions: { $elemMatch: { roleId: target.id } } };
    }

    GuildModel.findOne(filter, arrayFilter)
      .then(async (guild: IGuild | null) => {
        if (!guild) {
          return msg.edit({
            embeds: [
              await RtextEmbed(
                `${emoji.error} | this guild is not registered in the database, please contact an admin or sum`
              ),
            ],
          });
        }
        let permissions: Array<string> | undefined;
        if (target instanceof GuildMember) {
          const userPermission = guild.userPermissions.find(
            (userPermission) => userPermission.userId === target.id
          );
          if (userPermission) {
            permissions = userPermission.permissions;
          }
        } else {
          const rolePermission = guild.rolePermissions.find(
            (rolePermission) => rolePermission.roleId === target.id
          );
          if (rolePermission) {
            permissions = rolePermission.permissions;
          }
        }
        let permissionsEmbed = new EmbedBuilder()
          .setAuthor({
            name: `${message.guild?.name || "Unknown"} Permissions`,
            iconURL:
              message.guild?.iconURL({ size: 4096 }) ||
              "https://cdn.discordapp.com/embed/avatars/5.png",
          })
          .setFooter({
            text: `Executed by ${message.author.tag}`,
            iconURL:
              message.author.displayAvatarURL({ size: 4096 }) ||
              "https://cdn.discordapp.com/embed/avatars/5.png",
          })
          .setTimestamp()
          .setDescription(
            [
              `**» Viewing permissions for ${target}**`,
              `◟_to edit permissions use __&perms edit___ ${target}\n`,
              "» **Current permissions:**",
              permissions && permissions?.length !== 0
                ? permissions
                    .map((p) => `◟${p}`)
                    .filter((v) => v != "")
                    .join("\n")
                : "There is no permissions",
            ]
              .filter((v) => v != "")
              .join("\n")
          );

        await msg.edit({ embeds: [permissionsEmbed] });
      })
      .catch(async (error: Error) => {
        console.log(error);
        return msg.edit({
          embeds: [
            await RtextEmbed(
              `${emoji.error} | an error occured while fetching date, please try again`
            ),
          ],
        });
      });
  },
  cooldown: 10,
  aliases: ["perm"],
  permissions: [PermissionFlagsBits.KickMembers],
};

export default command;
