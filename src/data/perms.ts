const permissions = [
  {
    default: true,
    cmd: "ban",
    permission: "use_ban",
    permFor: ["ban", "unban"],
  },
  {
    default: true,
    cmd: "tempbans",
    permission: "show_tempbans",
    permFor: ["tempbans"],
  },
  {
    default: true,
    cmd: "mute",
    permission: "use_mute",
    permFor: ["mute", "unmute"],
  },
  {
    default: true,
    cmd: "mutes",
    permission: "show_mutes",
    permFor: ["mutes"],
  },
  {
    default: false,
    cmd: "jail",
    permission: "use_jail",
    permFor: ["jail"],
  },
  {
    default: false,
    cmd: "jails",
    permission: "show_jails",
    permFor: ["jails"],
  },
  {
    default: false,
    cmd: "warn",
    permission: "use_warn",
    permFor: ["warn"],
  },
  {
    default: false,
    cmd: "alert",
    permission: "use_alert",
    permFor: ["alert"],
  },
  {
    default: false,
    cmd: "timeout",
    permission: "use_timeout",
    permFor: ["timeout"],
  },
  {
    default: false,
    cmd: "temprole",
    permission: "use_temprole",
    permFor: ["temprole"],
  },
  {
    default: false,
    cmd: "temproles",
    permission: "show_temproles",
    permFor: ["temproles"],
  },
  {
    default: false,
    cmd: "history",
    permission: "show_userhistory",
    permFor: ["history"],
  },
  {
    default: false,
    cmd: "modhistory",
    permission: "show_modhistory",
    permFor: ["modhistory"],
  },
  {
    default: false,
    cmd: "warns",
    permission: "show_userwarns",
    permFor: ["warns"],
  },
  {
    default: false,
    cmd: "Modwarns",
    permission: "show_modwarns",
    permFor: ["modwarns"],
  },
];

export default permissions;
