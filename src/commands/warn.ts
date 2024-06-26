import { PermissionFlagsBits } from "discord.js";
import { genId, hasPermission } from "../functions";
import emoji from "../data/emojies.json";
import WarnModel from "../schemas/Warn";
import { Command } from "../types";
import { RtextEmbed, missingArgs, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "warn",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "use_warn")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let argsEmbed = await missingArgs(
      message,
      "warn",
      `${message.member} (reason)`,
      [`${message.member} reason`, "remove 1337"]
    );

    if (!args[1]) return message.reply({ embeds: [argsEmbed] });

    if (["remove", "delete"].includes(args[1])) {
      let argsEmbed2 = await missingArgs(
        message,
        "warn remove",
        "remove (warnid)",
        ["remove 1337"]
      );
      if (!args[2]) {
        return message.reply({ embeds: [argsEmbed2] });
      }

      let msg = await message.reply({
        embeds: [
          await RtextEmbed(
            `${emoji.loading} | **Please wait while we're fetching your warn.**`
          ),
        ],
      });

      let warn = await WarnModel.findOne({
        guildID: message.guild?.id,
        warnID: args[2],
      }).catch(async () => {
        return msg.edit({
          embeds: [
            await RtextEmbed(
              `${emoji.error} | **Error while fetching warn, try again.**`
            ),
          ],
        });
      });

      if (!warn)
        return msg.edit({
          embeds: [
            await RtextEmbed(
              `${emoji.decline} | **No warn was found with the Warn ID you've specified.**`
            ),
          ],
        });

      return WarnModel.deleteOne({
        guildID: message.guild?.id,
        warnID: args[2],
      })
        .then(async (result) => {
          if (result.deletedCount !== 0) {
            return msg.edit({
              embeds: [
                await RtextEmbed(
                  `${emoji.approve} | **Warn (\`#${args[2]}\`) has been deleted.**`
                ),
              ],
            });
          } else {
            return msg.edit({
              embeds: [
                await RtextEmbed(
                  `${emoji.decline} | **No warn was found with the WarnID you've specified.**`
                ),
              ],
            });
          }
        })
        .catch(async (e) => {
          msg.edit({
            embeds: [
              await RtextEmbed(
                `${emoji.error} | **An unexpected error occured, please try again.**`
              ),
            ],
          });

          return console.log("error del warn", e);
        });
    }

    if (!args[2]) {
      return message.reply({ embeds: [argsEmbed] });
    }

    let user = await message.guild?.members
      .fetch({
        user: message.mentions.parsedUsers.first() || args[1],
        cache: true,
      })
      .catch(() => {});

    let reason = args.slice(2).join(" ");

    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you specified was not found.`
      );

    let newWarn = new WarnModel({
      warnID: genId(6),
      guildID: message.guild?.id,
      modID: message.member?.id,
      userID: user.id,
      reason: reason,
    });

    newWarn
      .save()
      .then(async (doc) => {
        user!
          .send({
            embeds: [
              await RtextEmbed(
                `${emoji.warning} | You've got a warn in **${
                  message.guild?.name || "Failed to fetch guild name"
                }** for ` +
                  "`" +
                  `${reason}` +
                  "`."
              ),
            ],
          })
          .then(() => {
            return textEmbed(
              message,
              `${emoji.warning} | \`#${doc.warnID}\` ${user} has been warned successfully.`
            );
          })
          .catch((e) => {
            if (e.code === 50007) {
              return textEmbed(
                message,
                `${emoji.warning} | \`#${doc.warnID}\` ${user} has been warned but i couldn't DM him the warn.`
              );
            }
          });
      })
      .catch((e) => {
        textEmbed(
          message,
          `${emoji.error} | An unexpected error occured, please try again.`
        );

        return console.log("error insert warn", e);
      });
  },
  cooldown: 10,
  aliases: [],
  permissions: [PermissionFlagsBits.KickMembers],
};

export default command;
