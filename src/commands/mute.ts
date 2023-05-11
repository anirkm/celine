import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import ms from "enhanced-ms";
import { hasPermission } from "../functions";
import emoji from "../data/emojies.json";
import GuildModel from "../schemas/Guild";
import SanctionModel from "../schemas/Sanction";
import { Command } from "../types";
import { missingArgs, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "mute",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "use_mute")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return console.log(message.member?.user.id, "no perm mute");
    }

    let argsEmbed = await missingArgs(
      message,
      "mute",
      `${message.member} [duration] (reason)`,
      [`${message.member} 1337s`, `${message.member} 1337s reason`]
    );

    if (!args[1] || !args[2]) {
      return message.reply({ embeds: [argsEmbed] });
    }

    let user = await message.guild?.members
      .fetch({
        user: message.mentions.parsedUsers.first() || args[1],
        cache: true,
      })
      .catch(() => {})

    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you specified was not found.`
      );

    if (user.permissions.has(PermissionFlagsBits.Administrator))
      return textEmbed(
        message,
        `${emoji.error} | Text mutes can't be executed on administrators.`
      );

    let reason: string = args.slice(3).join(" ") || "no reason was specified";
    let muteRole;

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

    let duration: number = ms(args[2].toLowerCase());

    let guild = await GuildModel.findOne({ guildID: message.guild?.id });

    if (!guild)
      return textEmbed(
        message,
        `${emoji.error} | This guild isn't correctly setup. run __&cfg sg__.`
      );

    if (guild && !guild.options.jailRole)
      return textEmbed(
        message,
        `${emoji.error} | Mute role for this guild isn't correctly setup. run __&cfg muterole__.`
      );
    muteRole = await message.guild?.roles.fetch(guild.options.muteRole);

    if (!muteRole)
      return textEmbed(
        message,
        `${emoji.error} | Mute role for this guild is invalid setup. run __&cfg muterole__.`
      );

    user.roles
      .add(muteRole, `${message.member?.user.tag} - ${reason}`)
      .then(async (user) => {
        textEmbed(
          message,
          `${emoji.muted} | ${user} has been muted for ${ms(duration, {
            roundUp: false,
          })}.`
        );

        await client.redis
          .set(
            `vmutequeue_${message.guild?.id}_${user.id}`,
            new Date().getTime() + duration
          )
          .then(() => {
            if (user!.voice.channel)
              user!.voice.setMute(
                true,
                `${message.member?.user.tag} - ${reason}`
              );
          });

        let notifEm = new EmbedBuilder()
          .setAuthor({
            name: message.guild!.name,
            iconURL:
              message.guild?.iconURL() ||
              "https://cdn.discordapp.com/avatars/490667823392096268/7ccc56164f0adcde7fe00ef4384785ee.png?size=1024",
          })
          .setDescription(
            [
              "**You have been muted from this guild.**",
              "**You can't send text messages in public channels.**",
              "**Each time you will join a voice channel you will be muted unless someone unmute you.**\n",
              `__Reason__ :: ${reason}`,
              `__Duration__ :: ${ms(duration, {
                roundUp: false,
              })}`,
            ].join("\n")
          )
          .setTimestamp()
          .setFooter({
            text: user.user.tag,
            iconURL:
              user.user.displayAvatarURL() ||
              "https://cdn.discordapp.com/avatars/490667823392096268/7ccc56164f0adcde7fe00ef4384785ee.png?size=1024",
          });

        user
          .send({
            embeds: [notifEm],
          })
          .catch(() => {});

        let newMute = new SanctionModel({
          guildID: message.guild?.id,
          modID: message.member?.id,
          userID: user.id,
          type: "Mute",
          reason: reason,
          duration: ms(duration, {
            roundUp: true,
          }),
          startAt: new Date(),
        });

        await newMute
          .save()
          .then(async (doc) => {
            doc.save();
            client.redis
              .set(
                `mutequeue_${message.guild?.id}_${user.id}`,
                new Date().getTime() + ms(args[2])
              )
              .catch((e) => {
                console.log("err while seting mute queue", e);
              });
          })
          .catch((err) => {
            console.log("debug: err while saving jail", err);
          });
      })
      .catch((e) => {
        switch (e.message) {
          case "Unknown User":
            textEmbed(message, `${emoji.error} | Invalid user, Try again.`);
            break;
          case "Missing Permissions":
            textEmbed(
              message,
              `${emoji.error} | Due to missing permissions i can't execute this command on ${user}.`
            );
            break;
          case "Invalid Form Body":
            textEmbed(
              message,
              `${emoji.error} | You've malformed the command, try again.`
            );
            break;
          default:
            textEmbed(
              message,
              `${emoji.error} | An error occurred while trying to execute this command, try again.. (DiscordAPI: ${e.message})`
            );
            console.log(e);
            break;
        }
      });
  },
  cooldown: 10,
  aliases: [],
  permissions: [PermissionFlagsBits.ManageRoles],
};

export default command;
