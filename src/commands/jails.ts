import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import ms from "enhanced-ms";
import emoji from "../data/emojies.json";
import { hasPermission, sendPagination } from "../functions";
import { Command } from "../types";
import { RtextEmbed, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "jails",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "use_jail")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let cursor = "0";
    let jails: any[] = [];

    let user =
      message.mentions.parsedUsers.first() ||
      (await message.guild?.members
        .fetch({ user: args[1], cache: true })
        .catch(() => {}));

    let msg = await textEmbed(
      message,
      `${emoji.loading} | Fetching active jails..`
    );

    do {
      const [nextCursor, keys] = await client.redis.scan(
        cursor,
        "MATCH",
        `jailqueue_${message.guild?.id}_${user?.id || "*"}`
      );
      cursor = nextCursor;
      for await (const key of keys) {
        let jailedUser = await message
          .guild!.members.fetch(key.split("_")[2])
          .catch(() => {});
        let expireTime = (await client.redis.get(key)) || 0;
        console.log(key);

        let roles = await client.redis.lrange(
          `jr_${message.guild?.id}_${jailedUser?.id}`,
          0,
          -1
        );

        console.log(roles);

        if (jailedUser && Number(expireTime) > 0) {
          jails.push({
            member: jailedUser,
            expireTime: expireTime,
            roles: roles,
          });
        }
      }
    } while (cursor !== "0");

    if (!jails || jails.length <= 0)
      return msg.edit({
        embeds: [
          await RtextEmbed(`${emoji.error} | **No active jails were found**.`),
        ],
      });

    console.log(jails.length);

    let dataPerPage = 7;
    let totalEmbeds = Math.ceil(jails.length / dataPerPage);

    let i = 0;
    let embeds: EmbedBuilder[] = [];

    for (let j = 0; j < totalEmbeds; j++) {
      let desc: string[] = [
        `${emoji.jailed} | There is ${jails.length} active jails\n`,
      ];

      let embed = new EmbedBuilder()
        .setAuthor({
          name: `${message.guild?.name || "Unknown"} jails`,
          iconURL:
            message.guild?.iconURL({ size: 4096 }) ||
            "https://cdn.discordapp.com/embed/avatars/5.png",
        })
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL:
            message.author.displayAvatarURL({ size: 4096 }) ||
            "https://cdn.discordapp.com/embed/avatars/5.png",
        });

      for (let k = 0; k < dataPerPage; k++) {
        if (jails[i + k]) {
          desc.push(
            [
              `**User:** <@${jails[i + k].member.id}> (${
                jails[i + k].member.id
              })`,
              `**Expires in:** ${ms(
                Number(jails[i + k].expireTime) - new Date().getTime()
              )}`,
              jails[i + k].roles.length > 0
                ? `**Saved roles:** ${jails[i + k].roles.length}\n`
                : "\n",
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
