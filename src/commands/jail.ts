import {
  Embed,
  EmbedBuilder,
  PermissionFlagsBits,
  ComponentType,
  ButtonStyle,
  Message,
  ButtonInteraction,
} from "discord.js";
import { Command } from "../types";
import ms from "enhanced-ms";
import SanctionModel from "../schemas/Sanction";
import GuildModel from "../schemas/Guild";
import { missingArgs } from "../utils/msgUtils";
import emoji from "../data/emojies.json";
import { textEmbed, RtextEmbed } from "../utils/msgUtils";
import { CollectorUtils } from "discord.js-collector-utils";

const command: Command = {
  name: "jail",
  execute: async (client, message, args) => {
    let argsEmbed = await missingArgs(
      message,
      "jail",
      `${message.member} (duration) (reason)`,
      [
        `${message.member}`,
        `${message.member} reason`,
        `${message.member} 1337d reason`,
        `remove ${message.member}`,
      ]
    );

    if (!args[1]) {
      return message.reply({ embeds: [argsEmbed] });
    }

    if (["remove", "delete"].includes(args[1].toLocaleLowerCase())) {
      let user =
        message.mentions.members?.first() ||
        (await message.guild?.members
          .fetch({ user: args[2], force: true })
          .catch(() => {}));
      if (!user)
        return textEmbed(
          message,
          `${emoji.error} | The user you've specified was not found.`
        );

      let guild = await GuildModel.findOne({ guildID: message.guild?.id });

      if (!guild)
        return textEmbed(
          message,
          `${emoji.error} | This guild isn't correctly setup. run __&cfg sg__.`
        );

      if (guild && !guild.options.jailRole)
        return textEmbed(
          message,
          `${emoji.error} | Jail role for this guild isn't correctly setup. run __&cfg jailrole__.`
        );

      let jailRole = await message.guild?.roles.fetch(guild.options.jailRole);

      if (!jailRole)
        return textEmbed(
          message,
          `${emoji.error} | Jail role for this guild is invalid setup. run __&cfg jailrole__.`
        );

      if (!user.roles.cache.has(jailRole.id))
        return textEmbed(message, `${emoji.huh} | ${user} isn't jailed.`);

      return user.roles
        .remove(jailRole, `${message.member?.user.tag} - jail remove`)
        .then(async (user) => {
          let resotredRoles = await client.redis
            .lrange(`jr_${message.guild?.id}_${user.id}`, 0, -1)
            .catch(() => {});

          if (resotredRoles && resotredRoles.length > 0) {
            let collectorPrompt = await message.reply({
              embeds: [
                await RtextEmbed(
                  `${emoji.yay} | ${user} **Jail removed with success**. _Do you want to restore removed roles? (${resotredRoles.length} roles will be restored)_`
                ),
              ],
              components: [
                {
                  type: ComponentType.ActionRow,
                  components: [
                    {
                      type: ComponentType.Button,
                      customId: "approveClearWarn",
                      emoji: `${emoji.approve}`,
                      style: ButtonStyle.Success,
                    },
                  ],
                },
              ],
            });

            let collectorResult = await CollectorUtils.collectByButton(
              collectorPrompt,
              async (buttonInteraction: ButtonInteraction) => {
                switch (buttonInteraction.customId) {
                  case "approveClearWarn":
                    return { intr: buttonInteraction, value: "approveRestore" };
                  default:
                    return;
                }
              },
              {
                time: 10 * 1000,
                reset: false,
                target: message.member?.user,
                stopFilter: (message: Message) =>
                  message.content.toLowerCase() === "stop",
                onExpire: async () => {
                  collectorPrompt.edit({
                    embeds: [
                      await RtextEmbed(
                        `${emoji.yay} | ${user} **Jail removed with success**.`
                      ),
                    ],
                    components: [],
                  });
                },
              }
            );

            if (collectorResult) {
              switch (collectorResult.value) {
                case "approveRestore":
                  let success = 0;

                  collectorPrompt.edit({
                    embeds: [
                      await RtextEmbed(
                        `${emoji.loading} | Wait while we restore ${resotredRoles.length} of ${user} roles... `
                      ),
                    ],
                    components: [],
                  });

                  let restoreRole = async () => {
                    return Promise.all(
                      resotredRoles!.map(async (role) => {
                        await user.roles
                          .add(role, `Jail restore roles`)
                          .then(() => {
                            console.log("success");
                            success++;
                            console.log(success);
                          })
                          .catch(() => {});
                      })
                    );
                  };

                  await restoreRole().then(async () => {
                    collectorPrompt.edit({
                      embeds: [
                        await RtextEmbed(
                          `${
                            emoji.approve
                          } | ${user} Jail removed with success. ${success}/${
                            resotredRoles!.length
                          } roles has been restored.`
                        ),
                      ],
                      components: [],
                    });
                  });

                  break;
                default:
                  break;
              }
            }
          } else {
            await message.reply({
              embeds: [
                await RtextEmbed(
                  `${emoji.yay} | ${user} **Jail removed with success**.`
                ),
              ],
            });
          }

          if (user) {
            await user
              .send({
                embeds: [
                  await RtextEmbed(
                    `${emoji.yay} | Your jail role is now gone in **${
                      message.guild?.name || "Failed to fetch guild name"
                    }**`
                  ),
                ],
              })
              .catch(() => {});
          }

          await client.redis
            .keys(`jailqueue_${message.guild?.id}_${user.id}`)
            .then((keys) => {
              if (keys.length !== 0) {
                client.redis.del(keys).catch((e) => {
                  console.log("del jail keys redis err", e);
                });
              }
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
    }

    let user =
      message.mentions.members?.first() ||
      (await message.guild?.members
        .fetch({ user: args[1], force: true })
        .catch(() => {}));

    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you've specified was not found.`
      );

    let reason: String;
    let duration: String;
    let jailRole;

    args.length === 4
      ? (reason = args.slice(3).join(" "))
      : (reason = args.slice(2).join(" ") || "no reason specified");

    args.length === 4 ? (duration = args[2]) : (duration = "lifetime");

    if (args.length === 4 && ms(args[2]) === null) {
      return textEmbed(
        message,
        `${emoji.error} | The duration you've specified is invalid.`
      );
    }

    if (args.length === 4 && ms(args[2]) !== null) {
      duration = ms(args[2]);
    }

    let guild = await GuildModel.findOne({ guildID: message.guild?.id });

    if (!guild)
      return textEmbed(
        message,
        `${emoji.error} | This guild isn't correctly setup. run __&cfg sf__.`
      );

    if (guild && !guild.options.jailRole)
      return textEmbed(
        message,
        `${emoji.error} | Jail role for this guild isn't correctly setup. run __&cfg jailrole__.`
      );

    jailRole = await message.guild?.roles.fetch(guild.options.jailRole);

    if (!jailRole)
      return textEmbed(
        message,
        `${emoji.error} | Jail role for this guild is invalid setup. run __&cfg jailrole__.`
      );

    if (user.roles.cache.has(jailRole.id)) {
      return textEmbed(message, `${emoji.huh} | ${user} is already jailed.`);
    }

    await client.redis
      .keys(`jailqueue_${message.guild?.id}_${user.id}`)
      .then((keys) => {
        if (keys.length !== 0) {
          client.redis.del(keys).catch((e) => {
            console.log("del jail keys redis err", e);
          });
        }
      });

    let userRoles: string[] = [];

    let msg = await textEmbed(
      message,
      `${emoji.loading} | Wait while saving current ${user} roles...`
    );

    const deleteSaveRoles = async () => {
      return Promise.all(
        user!.roles.cache.map(async (r) => {
          await user!.roles
            .remove(r, `${message.member?.user.tag} - jail`)
            .then(() => {
              userRoles.push(r.id);
            })
            .catch(() => {});
        })
      );
    };

    await deleteSaveRoles();

    user.roles
      .add(jailRole, `${message.member?.user.tag} - ${reason}`)
      .then(async (user) => {
        if (userRoles && userRoles.length !== 0) {
          await client.redis
            .del(`jr_${message.guild?.id}_${user.id}`)
            .catch(() => {});
          client.redis
            .lpush(`jr_${message.guild?.id}_${user.id}`, ...userRoles)
            .catch((e) => {
              console.log("couldnt save roles jail", e);
            });
        }

        msg.edit({
          embeds: [
            await RtextEmbed(
              `${emoji.jailed} | **${user} has been jailed ${
                duration !== "lifetime" && duration
                  ? ` for ${ms(Number(duration), { roundUp: true })}.`
                  : "."
              }**`
            ),
          ],
        });

        if (user) {
          await user
            .send({
              embeds: [
                await RtextEmbed(
                  `${emoji.jailed} | You've been Jailed from **${
                    message.guild?.name || "Failed to fetch guild name"
                  }** - Reason: ` +
                    "`" +
                    `${reason}` +
                    "`" +
                    "- Duration: " +
                    "`" +
                    `${ms(duration) || "Lifetime"}` +
                    "`."
                ),
              ],
            })
            .catch(() => {});
        }

        let newJail = new SanctionModel({
          guildID: message.guild?.id,
          modID: message.member?.id,
          userID: user.id,
          type: "Jail",
          reason: reason,
          startAt: new Date(),
        });

        await newJail
          .save()
          .then(async (doc) => {
            if (duration && duration !== "lifetime" && ms(args[2])) {
              doc["duration"] = args[2];
              doc.save();
              client.redis
                .set(
                  `jailqueue_${message.guild?.id}_${user.id}`,
                  new Date().getTime() + ms(args[2])
                )
                .catch((e) => {
                  console.log("save redis jail queue err", e);
                });
            }
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
