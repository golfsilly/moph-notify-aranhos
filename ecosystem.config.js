module.exports = {
  apps: [
    {
      name: "moph-notify-aranhos",
      script: "./.next/standalone/server.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 50000,
      },
      watch: false,
      instances:1,
      autorestart: true,
      max_memory_restart: "500M",
      time: true,
    },
  ],
};
