#!/usr/bin/env bash
set -euo pipefail

test_root="$HOME/.cache/ggmarket-webkit-test"
node_root="$HOME/.cache/node-v22.22.0-linux-x64"
deps_root="$HOME/.cache/ggmarket-webkit-deps"
debs_root="$HOME/.cache/ggmarket-webkit-debs"

export PATH="$node_root/bin:/usr/bin:/bin"
mkdir -p "$deps_root" "$debs_root"
cd "$test_root"

mapfile -t packages < <(
  npx playwright install-deps webkit --dry-run 2>&1 |
    sed -n 's/^  \([a-z0-9][a-z0-9.+:-]*\)$/\1/p'
)

if [[ ${#packages[@]} -eq 0 ]]; then
  echo "Could not determine WebKit dependency packages" >&2
  exit 1
fi

cd "$debs_root"
apt-get download "${packages[@]}"
for archive in ./*.deb; do
  dpkg-deb -x "$archive" "$deps_root"
done

mkdir -p "$deps_root/gio-modules"
ln -sf "$deps_root/usr/lib/x86_64-linux-gnu/gio/modules/libgiognutls.so" \
  "$deps_root/gio-modules/libgiognutls.so"
glib-compile-schemas "$deps_root/usr/share/glib-2.0/schemas"

echo "Extracted ${#packages[@]} WebKit dependency packages into $deps_root"
