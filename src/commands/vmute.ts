import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import ms from "enhanced-ms";
import emoji from "../data/emojies.json";
import { hasPermission } from "../functions";
import { Command } from "../types";
import { missingArgs, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "vmute",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "use_vmute")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let argsEmbed = await missingArgs(
      message,
      "vmute",
      `${message.member} [duration] (reason)`,
      [`${message.member} 1337s`, `${message.member} 1337s reason`]
    );

    if (!args[1] || !args[2]) {
      return message.reply({ embeds: [argsEmbed] });
    }

    let user = await message.guild?.members
      .fetch({
        user: message.mentions.members?.first() || args[1],
        cache: true,
      })
      .catch(() => {});

    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you specified was not found.`
      );

    let reason: string = args.slice(3).join(" ") || "no reason was specified";

    if (!parseInt(args[2]) || !ms(args[2])) {
      return textEmbed(
        message,
        `${emoji.huh} | The duration you've specified is invalid`
      );
    }

    if (ms(args[2]) !== null) {
      if (ms(args[2]) < ms("10s") || ms(args[2]) > ms("1month")) {
        return textEmbed(
          message,
          `${emoji.error} | The duration should be between 10 seconds and 1 month.`
        );
      }
    }

    let duration: number = ms(args[2]);

    if (reason.trim().length === 0) reason = "no reason was specified";

    await client.redis
      .set(
        `vmutequeue_${message.guild?.id}_${user.id}`,
        new Date().getTime() + duration
      )
      .then(() => {
        if (user!.voice.channel)
          user!.voice.setMute(true, `${message.member?.user.tag} - ${reason}`);
        textEmbed(
          message,
          `${emoji.muted} | ${user} has been voice-muted for ${ms(duration, {
            roundUp: false,
          })}.`
        );

        let notifEm = new EmbedBuilder()
          .setAuthor({
            name: message.guild!.name,
            iconURL:
              message.guild?.iconURL() ||
              "https://cdn.discordapp.com/avatars/490667823392096268/7ccc56164f0adcde7fe00ef4384785ee.png?size=1024",
          })
          .setDescription(
            [
              "**You have been voice-muted from this guild.**",
              "**Each time you will join a voice channel you will be muted unless someone un-mute you.**\n",
              `__Reason__ :: ${reason}`,
              `__Duration__ :: ${ms(duration, {
                roundUp: false,
              })}`,
            ].join("\n")
          )
          .setTimestamp()
          .setFooter({
            text: user!.user.tag,
            iconURL:
              user!.user.displayAvatarURL() ||
              "https://cdn.discordapp.com/avatars/490667823392096268/7ccc56164f0adcde7fe00ef4384785ee.png?size=1024",
          });

        user!
          .send({
            embeds: [notifEm],
          })
          .catch(() => {});
      })
      .catch((e) => {
        console.log("set mute redis err", e);
        textEmbed(
          message,
          `${emoji.error} | An error occurred while voice muting the user.`
        );
      });
  },
  cooldown: 10,
  aliases: ["vm"],
  permissions: [],
};

export default command;
