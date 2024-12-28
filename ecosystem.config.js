module.exports = {
  apps: [{
    name: "employee-checklist",
    script: "app.js",
    watch: true,
    env: {
      "PORT": 5000,
      "NODE_ENV": "production",
      "HOST": "0.0.0.0"
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '1G',
    exp_backoff_restart_delay: 100,
    watch_delay: 1000,
    time: true,
    restart_delay: 4000,
    wait_ready: true,
    kill_timeout: 3000,
    listen_timeout: 3000
  }]
}
