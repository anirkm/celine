import { Client } from "discord.js";
import { BotEvent } from "../types";
import { color } from "../functions";

const event: BotEvent = {
  name: "ready",
  once: true,
  execute: async (client: Client) => {
    console.log(
      color("text", `💪 Logged in as ${color("variable", client.user?.tag)}`)
    );

    await require("../utils/Redis")(client);
  },
};

export default event;
