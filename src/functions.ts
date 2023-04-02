import {
  ButtonStyles,
  ButtonTypes,
  pagination,
} from "@devraelfreeze/discordjs-pagination";
import {
  Client,
  Collection,
  Embed,
  EmbedBuilder,
  Guild,
  GuildMember,
  Message,
  PermissionFlagsBits,
  PermissionResolvable,
  TextChannel,
} from "discord.js";
import mongoose from "mongoose";
import { default as GuildDB, default as GuildModel } from "./schemas/Guild";
import { GuildOption } from "./types";
type colorType = "text" | "variable" | "error";

const themeColors = {
  text: "#ff8e4d",
  variable: "#ff624d",
  error: "#f5426c",
};

export const getThemeColor = (color: colorType) =>
  Number(`0x${themeColors[color].substring(1)}`);

export const color = (color: colorType, message: any) => {
  return message;
};

export const checkPermissions = (
  member: GuildMember,
  permissions: Array<PermissionResolvable>
) => {
  let neededPermissions: PermissionResolvable[] = [];
  permissions.forEach((permission) => {
    if (!member.permissions.has(permission)) neededPermissions.push(permission);
  });
  if (neededPermissions.length === 0) return null;
  return neededPermissions.map((p) => {
    if (typeof p === "string") return p.split(/(?=[A-Z])/).join(" ");
    else
      return Object.keys(PermissionFlagsBits)
        .find((k) => Object(PermissionFlagsBits)[k] === p)
        ?.split(/(?=[A-Z])/)
        .join(" ");
  });
};

export const sendTimedMessage = (
  message: string,
  channel: TextChannel,
  duration: number
) => {
  channel
    .send(message)
    .then((m) =>
      setTimeout(
        async () => (await channel.messages.fetch(m)).delete(),
        duration
      )
    );
  return;
};

export const getGuildRole = async (guild: Guild, role: string) => {
  let fetchedRole =
    (await guild.roles.fetch(role, { force: true })) ||
    guild.roles.cache.filter(
      (r) => r.name.toLocaleLowerCase() === role.toLocaleLowerCase()
    );

  if (
    !fetchedRole ||
    (fetchedRole instanceof Collection && fetchedRole.size === 0)
  )
    return null;

  return fetchedRole;
};

export const getGuildOption = async (guild: Guild, option: GuildOption) => {
  if (mongoose.connection.readyState === 0)
    throw new Error("Database not connected.");
  let foundGuild = await GuildDB.findOne({ guildID: guild.id });
  if (!foundGuild) return null;
  return foundGuild.options[option];
};

export const genId = (length: number): string => {
  let result = "";
  let characters = "0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export const setGuildOption = async (
  guild: Guild,
  option: GuildOption,
  value: any
) => {
  if (mongoose.connection.readyState === 0)
    throw new Error("Database not connected.");
  let foundGuild = await GuildDB.findOne({ guildID: guild.id });
  if (!foundGuild) return null;
  foundGuild.options[option] = value;
  return foundGuild.save();
};

export const protectionCheck = async (
  guild: Guild,
  user: GuildMember
): Promise<boolean> => {
  let guildData = await GuildModel.findOne({ guildID: guild.id });
  if (!guildData || !guildData.protected || guildData.protected.length <= 0)
    return false;

  return guildData.protected.includes(user.id);
};

export const sendPagination = async (message: any, embeds: EmbedBuilder[]) => {
  return await pagination({
    message: message,
    embeds: embeds as unknown as Embed[],
    author: message.member!.user,
    time: 60 * 1000,
    fastSkip: true,
    disableButtons: true,
    pageTravel: false,
    customFilter: (btn) => {
      return (
        (btn.member?.user.id === message.member?.id || false) &&
        (btn.channelId === message.channel.id || false)
      );
    },
    buttons: [
      {
        type: ButtonTypes.previous,
        style: ButtonStyles.Success,
        emoji: "◀️",
      },
      {
        type: ButtonTypes.next,
        style: ButtonStyles.Success,
        emoji: "▶️", // Disable emoji for this button
      },
      {
        type: ButtonTypes.last,
        style: ButtonStyles.Success,
        emoji: "⏩", // Disable emoji for this button
      },
      {
        type: ButtonTypes.first,
        style: ButtonStyles.Success,
        emoji: "⏪", // Disable emoji for this button
      },
    ],
  });
};

export const hasPermission = async (
  client: Client,
  member: GuildMember,
  permission: string
): Promise<boolean> => {
  const cacheKey = `permissions:member:${member.id}:${member.guild.id}`;
  const cached = await client.redisCache.get(cacheKey);
  if (cached && JSON.parse(cached).includes(permission)) {
    return true;
  }

  const guild = await GuildModel.findOne({ guildID: member.guild.id });
  if (!guild) {
    return false;
  }

  const roles = guild.rolePermissions
    .filter((r) => member.roles.cache.has(r.roleId))
    .map((r) => r.permissions)
    .flat();

  const userPermissions = guild.userPermissions.find(
    (p) => p.userId === member.id
  );
  if (!userPermissions) {
    return false;
  }

  const allPermissions = [...roles, ...userPermissions.permissions];
  if (allPermissions.includes(permission)) {
    client.redisCache.set(cacheKey, JSON.stringify(allPermissions));
    return true;
  }

  return false;
};
