# Что осталось сделать

Код **уже на GitHub**: https://github.com/Genesius001/LL-landing — публичный, все файлы на месте,
включая `assets/` и `tools/`.

Осталось поднять сервер. Поскольку репозиторий публичный, launch script склонирует его сам —
инстанс поднимется уже с рабочим сайтом, без ручного развёртывания.

---

## Вариант А — руками в консоли, 5 минут

Lightsail → **Create instance**, регион **Virginia (us-east-1), Zone A**.

| Шаг | Что выбрать |
|---|---|
| Select a platform | **Linux operating system** (не «Linux apps») |
| Select a blueprint | **Ubuntu 24.04 LTS** |
| Launch script | развернуть «Add launch script» и вставить скрипт из `DEPLOY.md`, раздел 1 |
| Instance plan | **$5/мес** — 512 MB, 2 vCPU, 20 GB. По умолчанию подставляется $24, обязательно поменять |
| Identify your instance | `ll-landing` |

Затем **Networking → Create static IP** → привязать к `ll-landing`. Без этого адрес слетит при
первой же остановке инстанса.

Firewall инстанса: открыть **22, 80, 443**.

Через 2–3 минуты после запуска сайт откроется по статическому IP.

---

## Вариант Б — промт для Claude Code

Открыть терминал в папке проекта, запустить `claude`, скопировать блок целиком.
Нужен настроенный `aws` (`aws configure`) с правами на Lightsail — проще всего политика
`AmazonLightsailFullAccess`. Проверка: `aws lightsail get-regions --region us-east-1`.

```
Прочитай DEPLOY.md в текущей папке — там целевая схема и launch script.

Код уже на GitHub: https://github.com/Genesius001/LL-landing (публичный).
Разворачивать вручную ничего не нужно, launch script клонирует репозиторий сам.

Через AWS CLI:

1. Создай инстанс Lightsail:
   регион us-east-1, зона us-east-1a, blueprint ubuntu_24_04, bundle nano_3_0, имя ll-landing,
   user-data — скрипт из DEPLOY.md раздел 1.
   Дождись состояния running.

2. Создай статический IP ll-landing-ip и привяжи к инстансу.
   Открой порты 22, 80, 443.

3. Через 2-3 минуты проверь по статическому IP, что отдают 200:
   / /acceptable-use.html /ai-transparency.html /report.html
   /robots.txt /sitemap.xml /llms.txt
   /assets/demo-before.jpg /assets/demo-after.jpg /assets/legal.css
   Если что-то не так — смотри /var/log/cloud-init-output.log на инстансе.

4. Допиши в DEPLOY.md раздел «Доступы»: регион, имя инстанса, статический IP,
   ID аккаунта AWS (039950891643), дата создания, команда выкатки обновления.
   Закоммить и запушь.

Не меняй содержимое сайта: формулировки на лендинге и юридических страницах выверены,
основания описаны в README.md.
```

---

## Почему это не сделал я

Консоль AWS в браузере доступна и я в неё зашёл под `ivan@griffonix.com`. Но карточки выбора
платформы и плана в визарде Lightsail — компоненты Cloudscape, которые не отрабатывают
синтетические клики: платформа не переключалась ни кликом по радиокнопке, ни по карточке,
ни стрелками с клавиатуры.

AWS API из песочницы закрыт на уровне сети: `request rejected: host not permitted`
для всех доменов `*.amazonaws.com`.
