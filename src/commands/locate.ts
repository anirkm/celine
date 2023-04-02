import { PermissionFlagsBits, StageChannel, TextChannel } from "discord.js";
import emoji from "../data/emojies.json";
import { Command } from "../types";
import { textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "locate",
  execute: async (client, message, args) => {
    let user =
      message.mentions.members?.first() ||
      (await message.guild?.members
        .fetch({ user: args[1] || message.author, cache: true })
        .catch(() => {}));

    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you specified was not found.`
      );

    if (
      user.id !== message.member?.id &&
      user.permissions.has(PermissionFlagsBits.Administrator) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return textEmbed(
        message,
        `${emoji.error} | You can't run this command on administrators.`
      );

    if (!user.voice.channel)
      return textEmbed(
        message,
        `${emoji.error} | ${
          user.id === message.author.id ? "You're not" : `${user} is not`
        }  in a voice channel.`
      );

    await client.channels
      .fetch(user.voice.channel.id)
      .then((channel) => {
        textEmbed(
          message,
          `${emoji.yay} | ${
            user!.id === message.author.id ? "You're " : `${user} is`
          } in ${channel} with ${
            (channel as TextChannel | StageChannel).members.size - 1
          } other members. ${
            user!.id === message.author.id &&
            message.author.id !== "490667823392096268"
              ? "__#l7adi menghir rbi 9ewad__"
              : ""
          } `
        );
      })
      .catch(() => {
        textEmbed(
          message,
          `${emoji.error} | An error occurred while fetching the channel, try again`
        );
      });
  },
  cooldown: 10,
  aliases: [],
  permissions: [],
};

export default command;
