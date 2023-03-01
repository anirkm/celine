import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { Command } from "../types";
import GuildModel from "../schemas/Guild";
import { Redis } from "ioredis";
import { ms } from "enhanced-ms";
import { RtextEmbed, textEmbed } from "../utils/msgUtils";
import emoji from "../data/emojies.json";

const command: Command = {
  name: "ping",
  execute: async (client, message, args) => {
    let discordIncidents: string[] = [];

    let redisLatency = 0;
    let mongoLatency = 0;
    let apiLatency = client.ws.ping;

    let msg = await textEmbed(
      message,
      `${emoji.loading} Calculaing API latency...`
    );

    let startTimeRedis = new Date().getTime();
    await client.redis.ping().then(() => {
      redisLatency = new Date().getTime() - startTimeRedis;
    });

    let startTimeMongo = new Date().getTime();
    await GuildModel.db.db.command({ ping: 1 }).then(() => {
      mongoLatency = new Date().getTime() - startTimeMongo;
    });

    await fetch("https://discordstatus.com/api/v2/incidents/unresolved.json")
      .then((res) => res.json())
      .then((res) => {
        res.incidents.forEach((inc: any) => {
          discordIncidents?.push(`➥ ${inc.name}`);
        });
      })
      .catch(() => {});

    let startRound = new Date().getTime();
    msg
      .edit({
        embeds: [
          await RtextEmbed(
            `${emoji.loading} **Calculating roundtrip latency...**`
          ),
        ],
      })
      .then((msg) => {
        let endRound = new Date().getTime() - startRound;
        let embed = new EmbedBuilder()
          .setAuthor({
            name: `${message.guild?.name || "no name"} Latency Report`,
            iconURL:
              message.guild?.iconURL({ size: 4096 }) ||
              "https://cdn.discordapp.com/embed/avatars/5.png",
          })
          .setDescription(
            [
              `\n`,
              `➥ **API** :: ${apiLatency} ms`,
              `➥ **Roundtrip** :: ${endRound} ms`,
              `➥ **Database** :: ${mongoLatency} ms`,
              `➥ **Cache** :: ${redisLatency} ms`,
              `➥ **Uptime** :: ${ms(client.uptime!)} \n`,
              `**Unresolved Discord Incidents: **`,
              discordIncidents?.length > 0
                ? discordIncidents!.filter((v) => v != "").join("\n")
                : "All incidents have been resolved.",
            ]
              .filter((v) => v != "")
              .join("\n")
          )
          .setFooter({
            text: `Requested by ${message.member?.user.tag}`,
            iconURL:
              message.member?.user.avatarURL({ size: 4096 }) ||
              "https://cdn.discordapp.com/embed/avatars/5.png",
          })
          .setTimestamp();
        msg.edit({ embeds: [embed] });
      });
  },
  cooldown: 10,
  aliases: [],
  permissions: [],
};

export default command;
