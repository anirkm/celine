import { EmbedBuilder } from "discord.js";
import ms from "enhanced-ms";
import emoji from "../data/emojies.json";
import { sendPagination } from "../functions";
import { Command } from "../types";
import { RtextEmbed, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "mutes",
  execute: async (client, message, args) => {
    let cursor = "0";
    let mutes: any[] = [];

    let user =
      message.mentions.members?.first() ||
      (await message.guild?.members
        .fetch({ user: args[1], force: true })
        .catch(() => {}));

    let msg = await textEmbed(
      message,
      `${emoji.loading} | Fetching active mutes..`
    );

    do {
      const [nextCursor, keys] = await client.redis.scan(
        cursor,
        "MATCH",
        `mutequeue_${message.guild?.id}_${user?.id || "*"}`
      );
      cursor = nextCursor;
      for await (const key of keys) {
        let mutedUser = await message
          .guild!.members.fetch(key.split("_")[2])
          .catch(() => {});
        let expireTime = (await client.redis.get(key)) || 0;
        console.log(key);

        if (mutedUser && Number(expireTime) > 0) {
          mutes.push({ member: mutedUser, expireTime: expireTime });
        }
      }
    } while (cursor !== "0");

    if (!mutes || mutes.length <= 0)
      return msg.edit({
        embeds: [
          await RtextEmbed(`${emoji.error} | **No active mutes were found**.`),
        ],
      });

    console.log(mutes.length);

    let dataPerPage = 7;
    let totalEmbeds = Math.ceil(mutes.length / dataPerPage);

    let i = 0;
    let embeds: EmbedBuilder[] = [];

    for (let j = 0; j < totalEmbeds; j++) {
      let desc: string[] = [
        `${emoji.muted} | There is ${mutes.length} active mutes\n`,
      ];

      let embed = new EmbedBuilder()
        .setAuthor({
          name: `${message.guild?.name || "Unknown"} Mutes`,
          iconURL:
            message.guild?.iconURL({ size: 4096 }) ||
            "https://cdn.discordapp.com/embed/avatars/5.png",
        })
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL:
            message.author.avatarURL({ size: 4096 }) ||
            "https://cdn.discordapp.com/embed/avatars/5.png",
        });

      for (let k = 0; k < dataPerPage; k++) {
        if (mutes[i + k]) {
          desc.push(
            [
              `<@${mutes[i + k].member.id}> (${mutes[i + k].member.id})`,
              `**Expires in:** ${ms(
                Number(mutes[i + k].expireTime) - new Date().getTime()
              )} \n`,
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
    msg
      .delete()
      .then(async () => {
        await sendPagination(message, embeds);
      })
      .catch(async () => {
        await sendPagination(message, embeds);
      });
  },
  cooldown: 10,
  aliases: [],
  permissions: [],
};

export default command;
