module.exports = {
  apps: [
    {
      name: "moph-notify-aranhos",

      script: "npm",

      args: "start",

      cwd: "/home/golfsilly/moph-notify-aranhos",

      env: {
        NODE_ENV: "production",
      },

      watch: false,

      instances:1,

      autorestart: true,

      max_memory_restart: "500M",

      time: true,
    },
  ],
};