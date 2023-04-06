import { Client } from "discord.js";
import { color } from "../functions";
import { BotEvent } from "../types";

const event: BotEvent = {
  name: "ready",
  once: true,
  execute: async (client: Client) => {
    console.log(
      color("text", `💪 Logged in as ${color("variable", client.user?.tag)}`)
    );
    client.user?.setPresence({ status: "dnd" });

  },
};

export default event;
