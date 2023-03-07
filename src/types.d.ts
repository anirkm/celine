import {
  AutocompleteInteraction,
  Client,
  Collection,
  CommandInteraction,
  Message,
  PermissionResolvable,
  SlashCommandBuilder,
} from "discord.js";
import { Redis } from "ioredis";
import mongoose, { Mongoose } from "mongoose";
import { Queue } from "bullmq";

export interface SlashCommand {
  command: SlashCommandBuilder | any;
  execute: (interaction: CommandInteraction) => void;
  autocomplete?: (interaction: AutocompleteInteraction) => void;
  cooldown?: number; // in seconds
}

export interface Command {
  name: string;
  execute: (client: Client, message: Message, args: Array<string>) => void;
  permissions: Array<PermissionResolvable>;
  aliases: Array<string>;
  flags?: string[];
  cooldown?: number;
}

interface GuildOptions {
  prefix: string;
  muteRole: string;
  jailRole: string;
}

interface UserPermissions {
  userId: string;
  permissions: Array<string>;
}

interface RolePermissions {
  roleId: string;
  permissions: Array<string>;
}

export interface IGuild extends mongoose.Document {
  guildID: string;
  options: GuildOptions;
  protected: Array<string>;
  userPermissions: Array<UserPermissions>;
  rolePermissions: Array<RolePermissions>;
  rolePersist: Array<string>;
}

export interface ISanction extends mongoose.Document {
  guildID: string;
  modID: string;
  userID: string;
  type: string;
  reason: string;
  duration?: string;
  startAt: Date;
}

export interface ISanctionQueue extends mongoose.Document {
  guildID: string;
  userID: string;
  type: string;
  endAt: Date;
}

export interface IWarn extends mongoose.Document {
  warnID: string;
  guildID: string;
  modID: string;
  userID: string;
  reason: string;
  startAt: Date;
}

export interface IGuildMember extends mongoose.Document {
  userID: string;
  guildID: string;
  permissions: string[];
}

export interface IGuildJoin extends mongoose.Document {
  guildId: string;
  userId: string;
  timestamp: number;
  type: string;
  inviteId?: string;
  invitedBy?: string;
}

export type GuildOption = keyof GuildOptions;
export interface BotEvent {
  name: string;
  once?: boolean | false;
  execute: (client: Client, ...args) => void;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TOKEN: string;
      CLIENT_ID: string;
      PREFIX: string;
      MONGO_URI: string;
      MONGO_DATABASE_NAME: string;
      REDIS_HOST: string;
      REDIS_PW: string;
    }
  }
}

interface ClientQueues {
  [name: string]: Queue;
}

declare module "discord.js" {
  export interface Client {
    slashCommands: Collection<string, SlashCommand>;
    commands: Collection<string, Command>;
    cooldowns: Collection<string, number>;
    timeouts: Collection<string, Array<t>>;
    redis: Redis;
    mongo: Mongoose;
    queues: ClientQueues;
  }
}
