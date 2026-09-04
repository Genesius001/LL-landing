#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_ROOT="/var/www/ll-landing"
BACKUP_PARENT="/var/backups/ll-landing"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOCALES=(ar de es fa fr hi id it ja ko pt ru th tr vi)
ROOT_FILES=(
  index.html
  privacy.html
  terms.html
  acceptable-use.html
  ai-transparency.html
  report.html
  robots.txt
  sitemap.xml
  llms.txt
)

fail() {
  printf 'deploy error: %s\n' "$*" >&2
  exit 1
}

validate_source() {
  local file locale
  for file in "${ROOT_FILES[@]}"; do
    [[ -f "$SOURCE_DIR/$file" ]] || fail "missing release file: $file"
  done
  [[ -d "$SOURCE_DIR/assets" ]] || fail "missing assets directory"
  for locale in "${LOCALES[@]}"; do
    [[ -f "$SOURCE_DIR/$locale/index.html" ]] || fail "missing locale route: $locale/index.html"
  done
}

validate_source

if [[ "${1:-}" == "--check" ]]; then
  printf 'release bundle valid: %s locale routes\n' "${#LOCALES[@]}"
  exit 0
fi

[[ "$EUID" -eq 0 ]] || fail "run with sudo"

mkdir -p /var/www "$BACKUP_PARENT"
STAGING_ROOT="$(mktemp -d /var/www/ll-landing.next.XXXXXX)"
BACKUP_ROOT="$BACKUP_PARENT/$TIMESTAMP"

cleanup_staging() {
  if [[ -n "${STAGING_ROOT:-}" && -d "$STAGING_ROOT" ]]; then
    case "$STAGING_ROOT" in
      /var/www/ll-landing.next.*) rm -rf -- "$STAGING_ROOT" ;;
      *) printf 'refusing to clean unexpected path: %s\n' "$STAGING_ROOT" >&2 ;;
    esac
  fi
}
trap cleanup_staging EXIT

for file in "${ROOT_FILES[@]}"; do
  cp -- "$SOURCE_DIR/$file" "$STAGING_ROOT/$file"
done
cp -a -- "$SOURCE_DIR/assets" "$STAGING_ROOT/assets"
for locale in "${LOCALES[@]}"; do
  cp -a -- "$SOURCE_DIR/$locale" "$STAGING_ROOT/$locale"
done

find "$STAGING_ROOT" -type d -exec chmod 0755 {} +
find "$STAGING_ROOT" -type f -exec chmod 0644 {} +
chown -R www-data:www-data "$STAGING_ROOT"

nginx -t
[[ ! -e "$BACKUP_ROOT" ]] || fail "backup already exists: $BACKUP_ROOT"

if [[ -d "$SITE_ROOT" ]]; then
  mv -- "$SITE_ROOT" "$BACKUP_ROOT"
fi

if ! mv -- "$STAGING_ROOT" "$SITE_ROOT"; then
  [[ -d "$BACKUP_ROOT" ]] && mv -- "$BACKUP_ROOT" "$SITE_ROOT"
  fail "could not activate the staged release"
fi
STAGING_ROOT=""

if ! nginx -t || ! systemctl reload nginx; then
  FAILED_ROOT="${SITE_ROOT}.failed-${TIMESTAMP}"
  mv -- "$SITE_ROOT" "$FAILED_ROOT"
  [[ -d "$BACKUP_ROOT" ]] && mv -- "$BACKUP_ROOT" "$SITE_ROOT"
  systemctl reload nginx || true
  fail "nginx reload failed; previous release restored; failed release kept at $FAILED_ROOT"
fi

printf 'deployed: %s\n' "$TIMESTAMP"
if [[ -d "$BACKUP_ROOT" ]]; then
  printf 'rollback copy: %s\n' "$BACKUP_ROOT"
else
  printf 'rollback copy: none (first deployment)\n'
fi
