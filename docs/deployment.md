# Deployment

Everything runs on **one EC2 instance**: the API, MySQL, the admin panel's
files, and nginx in front of all three. No Docker, no RDS, no load balancer.

Follow the steps in order. Each one ends with a check — if it fails, fix it
before moving on.

---

## Before you start

You need: an AWS account, a domain you can add a DNS record to, and push
access to this repo.

**Commit and push first.** Step 4 deploys with `git clone`, so anything not
pushed does not go.

**Two things this code cannot do yet**, so you are not surprised on the far
side:

- **Drivers cannot sign in.** There is no SMS provider — the one-time code is
  printed to the server log instead of sent. Admin sign-in works fine.
- **Nothing guards the test shortcuts.** `EXPOSE_OTP_CODE` and
  `ALLOW_TEST_ACCOUNTS` must both be `false` in Step 6. If they are not, the
  API hands out working sign-in codes to anyone who asks and says nothing.
  Step 11 checks this.

---

## 1. Launch the instance

**Amazon Linux 2023**, `t3.small` or bigger, 30 GB disk.

Security group — two rules, nothing else:

| Port | From |
|---|---|
| 443 | `0.0.0.0/0` |
| 80 | `0.0.0.0/0` |

No port 22, no 8080, no 3306. You get a shell through Session Manager instead,
so give the instance an IAM role with **`AmazonSSMManagedInstanceCore`**.

Give it an **Elastic IP** so the address survives a restart.

```bash
aws ssm start-session --target <instance-id>
```

✅ You have a shell on the box.

---

## 2. Point DNS at it

One A record:

```
kit-taxi.example.com   A   <elastic ip>
```

Everything is served from this one name — the panel at `/`, the API at
`/api/`. That is not a style choice: the API only accepts browser calls from
the same origin or `localhost`, so a panel on a separate domain would be
blocked.

```bash
dig +short kit-taxi.example.com
```

✅ It returns your Elastic IP. Wait until it does — Step 8 needs it.

---

## 3. Install everything

All on the box.

**Swap first.** MySQL and Node share 2 GB, and MySQL gets killed without it:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**Node 22, nginx, git:**

```bash
sudo dnf install -y https://rpm.nodesource.com/pub_22.x/nodistro/repo/nodesource-release-nodistro-1.noarch.rpm
sudo dnf install -y nodejs nginx git
sudo systemctl enable --now nginx
```

**MySQL 8.** Amazon Linux ships MariaDB; this app needs real MySQL:

```bash
sudo dnf install -y https://dev.mysql.com/get/mysql80-community-release-el9-1.noarch.rpm
sudo dnf install -y mysql-community-server
sudo systemctl enable --now mysqld

sudo grep 'temporary password' /var/log/mysqld.log   # MySQL's generated root password
sudo mysql_secure_installation                       # set your own, say yes to the rest
```

> If that rpm URL 404s, the version has moved on — get the current el9 one
> from dev.mysql.com/downloads/repo/yum.

```bash
node -v                                    # v22.x
systemctl is-active mysqld nginx           # active, active
free -h                                    # 2 GB swap
```

✅ All three lines look right.

---

## 4. Get the code

```bash
sudo useradd --system --home /opt/kit-taxi --shell /sbin/nologin kit-taxi
sudo mkdir -p /opt/kit-taxi/.ssh /var/www/admin
sudo chown -R kit-taxi:kit-taxi /opt/kit-taxi
sudo chown -R nginx:nginx /var/www/admin

sudo -u kit-taxi ssh-keygen -t ed25519 -N '' -f /opt/kit-taxi/.ssh/id_ed25519
sudo cat /opt/kit-taxi/.ssh/id_ed25519.pub
```

Add that key to the repo on GitHub as a **deploy key** (read access is
enough), then:

```bash
sudo -u kit-taxi git clone git@github.com:kitlabs-us/taxi-app-web.git /opt/kit-taxi/src
```

✅ `/opt/kit-taxi/src/backend` exists.

---

## 5. Create the database

```bash
mysql -u root -p
```

```sql
CREATE DATABASE kit_taxi_driver
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'kit_taxi'@'localhost' IDENTIFIED BY 'pick-a-long-password';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES
  ON kit_taxi_driver.* TO 'kit_taxi'@'localhost';
FLUSH PRIVILEGES;
```

`CREATE` and `ALTER` are in there because the app creates its own tables every
time it boots. That is the whole migration story — there is nothing to run.

Keep MySQL off the network and cap its memory. In `/etc/my.cnf`:

```ini
[mysqld]
bind-address = 127.0.0.1
innodb_buffer_pool_size = 512M
```

```bash
sudo systemctl restart mysqld
sudo ss -ltnp | grep 3306        # must say 127.0.0.1, never 0.0.0.0
```

✅ `mysql -u kit_taxi -p kit_taxi_driver` connects.

---

## 6. Write the env file

```bash
sudo -u kit-taxi tee /opt/kit-taxi/src/backend/.env.production >/dev/null <<EOF
PORT=8080

AUTH_SECRET=$(openssl rand -hex 32)
AUTH_TOKEN_MINUTES=60

CONFIG_FILE=config/app-config.json

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=kit_taxi
MYSQL_PASSWORD=the-password-from-step-5
MYSQL_DATABASE=kit_taxi_driver
MYSQL_POOL_SIZE=10

EXPOSE_OTP_CODE=false
ALLOW_TEST_ACCOUNTS=false
EOF

sudo chmod 600 /opt/kit-taxi/src/backend/.env.production
```

That is every variable the app reads. `AUTH_SECRET` signs both driver and
admin tokens — changing it later signs everybody out at once.

```bash
sudo grep -E 'EXPOSE_OTP_CODE|ALLOW_TEST_ACCOUNTS' /opt/kit-taxi/src/backend/.env.production
```

✅ Both say `false`.

---

## 7. Configure nginx

`/etc/nginx/conf.d/kit-taxi.conf` — replace the server name with yours:

```nginx
server {
    listen 80;
    server_name kit-taxi.example.com;

    root /var/www/admin;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Two details that break things if you change them:

- **The trailing slash on `proxy_pass`** is what removes `/api` before the app
  sees the path. Without it every route 404s.
- **`try_files … /index.html`** is what makes a deep link like `/drivers` work
  instead of returning nginx's 404.

```bash
sudo nginx -t && sudo systemctl reload nginx
```

✅ `nginx -t` says the config is ok.

---

## 8. Get a certificate

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d kit-taxi.example.com --redirect --agree-tos -m you@example.com
```

certbot rewrites the file above for TLS and sets up auto-renewal.

> If `dnf` cannot find certbot, install it with pip per the instructions at
> certbot.eff.org.

```bash
curl -I https://kit-taxi.example.com
sudo systemctl list-timers | grep certbot
```

✅ The certificate is valid and renewal is scheduled.

---

## 9. Build and start the API

Create `/etc/systemd/system/kit-taxi-api.service`:

```ini
[Unit]
Description=Kit Taxi Driver API
After=network-online.target mysqld.service
Wants=network-online.target

[Service]
Type=simple
User=kit-taxi
Group=kit-taxi

WorkingDirectory=/opt/kit-taxi/src/backend
ExecStart=/usr/bin/node --env-file=/opt/kit-taxi/src/backend/.env.production dist/main.js

Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kit-taxi-api

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/kit-taxi

[Install]
WantedBy=multi-user.target
```

`WorkingDirectory` matters: `CONFIG_FILE` is a relative path resolved against
it, so the app will not start if it is wrong.

```bash
cd /opt/kit-taxi/src/backend
sudo -u kit-taxi npm ci
sudo -u kit-taxi npm run build

sudo systemctl daemon-reload
sudo systemctl enable --now kit-taxi-api
sudo journalctl -u kit-taxi-api -n 20 --no-pager
```

One line in the log means the database was reachable, the tables were created
and the config file was found:

```
Kit Taxi Driver API · http://localhost:8080
```

✅ `curl -fsS https://kit-taxi.example.com/api/config` returns JSON.

---

## 10. Build the admin panel

```bash
cd /opt/kit-taxi/src/admin-web
echo "VITE_API_BASE_URL=/api" | sudo -u kit-taxi tee .env.production

sudo -u kit-taxi npm ci
sudo -u kit-taxi npm run build

sudo rm -rf /var/www/admin/*
sudo cp -r dist/* /var/www/admin/
sudo chown -R nginx:nginx /var/www/admin
```

`/api` is a path, not a full URL — the panel calls back to whatever address it
was loaded from. No nginx reload needed.

✅ `https://kit-taxi.example.com` loads, and `/drivers` reloads without a 404.

---

## 11. Check it works

```bash
D=https://kit-taxi.example.com

curl -fsS $D/api/config | head -c 80                                  # JSON
curl -s -o /dev/null -w '%{http_code}\n' $D/api/admin/drivers         # 401
curl -s -o /dev/null -w '%{http_code}\n' http://kit-taxi.example.com  # 301
sudo ss -ltnp | grep -E '8080|3306'                                   # both 127.0.0.1
```

**The one with no safety net** — this must come back `SIGN_UP_REQUIRED`:

```bash
curl -s -X POST $D/api/requestOTP -H 'Content-Type: application/json' \
  -d '{"countryCode":"GB","phoneCode":"+44","phoneNumber":"7000000005"}'
```

That number only exists when `ALLOW_TEST_ACCOUNTS` is on. If you get `otpSent`
or a `devCode`, fix Step 6 and restart — the API is handing out sign-in codes.

**Claim the first admin account now**, before the URL is shared. The first
sign-up on an empty database is activated automatically; everyone after waits
for approval:

```bash
curl -s -X POST $D/api/admin/signup -H 'Content-Type: application/json' \
  -d '{"name":"Your Name","email":"you@example.com","password":"a-long-password"}'
```

✅ It says `"activated": true`. Then sign in at `https://kit-taxi.example.com`
and open the driver list.

---

## 12. Set up backups

Nothing else protects the database — it shares a disk with everything else.

```bash
sudo mkdir -p /var/backups/mysql && sudo chmod 700 /var/backups/mysql

sudo tee /usr/local/bin/kit-taxi-backup >/dev/null <<'EOF'
#!/bin/bash
set -euo pipefail
OUT=/var/backups/mysql/kit_taxi_driver-$(date +%F-%H%M).sql.gz
mysqldump --defaults-file=/root/.my.cnf --single-transaction --routines \
  kit_taxi_driver | gzip > "$OUT"
aws s3 cp "$OUT" s3://your-backups/kit-taxi/ --only-show-errors
find /var/backups/mysql -name '*.sql.gz' -mtime +14 -delete
EOF

sudo chmod 700 /usr/local/bin/kit-taxi-backup
echo '30 2 * * * root /usr/local/bin/kit-taxi-backup' | sudo tee /etc/cron.d/kit-taxi-backup
```

Put the MySQL credentials in `/root/.my.cnf` (mode 600), not in the script.
Copying to S3 needs the instance role to allow it — drop that line if you only
want local copies plus EBS snapshots.

Also worth doing:

- Turn on **EBS snapshots** (Data Lifecycle Manager).
- **Approve a second admin.** There is no password reset — one locked-out
  admin means editing a row in MySQL.
- **Restore a dump into a scratch database once**, so you know it works.

✅ Run `/usr/local/bin/kit-taxi-backup` by hand and confirm a file appears.

---

## Releasing a change

```bash
cd /opt/kit-taxi/src && sudo -u kit-taxi git pull

# API
cd backend && sudo -u kit-taxi npm ci && sudo -u kit-taxi npm run build
sudo systemctl restart kit-taxi-api

# Panel, if it changed
cd ../admin-web && sudo -u kit-taxi npm ci && sudo -u kit-taxi npm run build
sudo rm -rf /var/www/admin/* && sudo cp -r dist/* /var/www/admin/
sudo chown -R nginx:nginx /var/www/admin
```

No migration step — the app creates any new tables when it boots. To roll
back, `git checkout <sha>` and rebuild.

---

## If something breaks

| What you see | What it is |
|---|---|
| `502 Bad Gateway` | The API is not running. `sudo systemctl status kit-taxi-api` |
| Every API call 404s | The trailing slash is missing from `proxy_pass http://127.0.0.1:8080/` |
| `Environment is not usable:` on boot | A value in `.env.production` is missing — the message names it |
| Boot hangs, then a connection error | `mysqld` is not running, or `MYSQL_HOST` is not `127.0.0.1` |
| `ER_TABLEACCESS_DENIED` on boot | The MySQL user is missing `CREATE`/`INDEX` — see Step 5 |
| Boot fails reading the config file | `WorkingDirectory` in the unit is wrong |
| Panel deep links 404 | The `try_files` line is missing from the nginx config |
| Panel: CORS error in the console | `VITE_API_BASE_URL` must be `/api`, not a full URL |
| Panel: signed out on every reload | `/api/admin/me` is failing — check the proxy, then that the account is `active` |
| MySQL killed, box unresponsive | Out of memory. Check swap is on and `innodb_buffer_pool_size` is set |
| Disk full | Database, code and logs share one volume. `journalctl --vacuum-time=7d`, prune old dumps |
| Drivers stuck at the OTP screen | Expected. No SMS provider — see "Before you start" |

**Logs:** `sudo journalctl -u kit-taxi-api -f`

---

## Keeping this guide honest

Update it when any of these change:

- A variable is added to `src/config/env.ts` → add it to Step 6.
- `schema.ts` stops being additive, or a migration tool arrives → Step 5 and
  "Releasing a change" both assume the app creates its own tables.
- A real SMS sender is wired → the first warning stops being true, and its
  credentials go in Step 6.
- An upload endpoint lands → decide where files go. On one box, disk means
  they share a volume with the database and are lost with it.
- CORS becomes configurable, or the panel moves to its own domain → Step 2 and
  Step 7 exist because it is not.
- A `/health` endpoint lands → use it for uptime checks instead of `/config`,
  which re-reads the config file on every call.
