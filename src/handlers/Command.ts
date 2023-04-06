import { Client, SlashCommandBuilder } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import { Command } from "../types";

module.exports = (client: Client) => {
  const slashCommands: SlashCommandBuilder[] = [];
  const commands: Command[] = [];

  let commandsDir = join(__dirname, "../commands");

  readdirSync(commandsDir).forEach((file) => {
    if (!file.endsWith(".js") && !file.endsWith(".ts")) return;
    let command: Command = require(`${commandsDir}/${file}`).default;
    commands.push(command);
    client.commands.set(command.name, command);
  });
};
