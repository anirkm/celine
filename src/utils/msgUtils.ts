import {
  Client,
  Embed,
  EmbedBuilder,
  Guild,
  GuildMember,
  Message,
} from "discord.js";

export const textEmbed = async (
  message: Message,
  data: string,
  reply = true,
) => {
  let embed = {
    color: 10031625,
    description: `**${data.replace("|", "»")}**`,
  };

  return reply
    ? await message.reply({ embeds: [embed as Embed] })
    : await message.channel.send({ embeds: [embed as Embed] });
};

export const RtextEmbed = async (data: string) => {
  let embed = new EmbedBuilder()
    .setColor(10031625)
    .setDescription(data.replace("|", "»"));
  return embed;
};

export const missingArgs = async (
  message: Message,
  cmdName: string,
  syntax: string,
  examples: string[],
) => {
  let embed = new EmbedBuilder()
    .setColor(10031625)
    .setTitle(`Command :: __&${cmdName}__`)
    .setDescription(
      [
        "**How to use** ::",
        `&${cmdName} ${syntax}\n`,
        "**Examples** ::",
        ...examples.map((s) => `&${cmdName} ` + s),
        "\n\n",
      ].join("\n"),
    )
    .setFooter({ text: `Executed by ${message.member?.user.tag}` })
    .setTimestamp();

  return embed;
};

export const countMsg = (client: Client, guild: Guild, user: GuildMember) => {
  client.redis.incr(`msgcount_${guild.id}_${user.id}`).catch(() => {});
};

export const setLastMsgTimestamp = (
  client: Client,
  guild: Guild,
  user: GuildMember,
) => {
  client.redis
    .set(`lastmsg_${guild.id}_${user.id}`, Date.now().toString())
    .catch(() => {});
};
