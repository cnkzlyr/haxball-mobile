#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "📦 Packaging Linux DEB & RPM Packages..."
mkdir -p dist

# 1. Build DEB Package
PKG_DIR="build/deb-root"
rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR/DEBIAN"
mkdir -p "$PKG_DIR/usr/bin"
mkdir -p "$PKG_DIR/usr/share/haxball"
mkdir -p "$PKG_DIR/usr/share/applications"
mkdir -p "$PKG_DIR/usr/share/icons/hicolor/512x512/apps"

# Control file
cat << 'EOF' > "$PKG_DIR/DEBIAN/control"
Package: haxball-client
Version: 2.8.1
Section: games
Priority: optional
Architecture: all
Maintainer: Can Kizilyar <cnkzlyrr@gmail.com>
Description: HaxBall Desktop Client with Enhanced Stutter-Tapping Joystick
 Fast, responsive HaxBall client with low latency WebRTC, physical keyboard
 tapping emulation, and modern soft virtual keyboard.
EOF

# Desktop Launcher script
cat << 'EOF' > "$PKG_DIR/usr/bin/haxball"
#!/usr/bin/env bash
if command -v electron >/dev/null 2>&1; then
    exec electron /usr/share/haxball "$@"
elif command -v xdg-open >/dev/null 2>&1; then
    exec xdg-open "file:///usr/share/haxball/assets/index.html"
else
    echo "Starting HaxBall..."
fi
EOF
chmod +x "$PKG_DIR/usr/bin/haxball"

# Desktop entry
cat << 'EOF' > "$PKG_DIR/usr/share/applications/haxball.desktop"
[Desktop Entry]
Name=HaxBall
Comment=HaxBall Desktop & Mobile Client
Exec=haxball
Icon=haxball
Terminal=false
Type=Application
Categories=Game;ArcadeGame;SportsGame;
StartupNotify=true
EOF

# Copy app assets
cp -r assets electron package.json "$PKG_DIR/usr/share/haxball/"
cp res/mipmap-xxxhdpi/ic_launcher.png "$PKG_DIR/usr/share/icons/hicolor/512x512/apps/haxball.png"

# Fix permissions for dpkg-deb
chmod -R 755 "$PKG_DIR"
chmod 644 "$PKG_DIR/DEBIAN/control"
chmod 644 "$PKG_DIR/usr/share/applications/haxball.desktop"
chmod +x "$PKG_DIR/usr/bin/haxball"

# Build DEB
if command -v dpkg-deb >/dev/null 2>&1; then
    dpkg-deb --build "$PKG_DIR" dist/haxball_2.8.1_all.deb
    echo "✅ DEB Package created: dist/haxball_2.8.1_all.deb"
fi

# Build tarball / portable linux
(cd "$PKG_DIR/usr" && tar -czvf "$DIR/dist/haxball-linux-portable-2.8.1.tar.gz" *)
echo "✅ Linux Portable Archive created: dist/haxball-linux-portable-2.8.1.tar.gz"

# Create RPM spec file for Fedora / RHEL
mkdir -p build/rpm
cat << 'EOF' > build/rpm/haxball.spec
Name:           haxball-client
Version:        2.8.1
Release:        1%{?dist}
Summary:        HaxBall Desktop Client with Stutter-Tapping Joystick
License:        MIT
URL:            https://github.com/cnkzlyr/haxball-mobile
BuildArch:      noarch

%description
Fast, responsive HaxBall client with low latency WebRTC, physical keyboard
tapping emulation, and modern soft virtual keyboard.

%files
/usr/bin/haxball
/usr/share/applications/haxball.desktop
/usr/share/haxball
/usr/share/icons/hicolor/512x512/apps/haxball.png
EOF

echo "✨ Linux packaging complete!"
