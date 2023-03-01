import { IGuildMember } from "../types";

export const logJoin = async (GuildMember: IGuildMember) => {
  await GuildMember.updateOne({
    $addToSet: { joins: { timestamp: new Date().getTime(), invitedBy: "idk" } },
  }).catch((e) => {
    console.log("couldnt save new join", e);
  });
};
