import { PermissionFlagsBits } from "discord.js";
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

    let user =
      message.mentions.members?.first() ||
      (await message.guild?.members
        .fetch({ user: args[1], cache: true })
        .catch(() => {}));

    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you specified was not found.`
      );

    let reason: string = args.slice(3).join(" ") || "no reason was specified";

    if (!ms(args[2])) {
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
