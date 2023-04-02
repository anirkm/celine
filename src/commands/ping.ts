import { EmbedBuilder, Message } from "discord.js";
import { ms } from "enhanced-ms";
import emoji from "../data/emojies.json";
import GuildModel from "../schemas/Guild";
import { Command } from "../types";
import { RtextEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "ping",
  execute: async (client, message, args) => {
    let discordIncidents: string[] = [];

    let redisLatency = 0;
    let mongoLatency = 0;
    let apiLatency = 0;
    let gatewayLatency = client.ws.ping;
    let msg: Message;

    await message
      .reply({
        embeds: [
          {
            color: 10181046,
            description: `**${emoji.loading} » Calculaing API latency...**`,
          },
        ],
      })
      .then((m: Message) => {
        msg = m;
        apiLatency = new Date().getTime() - msg.createdTimestamp;
      });

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

    (msg! as Message)
      .edit({
        embeds: [
          await RtextEmbed(
            `${emoji.loading} **Calculating roundtrip latency...**`
          ),
        ],
      })
      .then((msg) => {
        let endRound = new Date().getTime() - msg.editedTimestamp!;
        let embed = new EmbedBuilder()
          .setAuthor({
            name: `${message.guild?.name || "no name"} Latency Report`,
            iconURL:
              message.guild?.iconURL({ size: 4096 }) ||
              "https://cdn.discordapp.com/embed/avatars/5.png",
          })
          .setDescription(
            [
              "\n",
              `➥ **API Median Latency** :: ${apiLatency} ms`,
              `➥ **WS Gateway** :: ${gatewayLatency} ms`,
              `➥ **API Roundtrip** :: ${endRound} ms`,
              `➥ **Database** :: ${mongoLatency} ms`,
              `➥ **Cache** :: ${redisLatency} ms`,
              `➥ **Uptime** :: ${ms(client.uptime!)} \n`,
              "**Unresolved Discord Incidents: **",
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
        setTimeout(() => {
          msg.edit({ embeds: [embed] });
        }, 200);
      });
  },
  cooldown: 10,
  aliases: [],
  permissions: [],
};

export default command;
