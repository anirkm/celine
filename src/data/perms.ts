const permissions = [
  {
    default: true,
    cmd: "ban",
    permission: "use_ban",
    permFor: ["ban", "unban", "tempbans"],
  },
  {
    default: true,
    cmd: "mute",
    permission: "use_mute",
    permFor: ["mute", "unmute", "mutes"],
  },
  {
    default: false,
    cmd: "jail",
    permission: "use_jail",
    permFor: ["jail", "jails"],
  },
  {
    default: false,
    cmd: "warn",
    permission: "use_warn",
    permFor: ["warn", "warns"],
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
    permFor: ["temprole", "temproles"],
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
    cmd: "modwarns",
    permission: "show_modwarns",
    permFor: ["modwarns"],
  },
  {
    default: false,
    cmd: "activeinvites",
    permission: "show_activeinvites",
    permFor: ["activeinvites"],
  },
  {
    default: false,
    cmd: "joins",
    permission: "show_joins",
    permFor: ["joins"],
  },
  {
    default: false,
    cmd: "clear",
    permission: "use_clear",
    permFor: ["clear"],
  },
];

export default permissions;
