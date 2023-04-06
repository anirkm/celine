import { type Client, type VoiceState } from "discord.js";
import { BotEvent } from "../types";

const event: BotEvent = {
  name: "voiceStateUpdate",
  once: false,
  execute: async (
    client: Client,
    oldState: VoiceState,
    newState: VoiceState
  ) => {
    if (newState.channel && newState.serverMute && oldState.serverMute) {
      const key = `vmex_${newState.guild.id}_${newState.id}`;
      const keyExists = await client.redis.exists(key)
      if (keyExists) {
        client.redis
          .del(key)
          .then(async () => {
            await newState.setMute(false, "&vmute expiration");
          })
          .catch((error) => {
            console.error("Error in deleting key:", error);
          });
      }
    } else if (
      newState.channel &&
      !newState.serverMute &&
      !oldState.serverMute &&
      newState.channelId !== oldState.channelId
    ) {
      const queueKey = `vmutequeue_${newState.guild.id}_${newState.id}`;
      const queueKeyExists = await client.redis.exists(queueKey);
      if (queueKeyExists && newState.channelId) {
        newState
          .setMute(true, "&vmute persist")
          .catch((error) => {
            console.error("Error in setting mute:", error);
          });
      }
    }
  },
};

export default event;
