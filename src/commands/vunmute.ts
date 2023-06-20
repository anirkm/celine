import { PermissionFlagsBits } from "discord.js";
import emoji from "../data/emojies.json";
import { hasPermission } from "../functions";
import { Command } from "../types";
import { missingArgs, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "vunmute",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "use_vmute")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let argsEmbed = await missingArgs(
      message,
      "unvmute",
      `${message.member} (reason)`,
      [`${message.member} uwu`]
    );

    if (!args[1]) {
      return message.reply({ embeds: [argsEmbed] });
    }

    let user = await message.guild?.members
      .fetch({
        user: message.mentions.parsedUsers.first() || args[1],
        cache: true,
      })
      .catch(() => {});
    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you specified was not found.`
      );

    let reason: string = args.slice(2).join(" ") || "no reason was specified";

    if (reason.trim().length === 0) reason = "no reason was specified";

    await client.redis
      .del(`vmutequeue_${message.guild?.id}_${user.id}`)
      .then(() => {
        textEmbed(
          message,
          `${emoji.muted} | ${user} voice mute has been successfully removed.`
        );
        if (user?.voice.channel) {
          user.voice
            .setMute(
              false,
              `${message.author.id} - User unmuted by ${message.member?.user.tag}`
            )
            .catch(() => {});
        } else {
          client.redis
            .set(`vmex_${message.guild?.id}_${user!.id}`, 0, "EX", 172800)
            .catch(console.log);
        }
      })
      .catch((e) => {
        console.log(e);
        textEmbed(
          message,
          `${emoji.error} | An error occurred why executing this command.`
        );
      });
  },
  cooldown: 10,
  aliases: ["unvmute", "unv", "vum"],
  permissions: [],
};

export default command;
