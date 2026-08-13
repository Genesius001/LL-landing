# Доступы — фактическое состояние

**Сервер поднят и работает.** Проверено 13 августа 2026.

| Параметр | Значение |
|---|---|
| Сайт | **http://35.169.139.135/** |
| Аккаунт AWS | 039950891643 (ivan@griffonix.com) |
| Регион | us-east-1, Virginia, Zone A |
| Инстанс | `LL-landing` — Ubuntu 22.04, 512 MB RAM, 2 vCPU, 20 GB SSD |
| Тариф | nano, $5/мес |
| Статический IP | `StaticIp-LL` → **35.169.139.135**, привязан к `LL-landing` |
| Репозиторий | https://github.com/Genesius001/LL-landing (публичный) |
| Открытые порты | 22 (SSH), 80 (HTTP), 443 (HTTPS) |

Статический IP бесплатен, пока привязан к работающему инстансу. Не отвязывайте его.

## Как зайти на сервер

Lightsail → инстанс `LL-landing` → **Connect using SSH**. Браузерный терминал, ключи не нужны.
Для обычного SSH-клиента ключ скачивается в Account → SSH keys.

## Как выкатить обновление

Запушили в `main` на GitHub, затем на сервере:

```bash
sudo /usr/local/bin/deploy.sh
```

Скрипт уже лежит на инстансе. Он клонирует репозиторий, чистит служебные файлы и перезагружает nginx.

## Что проверено на этом IP

Все страницы и ассеты отдают 200: `/`, `/acceptable-use.html`, `/ai-transparency.html`,
`/report.html`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/assets/demo-before.jpg`,
`/assets/demo-after.jpg`, `/assets/legal.css`, `/assets/og-image.png`.

Чистые адреса работают: `/report` и `/acceptable-use` открываются без расширения.

Документация закрыта: `README.md`, `DEPLOY.md` и `tools/` отдают 404 — в публичную выдачу
не попадают намеренно.

## Осталось на этап домена

1. A-запись `luckyloki.pro` → `35.169.139.135`.
2. Сертификат:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d luckyloki.pro -d www.luckyloki.pro
```

Certbot сам пропишет редирект с HTTP и настроит автопродление.

3. После переезда проверить логотип: он грузится с `https://luckyloki.pro/wp-content/...`,
   то есть с текущей установки WordPress. Если её отключат — положить PNG в `assets/`
   и поправить четыре ссылки.

---

# Деплой

Сайт статический. Любой веб-сервер, отдающий файлы, подойдёт. Ниже — принятая схема:
**AWS Lightsail, минимальный инстанс, nginx, фиксированный IP.**

---

## 1. Инстанс

Консоль Lightsail → Create instance.

| Параметр | Значение |
|---|---|
| Регион | `us-east-1` (или ближайший к аудитории) |
| Платформа | Linux/Unix |
| Образ | OS Only → **Ubuntu 24.04 LTS** |
| План | самый дешёвый — 512 MB RAM, 2 vCPU, 20 GB SSD |
| Имя | `ll-landing` |

Статический сайт на 300 КБ не требует ничего больше. Апгрейд плана возможен в любой момент.

### Launch script

Вставить в поле **Launch script** при создании — тогда инстанс поднимется уже настроенным:

```bash
#!/bin/bash
set -e
apt-get update -y
apt-get install -y nginx git
rm -f /etc/nginx/sites-enabled/default
cat > /etc/nginx/sites-available/ll-landing <<'CONF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /var/www/ll-landing;
    index index.html;

    # чистые адреса: /report вместо /report.html
    location / { try_files $uri $uri.html $uri/ =404; }

    location ~* \.(jpg|jpeg|png|webp|svg|ico)$ { expires 30d; add_header Cache-Control "public, immutable"; }
    location ~* \.(css|js)$                    { expires 7d;  add_header Cache-Control "public"; }
    location ~* \.html$                        { expires 5m;  add_header Cache-Control "public, must-revalidate"; }

    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header Referrer-Policy strict-origin-when-cross-origin;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;
    gzip_min_length 512;
}
CONF
ln -sf /etc/nginx/sites-available/ll-landing /etc/nginx/sites-enabled/ll-landing
mkdir -p /var/www/ll-landing
git clone https://github.com/Genesius001/LL-landing.git /tmp/ll
cp -r /tmp/ll/* /var/www/ll-landing/
rm -rf /var/www/ll-landing/tools /var/www/ll-landing/*.md
chown -R www-data:www-data /var/www/ll-landing
nginx -t && systemctl enable --now nginx && systemctl reload nginx
```

Если репозиторий приватный — уберите `git clone` из скрипта и залейте файлы вручную (раздел 4).

---

## 2. Фиксированный IP

**Обязательно.** Без него IP меняется при каждой остановке инстанса, и домен отвалится.

Lightsail → Networking → **Create static IP** → привязать к `ll-landing`.

Статический IP бесплатен, **пока привязан к работающему инстансу**. Отвязанный или висящий без
инстанса — тарифицируется. Не отвязывайте «на всякий случай».

---

## 3. Сеть

Instance → Networking → IPv4 Firewall. Должны быть открыты:

| Порт | Зачем |
|---|---|
| 22 | SSH |
| 80 | HTTP |
| 443 | HTTPS, когда привяжете домен |

Порт 22 стоит ограничить своими адресами, если команда работает со статических IP.

---

## 4. Выкатка обновлений

Подключение: Lightsail → инстанс → **Connect using SSH** (браузерный терминал, ключи не нужны).
Либо скачать ключ в Account → SSH keys и ходить обычным клиентом.

```bash
cd /tmp && rm -rf ll && git clone https://github.com/Genesius001/LL-landing.git ll
sudo cp -r /tmp/ll/* /var/www/ll-landing/
sudo rm -rf /var/www/ll-landing/tools /var/www/ll-landing/*.md
sudo chown -R www-data:www-data /var/www/ll-landing
sudo systemctl reload nginx
```

Положите это в `/usr/local/bin/deploy.sh`, и выкатка станет одной командой `sudo deploy.sh`.

Файлы `.md` и папка `tools` в публичную выдачу не попадают намеренно — это внутренняя
документация.

---

## 5. Проверка после выкатки

```bash
IP=<статический-ip>
for p in / /acceptable-use.html /ai-transparency.html /report.html \
         /robots.txt /sitemap.xml /llms.txt \
         /assets/demo-before.jpg /assets/demo-after.jpg /assets/legal.css; do
  printf "%-32s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' http://$IP$p)"
done
```

Все должны отдавать `200`. Плюс глазами: открыть в браузере, проверить что шторка «до/после»
тянется, кнопки сторов ведут в магазины, ссылки на юридические страницы открываются.

---

## 6. Домен и HTTPS — следующий шаг

1. A-запись `luckyloki.pro` → статический IP.
2. На инстансе:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d luckyloki.pro -d www.luckyloki.pro
```

Certbot сам пропишет редирект с HTTP и настроит автопродление сертификата.

3. После привязки домена проверить, что логотип грузится: он подтягивается с
   `https://luckyloki.pro/wp-content/...`, то есть с текущей установки WordPress. Если WordPress
   будет отключён при переезде — положить PNG в `assets/` и поправить четыре ссылки.

---

## Что записать в общий доступ команды

После создания инстанса добавьте сюда или в парольный менеджер:

- ID аккаунта AWS и в каком регионе создан инстанс
- имя инстанса и **статический IP**
- где лежит SSH-ключ Lightsail и у кого есть доступ
- кто оплачивает аккаунт

**SSH-ключи и учётные данные в репозиторий не коммитить.**
