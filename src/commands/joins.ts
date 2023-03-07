import { EmbedBuilder } from "discord.js";
import emoji from "../data/emojies.json";
import { sendPagination } from "../functions";
import GuildJoinModel from "../schemas/GuildJoin";
import { Command, IGuildJoin } from "../types";
import { RtextEmbed, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "joins",
  execute: async (client, message, args) => {
    message.reply("emitted");

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

    let msg = await textEmbed(
      message,
      `${emoji.loading} - Wait while past ${user} joins are being fetched...`
    );

    let userJoins = await GuildJoinModel.find({
      guildId: message.guild?.id,
      userId: message.member?.id,
    })
      .sort({ created_at: 1 })
      .catch((e) => {
        message.reply("err");
        console.log(e);
      });

    if (!userJoins || userJoins.length <= 0) {
      msg.edit({
        embeds: [
          await RtextEmbed(
            `${emoji.error} | ** We don't have any data in our database about past ${user} joins.`
          ),
        ],
      });
      return;
    }

    let userJoinNormal = userJoins.filter(
      (em: IGuildJoin) => em.type == "normal"
    );
    let userJoinVanity = userJoins.filter(
      (em: IGuildJoin) => em.type == "vanity"
    );
    let userJoinUnknown = userJoins.filter(
      (em: IGuildJoin) => em.type == "unknown"
    );

    let ujnp = (userJoinNormal.length * 100) / userJoins.length;
    let ujvp = (userJoinVanity.length * 100) / userJoins.length;
    let ujup = (userJoinUnknown.length * 100) / userJoins.length;

    let dataPerPage = 15;
    let totalEmbeds = Math.ceil(userJoins.length / dataPerPage);

    let inviters = new Map();

    userJoins.forEach(async (join: IGuildJoin) => {
      if (!join.invitedBy) return;
      if (inviters.get(join.invitedBy)) {
        inviters.set(join.invitedBy, inviters.get(join.invitedBy) + 1);
      } else {
        inviters.set(join.invitedBy, 1);
      }
    });

    let [mostInviter, mostInvites] = [...inviters.entries()].reduce((a, e) =>
      e[1] > a[1] ? e : a
    );

    let i = 0;
    let embeds: EmbedBuilder[] = [];

    for (let j = 0; j < totalEmbeds; j++) {
      let desc: string[] = [
        `${user} joined the server ${userJoins.length} ${
          userJoins.length === 0 ? `time` : `times`
        } with <@${mostInviter}> being his most inviter at ${mostInvites} invites \n`,
        `Joins using someone's invite :: ${
          userJoinNormal.length
        } (${ujnp.toFixed(2)} %)`,
        `Joins using vanity link :: ${userJoinVanity.length} (${ujvp.toFixed(
          2
        )} %)`,
        `Joins which i can't figure how :: ${
          userJoinUnknown.length
        } (${ujup.toFixed(2)} %)\n`,
      ];

      let embed = new EmbedBuilder()
        .setAuthor({
          name: `${user.user.tag} Joins`,
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
        if (userJoins[i + k]) {
          let emDesc: string;
          if (userJoins[i + k].invitedBy && userJoins[i + k].type == "normal") {
            emDesc = `by <@${userJoins[i + k].invitedBy}>.`;
          } else if (userJoins[i + k].type == "vanity") {
            emDesc = "using vanity link.";
          } else {
            emDesc = "(can't figure how).";
          }
          desc.push(
            [
              `**${i + k + 1})** At \`${new Date(
                userJoins[i + k].timestamp
              ).toLocaleDateString("fr-FR")} ${new Date(
                userJoins[i + k].timestamp
              ).toLocaleTimeString("fr-FR")}\` ${emDesc} `,
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
