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
import GuildModel from "../schemas/Guild";
import { Command } from "../types";
import { RtextEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "menu",
  execute: async (client, message, args) => {
    let permissionsArr: Array<any> = [];
    let type = "unknown";

    if (!args[1]) return message.reply("please specify a role or user");

    let target =
      message.mentions.members?.first() ||
      (await message.guild?.members.fetch(args[1]).catch(() => {})) ||
      message.mentions.roles.first() ||
      (await message.guild?.roles.fetch(args[1]).catch(() => {}));

    if (!target) return message.reply("target not found");

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

    const guild = await GuildModel.findOne({ guildID: message.guild?.id });

    if (!guild) return message.reply("guild not found");

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
        name: `${message.guild?.name || "Unknown"} Mutes`,
        iconURL:
          message.guild?.iconURL({ size: 4096 }) ||
          "https://cdn.discordapp.com/embed/avatars/5.png",
      })
      .setFooter({
        text: `Executed by ${message.author.tag}`,
        iconURL:
          message.author.avatarURL({ size: 4096 }) ||
          "https://cdn.discordapp.com/embed/avatars/5.png",
      })
      .setTimestamp()
      .setDescription(
        [
          `**» Permission manager for ${
            target instanceof GuildMember ? "member" : "role"
          } :: ${target}**`,
          `◟With the menu bellow you can add or remove permissions.`,
        ]
          .filter((v) => v != "")
          .join("\n")
      );

    message
      .reply({ embeds: [permMenuEmbed], components: [row] })
      .then((msg) => {
        let timeout = setTimeout(async () => {
          client.timeouts.delete(`menuperm_${message.guild?.id}_${target?.id}`);
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
  },
  cooldown: 10,
  aliases: [],
  permissions: [PermissionFlagsBits.KickMembers],
};

export default command;
