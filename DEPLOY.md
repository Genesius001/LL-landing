# Сервер и доступы

Актуально на 13 августа 2026. **Сайт работает: http://35.169.139.135/**

---

## 1. Что где лежит

| Что | Где |
|---|---|
| Сайт | http://35.169.139.135/ |
| Код | https://github.com/Genesius001/LL-landing (публичный) |
| Инстанс | AWS Lightsail, `LL-landing` |
| Аккаунт AWS | **039950891643**, владелец ivan@griffonix.com |
| Регион | us-east-1 (Virginia), Zone A |
| Конфигурация | Ubuntu 22.04, 512 MB RAM, 2 vCPU, 20 GB SSD |
| Тариф | nano, **$5/мес** |
| Статический IP | `StaticIp-LL` → **35.169.139.135**, привязан к инстансу |
| Открытые порты | 22 (SSH), 80 (HTTP), 443 (HTTPS) |

**Суммарная стоимость: $5 в месяц.** Статический IP бесплатен, пока привязан к работающему
инстансу — отвязывать его нельзя, начнёт тарифицироваться и адрес потеряется.

### На сервере

| Путь | Что это |
|---|---|
| `/var/www/ll-landing/` | Файлы сайта |
| `/etc/nginx/sites-available/ll` | Конфиг nginx (симлинк в `sites-enabled/ll`) |
| `/usr/local/bin/deploy.sh` | Скрипт выкатки |
| `/var/log/nginx/access.log`, `error.log` | Логи веб-сервера |
| `/var/log/cloud-init-output.log` | Лог первичной настройки инстанса |

---

## 2. Как дать доступ новому человеку

**Это не сделано ни для кого, кроме владельца аккаунта. Без этих шагов команда работать не сможет.**

### AWS

Аккаунт принадлежит ivan@griffonix.com. Пароль от корневого аккаунта раздавать нельзя.
Для каждого человека создаётся отдельный IAM-пользователь:

1. Консоль AWS → IAM → Users → Create user.
2. Включить **Provide user access to the AWS Management Console**.
3. Права: политика `AmazonLightsailFullAccess` — этого достаточно для работы с инстансом.
   Если нужен только просмотр — `AmazonLightsailReadOnlyAccess`.
4. Обязательно включить MFA.
5. Ссылка для входа: `https://039950891643.signin.aws.amazon.com/console`

### SSH на сервер

Два способа, оба через AWS:

**Браузерный терминал** — Lightsail → инстанс `LL-landing` → **Connect using SSH**.
Ключи не нужны, работает сразу, доступен любому, у кого есть доступ к консоли Lightsail.
Для выкатки обновлений этого достаточно.

**Обычный SSH-клиент** — Lightsail → Account (иконка профиля) → **SSH keys** → регион
us-east-1 → скачать дефолтный ключ. Затем:

```bash
chmod 400 ~/LightsailDefaultKey-us-east-1.pem
ssh -i ~/LightsailDefaultKey-us-east-1.pem ubuntu@35.169.139.135
```

Пользователь на сервере — `ubuntu`, sudo без пароля.

**Ключ в репозиторий не коммитить.** `.gitignore` закрывает `*.pem` и `*.key`, но проверяйте.

### GitHub

Репозиторий лежит на **личном аккаунте Genesius001**. Это узкое место: если доступ к аккаунту
пропадёт, команда потеряет код. Два действия:

1. **Сейчас:** Settings → Collaborators → добавить всех, кому нужно пушить.
2. **Лучше:** перенести репозиторий в организацию компании (Settings → Transfer ownership).
   Тогда доступ управляется на уровне организации, а не одного человека.

---

## 3. Выкатка обновления

Правки в код → пуш в `main` → на сервере:

```bash
sudo /usr/local/bin/deploy.sh
```

Скрипт клонирует репозиторий, копирует файлы в `/var/www/ll-landing/`, удаляет `.md`,
`tools/` и `.git`, ставит владельца `www-data` и перезагружает nginx. Занимает пару секунд.

Проверка после выкатки:

```bash
for p in / /acceptable-use.html /ai-transparency.html /report.html \
         /robots.txt /sitemap.xml /llms.txt \
         /assets/demo-before.jpg /assets/demo-after.jpg /assets/legal.css; do
  printf "%-32s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' http://35.169.139.135$p)"
done
```

Все должны отдать `200`. Плюс глазами: шторка «до/после» тянется, кнопки сторов ведут
в магазины, юридические страницы открываются.

---

## 4. Если сломалось

**Сайт не открывается.** Сначала — жив ли инстанс: Lightsail → инстанс должен быть `Running`.
Если да, зайти по SSH:

```bash
sudo systemctl status nginx      # что с веб-сервером
sudo nginx -t                    # синтаксис конфига
sudo tail -50 /var/log/nginx/error.log
sudo systemctl restart nginx
```

**Выкатили сломанную версию.** Откат — это откат коммита в GitHub и повторный запуск деплоя:

```bash
sudo /usr/local/bin/deploy.sh
```

**Инстанс не поднялся после создания или пересоздания.**

```bash
sudo tail -100 /var/log/cloud-init-output.log
```

Там виден весь launch script и место, где он упал.

**Кончилось место** (маловероятно при 20 GB под статику):

```bash
df -h && sudo journalctl --vacuum-time=7d
```

---

## 5. Чего не настроено — решить команде

Это не поломки, а осознанные пропуски. Стоит закрыть до того, как на сайт пойдёт трафик.

**Резервные копии.** Снапшоты не включены. Для статики риск невелик — всё восстанавливается
из GitHub за минуты через launch script. Но если хотите: Lightsail → инстанс → Snapshots →
**Enable automatic snapshots**. Стоит около $0.05 за GB в месяц.

**Мониторинг.** Алармов нет. Если сайт ляжет, никто не узнает. Минимум — Lightsail → инстанс →
Metrics → аларм на **Status check failed** с уведомлением на почту.

**HTTPS и домен.** Порт 443 открыт, сертификата пока нет — см. раздел 6.

**Ограничение SSH.** Порт 22 открыт для всех адресов. Если команда работает со статических IP,
сузьте правило: Networking → Firewall → правило SSH → указать конкретные адреса.

---

## 6. Домен и HTTPS

1. У регистратора `luckyloki.pro` создать A-запись → **35.169.139.135**.
   Для `www` — такую же A-запись или CNAME на корень.
2. Дождаться распространения DNS, проверить: `dig luckyloki.pro`
3. На сервере:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d luckyloki.pro -d www.luckyloki.pro
```

Certbot сам пропишет редирект с HTTP на HTTPS и настроит автопродление сертификата.

4. **Проверить логотип.** Он грузится по абсолютной ссылке
   `https://luckyloki.pro/wp-content/uploads/2023/01/180x180-72-ppi.png`, то есть с текущей
   установки WordPress. Если при переезде WordPress отключат — логотип пропадёт. Лечение:
   положить PNG в `assets/logo.png` и поправить четыре ссылки в HTML-файлах.

5. `canonical`, `og:url` и `sitemap.xml` уже указывают на `https://luckyloki.pro` — менять
   после привязки домена ничего не нужно.

---

## 7. Как этот сервер был собран

На случай, если понадобится поднять такой же с нуля — в другом регионе или взамен утраченного.

Lightsail → Create instance → **Linux operating system** (не «Linux apps») → **Ubuntu 22.04 LTS** →
план **$5/мес** → имя `LL-landing`. В **Advanced settings → Add launch script** вставить:

```bash
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx git
rm -f /etc/nginx/sites-enabled/default
cat > /etc/nginx/sites-available/ll <<'CONF'
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  root /var/www/ll-landing;
  index index.html;
  location / { try_files $uri $uri.html $uri/ =404; }
  location ~* \.(jpg|jpeg|png|webp|svg|ico)$ { expires 30d; add_header Cache-Control "public, immutable"; }
  location ~* \.(css|js)$ { expires 7d; add_header Cache-Control "public"; }
  add_header X-Content-Type-Options nosniff;
  add_header X-Frame-Options SAMEORIGIN;
  add_header Referrer-Policy strict-origin-when-cross-origin;
  gzip on;
  gzip_types text/css application/javascript application/json text/xml image/svg+xml;
  gzip_min_length 512;
}
CONF
ln -sf /etc/nginx/sites-available/ll /etc/nginx/sites-enabled/ll
cat > /usr/local/bin/deploy.sh <<'DEP'
#!/bin/bash
set -e
rm -rf /tmp/ll
git clone --depth 1 https://github.com/Genesius001/LL-landing.git /tmp/ll
mkdir -p /var/www/ll-landing
rm -rf /var/www/ll-landing/*
cp -r /tmp/ll/. /var/www/ll-landing/
rm -rf /var/www/ll-landing/.git /var/www/ll-landing/tools /var/www/ll-landing/.gitignore
find /var/www/ll-landing -maxdepth 1 -name '*.md' -delete
chown -R www-data:www-data /var/www/ll-landing
systemctl reload nginx || systemctl restart nginx
echo "deployed: $(date -u)"
DEP
chmod +x /usr/local/bin/deploy.sh
/usr/local/bin/deploy.sh
nginx -t
systemctl enable nginx
systemctl restart nginx
```

Затем **Networking → Create static IP** → привязать к инстансу. И правило файрвола на 443:
Networking → Firewall → Add rule → Custom / TCP / **443** → Source IP **Anywhere IPv4 (0.0.0.0/0)**.
Без указания source IP правило не сохранится — это неочевидно, форма не подсказывает.

`.md` и `tools/` в публичную выдачу не попадают намеренно — это внутренняя документация,
она отдаёт 404.
