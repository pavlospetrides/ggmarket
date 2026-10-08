#!/usr/bin/env bash
set -euo pipefail

repo_source="/mnt/c/Users/pavlo/OneDrive/Documents/ggshop"
test_root="$HOME/.cache/ggmarket-webkit-test"
node_root="$HOME/.cache/node-v22.22.0-linux-x64"
deps_root="$HOME/.cache/ggmarket-webkit-deps"

if [[ ! -x "$node_root/bin/node" ]]; then
  curl -fsSL "https://nodejs.org/dist/v22.22.0/node-v22.22.0-linux-x64.tar.xz" -o "$HOME/.cache/ggmarket-node.tar.xz"
  tar -xJf "$HOME/.cache/ggmarket-node.tar.xz" -C "$HOME/.cache"
fi

if [[ "$test_root" != "$HOME/.cache/ggmarket-webkit-test" ]]; then
  echo "Unexpected test directory" >&2
  exit 2
fi
rm -rf -- "$test_root"
mkdir -p "$test_root"
tar -C "$repo_source" --exclude=node_modules --exclude=.next -cf - . | tar -C "$test_root" -xf -
cd "$test_root"
export PATH="$node_root/bin:/usr/bin:/bin"
if [[ -d "$deps_root/usr/lib/x86_64-linux-gnu" ]]; then
  export LD_LIBRARY_PATH="$deps_root/usr/lib/x86_64-linux-gnu:$deps_root/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
  export GST_PLUGIN_SYSTEM_PATH_1_0="$deps_root/usr/lib/x86_64-linux-gnu/gstreamer-1.0"
  export GIO_EXTRA_MODULES="$deps_root/gio-modules"
  export GSETTINGS_SCHEMA_DIR="$deps_root/usr/share/glib-2.0/schemas"
  export XDG_DATA_DIRS="$deps_root/usr/share${XDG_DATA_DIRS:+:$XDG_DATA_DIRS}"
  export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1
fi
export PLAYWRIGHT_WEB_SERVER_COMMAND="npm run build && npm run start"
export PLAYWRIGHT_REUSE_SERVER="false"
npm ci --ignore-scripts
npx playwright install webkit
webkit_wrapper="$(find "$HOME/.cache/ms-playwright" -path '*/minibrowser-wpe/MiniBrowser' -type f | sort | tail -n 1)"
if [[ -n "$webkit_wrapper" ]]; then
  sed -i 's|export LD_LIBRARY_PATH="${MYDIR}/lib:${MYDIR}/sys/lib"|export LD_LIBRARY_PATH="${MYDIR}/lib:${MYDIR}/sys/lib:${LD_LIBRARY_PATH:-}"|' "$webkit_wrapper"
fi
npx playwright test --project=webkit "$@"
