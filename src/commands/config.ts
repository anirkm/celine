import { PermissionFlagsBits, Collection, Role } from "discord.js";
import { Command } from "../types";
import GuildModel from "../schemas/Guild";
import { getGuildRole, setGuildOption } from "../functions";

const command: Command = {
  name: "config",
  execute: async (client, message, args) => {
    if (!args[1])
      return message.reply(":rage: - **&config [query] [...subQuery]**");

    let query: string = args[1].toLocaleLowerCase();

    switch (query) {
      case "sg":
        GuildModel.find(
          { guildID: message.guild?.id },
          async (err: any, doc: any) => {
            if (err) {
              message.reply(
                ":flushed: - **an error occurred while trying to execute this command, try again.**"
              );
              return console.log(err);
            }
            if (doc.length !== 0)
              return message.reply("**Guild already exists.**");
            if (doc.length === 0) {
              let newGuild = new GuildModel({
                guildID: message.guild?.id,
                options: {
                  prefix: process.env.PREFIX,
                },
              });
              await newGuild
                .save()
                .then(() => {
                  message.reply("**Done.**");
                })
                .catch((e) => {
                  message.reply(
                    ":flushed: - **an error occurred while trying to execute this command, try again.**"
                  );
                  console.log(e);
                });
            }
          }
        );
        break;
      case "mutedrole":
        let currMutedRole: Role;
        if (!args[2])
          return message.reply(
            ":rage: - **&config mutedrole [role | roldId | roleName]**"
          );

        let mutedRole =
          message.mentions.roles.first() ||
          (await getGuildRole(message.guild!, args.slice(2).join(" ")));

        if (!mutedRole)
          return message.reply(":triumph: - **unknown role try again**");

        if (mutedRole instanceof Collection && mutedRole.size > 1) {
          return message.reply(
            ":grimacing: - **too many roles with this name choose a Role using it's ID**"
          );
        }

        mutedRole instanceof Collection
          ? (currMutedRole = mutedRole.toJSON()[0])
          : (currMutedRole = mutedRole);

        await setGuildOption(message.guild!, "muteRole", currMutedRole.id)
          .then((guild) => {
            if (guild?.options.muteRole == currMutedRole.id) {
              message.reply(
                `:white_check_mark: - **Muted role has been updated to ${
                  mutedRole instanceof Collection
                    ? `${mutedRole.values().next().value}.**`
                    : `${mutedRole}.**`
                }`
              );
            }
          })
          .catch((err) => {
            console.log(err);
          });
        break;
      case "jailrole":
        let currJailRole: Role;
        if (!args[2])
          return message.reply(
            ":rage: - **&config jailrole [role | roldId | roleName]**"
          );

        let jailRole =
          message.mentions.roles.first() ||
          (await getGuildRole(message.guild!, args.slice(2).join(" ")));

        if (!jailRole)
          return message.reply(":triumph: - **unknown role try again**");

        if (jailRole instanceof Collection && jailRole.size > 1) {
          return message.reply(
            ":grimacing: - **too many roles with this name choose a Role using it's ID**"
          );
        }

        jailRole instanceof Collection
          ? (currJailRole = jailRole.toJSON()[0])
          : (currJailRole = jailRole);

        console.log(currJailRole.id);

        await setGuildOption(message.guild!, "jailRole", currJailRole.id)
          .then((guild) => {
            if (guild?.options.jailRole == currJailRole.id) {
              message.reply(
                `:white_check_mark: - **Jail role has been updated to ${
                  jailRole instanceof Collection
                    ? `${jailRole.values().next().value}.**`
                    : `${jailRole}.**`
                }`
              );
            }
          })
          .catch((err) => {
            console.log(err);
          });

        break;
      default:
        return message.reply(":flushed: - **unknown query, try again.**");
    }
  },
  cooldown: 10,
  aliases: ["cfg"],
  permissions: [PermissionFlagsBits.Administrator],
};

export default command;
