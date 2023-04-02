import {
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  Message,
  PermissionFlagsBits,
  Role,
} from "discord.js";
import { CollectorUtils } from "discord.js-collector-utils";
import ms from "enhanced-ms";
import emoji from "../data/emojies.json";
import { hasPermission } from "../functions";
import GuildModel from "../schemas/Guild";
import SanctionModel from "../schemas/Sanction";
import { Command } from "../types";
import { missingArgs, RtextEmbed, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "jail",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "use_jail")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let argsEmbed = await missingArgs(
      message,
      "jail",
      `${message.member} (duration) (reason)`,
      [
        `${message.member}`,
        `${message.member} reason`,
        `${message.member} 10d`,
        `${message.member} 1337d reason`,
        `remove ${message.member}`,
        `restore ${message.member}`,
      ]
    );

    if (!args[1]) {
      message.reply({ embeds: [argsEmbed] });
      return;
    }

    if (args[1].toLocaleLowerCase() === "restore") {
      let success = 0;
      let failed = 0;
      if (!args[2]) {
        return textEmbed(
          message,
          `${emoji.error} | You haven't specified any user.`
        );
      }
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
      let resotredRoles = await client.redis
        .lrange(`jr_${message.guild?.id}_${user.id}`, 0, -1)
        .catch(() => {});
      if (!resotredRoles || resotredRoles.length == 0)
        return textEmbed(
          message,
          `${emoji.error} | All roles have been previously restored.`
        );

      let msg = await message.reply({
        embeds: [
          await RtextEmbed(
            `${emoji.loading} | **Wait while restoring ${resotredRoles.length} of ${user} roles...** (${success}/${resotredRoles.length} - ${failed} failed)`
          ),
        ],
      });
      let restoreRole = async () => {
        return Promise.all(
          resotredRoles!.map(async (role) => {
            await user!.roles
              .add(role, `Jail restore roles`)
              .then(async () => {
                success++;
                await msg.edit({
                  embeds: [
                    await RtextEmbed(
                      `${emoji.loading} | Wait while restoring ${resotredRoles?.length} of ${user} roles... (${success}/${resotredRoles?.length} - ${failed} failed)`
                    ),
                  ],
                  components: [],
                });
              })
              .catch(async () => {
                failed++;
                await msg.edit({
                  embeds: [
                    await RtextEmbed(
                      `${emoji.loading} | Wait while restoring ${resotredRoles?.length} of ${user} roles... (${success}/${resotredRoles?.length} - ${failed} failed)`
                    ),
                  ],
                  components: [],
                });
              });
          })
        );
      };

      await restoreRole().then(async () => {
        await client.redis
          .del(`jr_${message.guild?.id}_${user?.id}`)
          .catch(() => {});
        msg.edit({
          embeds: [
            await RtextEmbed(
              `${emoji.approve} | ${success}/${
                resotredRoles!.length
              } roles has been restored while ${failed} have failed.`
            ),
          ],
          components: [],
        });
      });

      return;
    }

    if (["remove", "delete"].includes(args[1].toLocaleLowerCase())) {
      if (!args[2]) {
        return textEmbed(
          message,
          `${emoji.error} | You haven't specified any user.`
        );
      }
      let user =
        message.mentions.members?.first() ||
        (await message.guild?.members
          .fetch({ user: args[2], force: false, cache: true })
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

      let jailRole = await message.guild?.roles.fetch(guild.options.jailRole, {
        cache: true,
      });

      if (!jailRole)
        return textEmbed(
          message,
          `${emoji.error} | Jail role for this guild is invalid setup. run __&cfg jailrole__.`
        );

      if (!user.roles.cache.has(jailRole.id))
        return textEmbed(
          message,
          `${emoji.huh} | ${user} isn't currently jailed.`
        );

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
                        `${emoji.yay} | ${user} **jail has been successfully removed**.`
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
                  let failed = 0;

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
                        await user!.roles
                          .add(role, `Jail restore roles`)
                          .then(async () => {
                            success++;
                            console.log(success);
                            await collectorPrompt.edit({
                              embeds: [
                                await RtextEmbed(
                                  `${emoji.loading} | Wait while restoring ${resotredRoles?.length} of ${user} roles... (${success}/${resotredRoles?.length} - ${failed} failed)`
                                ),
                              ],
                              components: [],
                            });
                          })
                          .catch(async () => {
                            failed++;
                            await collectorPrompt.edit({
                              embeds: [
                                await RtextEmbed(
                                  `${emoji.loading} | Wait while restoring ${resotredRoles?.length} of ${user} roles... (${success}/${resotredRoles?.length} - ${failed} failed)`
                                ),
                              ],
                              components: [],
                            });
                          });
                      })
                    );
                  };

                  await restoreRole().then(async () => {
                    await client.redis
                      .del(`jr_${message.guild?.id}_${user?.id}`)
                      .catch(() => {});
                    collectorPrompt.edit({
                      embeds: [
                        await RtextEmbed(
                          `${emoji.approve} | ${success}/${
                            resotredRoles!.length
                          } roles have been restored while ${failed} have failed.`
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
                  `${emoji.yay} | ${user} **jail has been successfully removed**.`
                ),
              ],
            });
          }

          if (user) {
            await user
              .send({
                embeds: [
                  await RtextEmbed(
                    `${emoji.sherta} | Your jail has expired in **${
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
              textEmbed(
                message,
                `${emoji.error} | The user you've specified is invalid, try again.`
              );
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
        .fetch({ user: args[1], cache: true })
        .catch(() => {}));

    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you've specified was not found.`
      );

    let reason: String = "no reason specified";
    let duration: String = "lifetime";
    let jailRole: Role | undefined | null;

    if (args.length >= 4 && ms(args[2]) !== null) {
      if (ms(args[2]) < ms("1s") || ms(args[2]) > ms("1y")) {
        return textEmbed(
          message,
          `${emoji.error} | The duration should be between 10 minutes and 1 year.`
        );
      }
    }

    if (args.length >= 4 && ms(args[2]) !== null) {
      reason = args.slice(3).join(" ");
      duration = ms(args[2]);
    } else if (args.length >= 4 && ms(args[2]) === null) {
      reason = args.slice(2).join(" ");
      duration = "lifetime";
    }

    if (
      args.length === 3 &&
      ms(args[2]) !== null &&
      ms(args[2]) >= ms("10m") &&
      ms(args[2]) <= ms("1y")
    ) {
      console.log("d");
      duration = ms(args[2]);
      reason = "no reason specified";
    } else if (args.length === 3 && ms(args[2]) == null) {
      reason = args[2];
    }

    if (args.length === 2) {
      duration = "lifetime";
      reason = "no reason specified";
    }

    if (reason.trim().length == 0) reason = "no reason specified";

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
      return textEmbed(
        message,
        `${emoji.huh} | ${user} has already an active jail sanction.`
      );
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

    let msg = await textEmbed(
      message,
      `${emoji.loading} | Wait while saving current ${user} roles...`
    );

    const userMember = user!;
    const clientMember = await message.guild!.members.fetch({
      user: client.user!.id,
      cache: true,
      force: false,
    });
    const jailRoleID = jailRole!.id;

    const userRoles = userMember.roles.cache.filter((role) => {
      return (
        !role.permissions.any([
          PermissionFlagsBits.BanMembers,
          PermissionFlagsBits.KickMembers,
          PermissionFlagsBits.Administrator,
          PermissionFlagsBits.ManageGuild,
          PermissionFlagsBits.ManageRoles,
        ]) &&
        role.id !== jailRoleID &&
        role !== message.guild?.roles.everyone &&
        !role.managed &&
        !role.tags?.premiumSubscriberRole &&
        role.position < clientMember.roles.highest.position
      );
    });

    const remainingRoleIDs = userMember.roles.cache
      .filter((role) => !userRoles.has(role.id))
      .map((role) => role.id);

    console.log(remainingRoleIDs);

    await user.roles.set(remainingRoleIDs);

    user.roles
      .add(jailRole, `${message.member?.user.tag} - ${reason}`)
      .then(async (user) => {
        if (userRoles && Array.from(userRoles.keys()).length !== 0) {
          await client.redis
            .del(`jr_${message.guild?.id}_${user.id}`)
            .catch(() => {});
          client.redis
            .lpush(
              `jr_${message.guild?.id}_${user.id}`,
              ...Array.from(userRoles.keys())
            )
            .catch((e) => {
              console.log("couldnt save roles jail", e);
            });
        }

        msg.edit({
          embeds: [
            await RtextEmbed(
              `${emoji.jailed} | **${user} has been jailed${
                duration !== "lifetime" && duration
                  ? ` during the next ${ms(Number(duration), {
                      roundUp: true,
                    })}.`
                  : " permanently."
              }**`
            ),
          ],
        });

        if (user) {
          let notifEm = new EmbedBuilder()
            .setAuthor({
              name: message.guild!.name,
              iconURL:
                message.guild?.iconURL() ||
                "https://cdn.discordapp.com/avatars/490667823392096268/7ccc56164f0adcde7fe00ef4384785ee.png?size=1024",
            })
            .setDescription(
              [
                "**You have been jailed from this guild.**\n",
                `__Reason__ :: ${reason}`,
                `__Duration__ :: ${
                  duration !== "lifetime" && duration
                    ? `${ms(Number(duration), {
                        roundUp: true,
                      })}.`
                    : "permanent."
                }`,
              ].join("\n")
            )
            .setTimestamp()
            .setFooter({
              text: user.user.tag,
              iconURL:
                user.user.avatarURL() ||
                "https://cdn.discordapp.com/avatars/490667823392096268/7ccc56164f0adcde7fe00ef4384785ee.png?size=1024",
            });

          user
            .send({
              embeds: [notifEm],
            })
            .catch(() => {});
        }

        console.log(duration, reason);

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
            textEmbed(
              message,
              `${emoji.error} | The user you've specified is invalid, try again.`
            );
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
