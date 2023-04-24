import { Message, PermissionFlagsBits, TextChannel } from "discord.js";
import emoji from "../data/emojies.json";
import { hasPermission } from "../functions";
import { Command } from "../types";
import { missingArgs, RtextEmbed, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "clear",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "use_clear")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let argsEmbed = await missingArgs(message, "clear", " (amount)", [
      " 69",
      `69 ${message.member}`,
    ]);

    if (!args[1]) {
      return message.reply({ embeds: [argsEmbed] });
    }

    if (isNaN(Number(args[1]))) {
      return textEmbed(
        message,
        `${emoji.wyd} | Amount must be a numerical value.`
      );
    }

    if (Number(args[1]) > 69) {
      return textEmbed(
        message,
        `${emoji.wyd} | Amount should have a max value of 69 messages.`
      );
    }

    if (Number(args[1]) <= 0) {
      return textEmbed(
        message,
        `${emoji.wyd} | Amount should have a min value of 1 messages.`
      );
    }

    let amount = Number(args[1]);

    let msg = await textEmbed(
      message,
      `${emoji.loading} | Fetching ${amount} messages, please wait.`
    );

    let currChan = <TextChannel>message.channel;
    const messages = await currChan.messages
      .fetch({
        limit: amount + 2,
        cache: true,
      })
      .catch(async (e) => {
        console.log(e);
        msg.edit({
          embeds: [
            await RtextEmbed(
              `${emoji.error} | Failed to fetch messages, please try again.`
            ),
          ],
        });
        return;
      });

    if (!messages || messages.size === 0) {
      return textEmbed(
        message,
        `${emoji.wyd} | There is nothing to fetch && delete.`
      );
    }

    if (args[2] && messages) {
      let user =
        message.mentions.parsedUsers.first() ||
        (await message.guild?.members
          .fetch({ user: args[2], force: true })
          .catch(() => {}));

      if (!user)
        return textEmbed(
          message,
          `${emoji.error} | The user you've specified was not found.`
        );

      let i = 0;
      let filtered: Array<Message> = [];

      console.log(amount);

      await Promise.all(
        messages.map((msg) => {
          if (msg.author.id === user!.id && amount > i) {
            filtered.push(msg);
            i++;
          }
        })
      );

      if (!filtered || filtered.length === 0) {
        return textEmbed(
          message,
          `${emoji.wyd} | There is nothing to fetch && delete.`
        );
      }

      return await currChan
        .bulkDelete(filtered, true)
        .then(async (messages) => {
          return msg.content
            ? msg
                .edit({
                  embeds: [
                    await RtextEmbed(
                      `${emoji.yay} | Successfully deleted **${messages.size}** messages from ${user}`
                    ),
                  ],
                })
                .then((m) => setTimeout(() => m.delete().catch(() => {}), 3000))
            : textEmbed(
                message,
                `${emoji.yay} | Successfully deleted **${messages.size}** messages from ${user}`,
                false
              ).then((m) => setTimeout(() => m.delete().catch(() => {}), 3000));
        })
        .catch(async (e) => {
          console.log(e);
          return msg.content
            ? msg
                .edit({
                  embeds: [
                    await RtextEmbed(
                      `${emoji.yay} | Failed to delete **${messages.size}** messages from ${user}`
                    ),
                  ],
                })
                .then((m) => setTimeout(() => m.delete().catch(() => {}), 5000))
            : textEmbed(
                message,
                `${emoji.yay} | Failed to deleted **${messages.size}** messages from ${user}`,
                false
              );
        });
    }

    console.log(messages.size);

    return await currChan
      .bulkDelete(messages, true)
      .then(async (messages) => {
        return msg.content
          ? msg
              .edit({
                embeds: [
                  await RtextEmbed(
                    `${emoji.yay} | Successfully deleted **${messages.size}** messages.`
                  ),
                ],
              })
              .then((m) => setTimeout(() => m.delete().catch(() => {}), 3000))
          : textEmbed(
              message,
              `${emoji.yay} | Successfully deleted **${messages.size}** messages.`,
              false
            ).then((m) => setTimeout(() => m.delete().catch(() => {}), 3000));
      })
      .catch(async (e) => {
        console.log("normal err");
        console.log(e);
        return msg.content
          ? msg.edit({
              embeds: [
                await RtextEmbed(
                  `${emoji.yay} | Failed to deleted **${messages.size}** messages.`
                ),
              ],
            })
          : textEmbed(
              message,
              `${emoji.yay} | Failed to deleted **${messages.size}** messages.`,
              false
            );
      });
  },
  cooldown: 10,
  aliases: [],
  permissions: [PermissionFlagsBits.KickMembers],
};

export default command;
