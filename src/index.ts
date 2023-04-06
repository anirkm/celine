import { Client, Collection, GatewayIntentBits } from "discord.js";
import { config } from "dotenv";
import { readdirSync } from "fs";
import { join } from "path";
import { Command, SlashCommand } from "./types";
const {
  Guilds,
  MessageContent,
  GuildMessages,
  GuildMembers,
  GuildVoiceStates,
  GuildInvites,
  GuildModeration,
} = GatewayIntentBits;
const client = new Client({
  intents: [
    Guilds,
    MessageContent,
    GuildMessages,
    GuildMembers,
    GuildVoiceStates,
    GuildInvites,
    GuildModeration,
  ],
});
config();
process.setMaxListeners(0);

client.slashCommands = new Collection<string, SlashCommand>();
client.commands = new Collection<string, Command>();
client.cooldowns = new Collection<string, number>();
client.timeouts = new Collection<string, Array<any>>();

const handlersDir = join(__dirname, "./handlers");
readdirSync(handlersDir).forEach((handler) => {
  require(`${handlersDir}/${handler}`)(client);
});

(async function() {
  await require("./utils/Redis")(client)
  client.login(process.env.TOKEN);
}());

