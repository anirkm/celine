import {
  Embed,
  EmbedBuilder,
  Message,
  Client,
  Guild,
  GuildMember,
} from "discord.js";

export const textEmbed = async (
  message: Message,
  data: string,
  reply = true
) => {
  let embed = {
    color: 10181046,
    description: `**${data}**`,
  };

  return reply
    ? await message.reply({ embeds: [embed as Embed] })
    : await message.channel.send({ embeds: [embed as Embed] });
};

export const RtextEmbed = async (data: string) => {
  let embed = new EmbedBuilder().setColor("Purple").setDescription(data);
  return embed;
};

export const missingArgs = async (
  message: Message,
  cmdName: string,
  syntax: string,
  examples: string[]
) => {
  let embed = new EmbedBuilder()
    .setColor("Purple")
    .setAuthor({
      name: `Missing arguments !`,
      iconURL:
        message.member?.avatarURL({ size: 4096 }) ||
        "https://cdn.discordapp.com/embed/avatars/5.png",
    })
    .setTitle(`Command :: __&${cmdName}__`)
    .setDescription(
      [
        "**How to use** ::",
        `&${cmdName} ${syntax}\n`,
        "**Examples** ::",
        ...examples.map((s) => `&${cmdName} ` + s),
        "\n\n",
      ].join("\n")
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
  user: GuildMember
) => {
  client.redis
    .set(`lastmsg_${guild.id}_${user.id}`, Date.now().toString())
    .catch(() => {});
};
