#!/bin/sh
# RPM post-install script
echo "-------------"
echo "This is post"
echo "Install Value: $1"
echo "Upgrade Value: $1"
echo "Uninstall Value: $1"
echo "-------------"

# Refresh desktop database and icon cache if tools are available
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q /usr/share/icons/hicolor || true
fi
