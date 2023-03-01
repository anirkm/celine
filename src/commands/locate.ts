import { StageChannel, TextChannel } from "discord.js";
import emoji from "../data/emojies.json";
import { Command } from "../types";
import { textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "locate",
  execute: async (client, message, args) => {
    let user =
      message.mentions.members?.first() ||
      (await message.guild?.members
        .fetch({ user: args[1] || message.author, force: true })
        .catch(() => {}));

    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you specified was not found.`
      );

    if (!user.voice.channel)
      return textEmbed(
        message,
        `${emoji.error} | ${
          user.id === message.author.id ? `You're not` : `${user} is not`
        }  in a voice channel.`
      );

    await client.channels
      .fetch(user.voice.channel.id)
      .then((channel) => {
        textEmbed(
          message,
          `**${emoji.yay} | ${
            user!.id === message.author.id ? `You're ` : `${user} is`
          } in ${channel} with ${
            (channel as TextChannel | StageChannel).members.size - 1
          } other members.**`
        );
      })
      .catch((e) => {
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
