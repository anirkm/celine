import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import emoji from "../data/emojies.json";
import { sendPagination } from "../functions";
import { Command } from "../types";
import { missingArgs, RtextEmbed, textEmbed } from "../utils/msgUtils";
import { hasPermission } from "../functions";

const command: Command = {
  name: "activeinvites",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "show_activeinvites")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let argsEmbed = await missingArgs(
      message,
      "activeinvites",
      `${message.member}`,
      [`${message.member}`, `${message.member} ${message.channel}`]
    );

    if (!args[1] && !message.author.id) {
      return message.reply({ embeds: [argsEmbed] });
    }

    switch (args[1]) {
      case "list":
        let msg = await textEmbed(
          message,
          `${emoji.loading} | Please wait while i'am fetching guild invites..`
        );

        let user =
          message.mentions.members?.first() ||
          (await client.users
            .fetch(args[2] || message.author.id, { force: true })
            .catch(() => {}));

        let targetChan = message.guild?.channels.cache.get(args[3]);

        if (await message.guild?.channels.fetch(args[2]).catch(() => {})) {
          user = await message.guild?.members
            .fetch({ user: message.author.id, force: true })
            .catch(() => {});

          targetChan = message.guild?.channels.cache.get(args[2]);
        }

        await message.guild?.invites
          .fetch()
          .then(async (invites) => {
            let userInvites = invites.filter((invite) => {
              if (invite.inviter) {
                return invite.inviter.id === user!.id;
              } else {
                return false;
              }
            });

            if (targetChan) {
              userInvites = userInvites.filter(
                (invite) => invite.channel?.id === targetChan!.id
              );
            }

            if (userInvites.size === 0)
              return msg.edit({
                embeds: [
                  await RtextEmbed(
                    `${
                      emoji.error
                    } | ** ${user} doesn't have any active invites ${
                      targetChan ? `in ${targetChan}.` : "."
                    } **`
                  ),
                ],
              });

            totalInvites = userInvites.size;

            let invitesArray = Array.from(userInvites.values());

            let dataPerPage = 7;
            let totalEmbeds = Math.ceil(invitesArray.length / dataPerPage);
            let i = 0;
            let embeds: EmbedBuilder[] = [];
            for (let j = 0; j < totalEmbeds; j++) {
              let desc: string[] = [
                `${emoji.invite} | ${user} have ${invitesArray.length} active invites\n`,
              ];

              let embed = new EmbedBuilder()
                .setAuthor({
                  name: `${message.guild?.name || "Unknown"} invites`,
                  iconURL:
                    message.guild?.iconURL({ size: 4096 }) ||
                    "https://cdn.discordapp.com/embed/avatars/5.png",
                })
                .setFooter({
                  text: `Requested by ${message.author.tag}`,
                  iconURL:
                    message.author.displayAvatarURL({ size: 4096 }) ||
                    "https://cdn.discordapp.com/embed/avatars/5.png",
                });

              for (let k = 0; k < dataPerPage; k++) {
                if (invitesArray[i + k]) {
                  desc.push(
                    [
                      `Invite code: \`${invitesArray[i + k].code}\` uses ${
                        invitesArray[i + k].uses
                      }`,
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
          })
          .catch(async (e) => {
            console.log("fetching invites", e);
            return msg.edit({
              embeds: [
                await RtextEmbed(
                  `${emoji.error} | ** An error occured while fetching Guild Invites, try again**`
                ),
              ],
            });
          });
        return;
      default:
        break;
    }

    let user =
      message.mentions.members?.first() ||
      (await message.guild?.members
        .fetch({ user: args[1] || message.author.id, force: true })
        .catch(() => {}));

    let targetChan = message.guild?.channels.cache.get(args[2]);

    if (await message.guild?.channels.fetch(args[1]).catch(() => {})) {
      user = await message.guild?.members
        .fetch({ user: message.author.id, force: true })
        .catch(() => {});

      targetChan = message.guild?.channels.cache.get(args[1]);
    }

    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you've specified was not found`
      );

    let msg = await textEmbed(
      message,
      `${emoji.loading} | Please wait while i'am fetching guild invites..`
    );

    let totalInvites = 0;
    let totalUsersInvited = 0;
    let maxInvite = "";
    let maxInviteCount = 0;

    await message.guild?.invites
      .fetch()
      .then(async (invites) => {
        let userInvites = invites.filter((invite) => {
          if (invite.inviter) {
            return invite.inviter.id === user!.id;
          } else {
            return false;
          }
        });

        if (targetChan) {
          userInvites = userInvites.filter(
            (invite) => invite.channel?.id === targetChan!.id
          );
        }

        if (userInvites.size === 0)
          return msg.edit({
            embeds: [
              await RtextEmbed(
                `${emoji.error} | ** ${user} doesn't have any active invites ${
                  targetChan ? `in ${targetChan}.` : "."
                } **`
              ),
            ],
          });

        totalInvites = userInvites.size;

        for await (const [k, v] of userInvites) {
          totalUsersInvited = totalUsersInvited + (v.uses || 0);
          if ((v.uses || 0) > maxInviteCount) {
            maxInviteCount = v.uses || 0;
            maxInvite = k;
          }
        }

        return msg.edit({
          embeds: [
            await RtextEmbed(
              `${
                emoji.invite
              } | **${user} has  ${totalInvites} active invites ${
                targetChan ? `in ${targetChan},` : ""
              } and were used for a total ${totalUsersInvited} uses ${
                maxInvite.length > 0
                  ? `with ${maxInvite} being the most used one with ${maxInviteCount} uses`
                  : ""
              }**`
            ),
          ],
        });
      })
      .catch(async (e) => {
        console.log("fetching invites", e);
        return msg.edit({
          embeds: [
            await RtextEmbed(
              `${emoji.error} | ** An error occured while fetching Guild Invites, try again**`
            ),
          ],
        });
      });
  },
  cooldown: 10,
  aliases: ["aci", "ainvites"],
  permissions: [PermissionFlagsBits.KickMembers],
};

export default command;
