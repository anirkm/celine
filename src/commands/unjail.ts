import {
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  Message,
  PermissionFlagsBits,
} from "discord.js";
import { CollectorUtils } from "discord.js-collector-utils";
import emoji from "../data/emojies.json";
import { hasPermission } from "../functions";
import GuildModel from "../schemas/Guild";
import { Command } from "../types";
import { RtextEmbed, missingArgs, textEmbed } from "../utils/msgUtils";
const command: Command = {
  name: "unjail",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "use_jail")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return;
    }

    let argsEmbed = await missingArgs(message, "unjail", "(user) (reason)", [
      `${message.member}`,
      `${message.member} reason`,
    ]);

    if (!args[1]) {
      message.reply({ embeds: [argsEmbed] });
      return;
    }

    const reason = args[2] || "no reason specified";

    let user = await message.guild?.members
      .fetch({
        user: message.mentions.parsedUsers.first() || args[1],
        cache: true,
      })
      .catch(() => {});
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
      .remove(jailRole, `${message.member?.user.tag} - &unjail ${reason}}`)
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
                        .add(role, "Jail restore roles")
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
                  client.redis
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

        client.persistanceRedis
          .del(`jail_${message.guild?.id}_${user?.id}`)
          .catch(() => {});

        client.redis
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
  },
  cooldown: 10,
  aliases: [],
  permissions: [],
};

export default command;
