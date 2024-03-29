import { EmbedBuilder } from "@discordjs/builders";
import { ms } from "enhanced-ms";
import emojies from "../data/emojies.json";
import { sendPagination } from "../functions";
import { Command } from "../types";
import { textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "snipe",
  execute: async (client, message, args) => {
    console.log("lol");
    let sniped = await client.randomRedis
      .lrange(`snipe:${message.guild?.id}:${message.channel.id}`, 0, -1)
      .catch((e) => {
        console.log("err fetch snipe", e);
      });

    if (!sniped || sniped.length === 0)
      return textEmbed(
        message,
        `${emojies.error} | Nothing has been sniped in this channel yet!`,
      );

    let embeds = [];

    for (let msg of sniped.map((msg) => JSON.parse(msg)) as unknown as Array<{
      content: string;
      author: string;
      createdAt: string;
    }>) {
      let author = await client.users.fetch(msg.author);
      if (!author) continue;
      let embed = new EmbedBuilder()
        .setColor(10031625)
        .setAuthor({
          iconURL:
            author.avatarURL() ||
            "https://cdn.discordapp.com/avatars/490667823392096268/7ccc56164f0adcde7fe00ef4384785ee.png?size=1024",
          name: author.tag,
        })
        .setDescription(
          [
            `**Author**: ${author}`,
            `**Content:** ${msg.content}\n`,
            `_Sniped ${ms(Date.now() - parseInt(msg.createdAt), {
              roundUp: true,
            })} ago_`,
          ].join("\n"),
        )
        .setTimestamp(new Date(msg.createdAt));
      embeds.push(embed);
    }

    await sendPagination(message, embeds);
  },
  cooldown: 10,
  aliases: [],
  permissions: [],
};

export default command;
