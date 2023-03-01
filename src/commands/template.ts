import { PermissionFlagsBits } from "discord.js";
import { Command } from "../types";
import ms from "enhanced-ms";
import SanctionModel from "../schemas/Sanction";

const command: Command = {
  name: "sdfsdfdsfsd",
  execute: async (client, message, args) => {},
  cooldown: 10,
  aliases: [],
  permissions: [PermissionFlagsBits.KickMembers],
};

export default command;
