#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

ANDROID_JAR="${ANDROID_JAR:-$HOME/android-sdk/android-34/android.jar}"
KEYSTORE="${KEYSTORE:-$HOME/.android/debug.keystore}"

if [ ! -f "$ANDROID_JAR" ]; then
    echo "❌ android.jar not found at $ANDROID_JAR"
    exit 1
fi

echo "🚀 Building HaxBall Mobile APK..."
rm -rf build
mkdir -p build/gen build/obj build/bin

echo "📦 1. Compiling resources (aapt2)..."
aapt2 compile --dir res -o build/res.zip
aapt2 link --manifest AndroidManifest.xml -I "$ANDROID_JAR" build/res.zip -o build/base.apk --java build/gen

echo "☕ 2. Compiling Java sources (javac)..."
javac -cp "$ANDROID_JAR:build/gen" -d build/obj $(find src build/gen -name "*.java")

echo "⚡ 3. Compiling DEX bytecode (d8)..."
d8 --lib "$ANDROID_JAR" --output build/bin $(find build/obj -name "*.class")

echo "📦 4. Packaging APK and assets..."
cp build/base.apk build/unaligned.apk
(cd build/bin && zip -u ../unaligned.apk classes.dex)
zip -u -r build/unaligned.apk assets

echo "✨ 5. Aligning & signing APK..."
zipalign -f -p 4 build/unaligned.apk build/haxball-debug.apk
if [ -f "$KEYSTORE" ]; then
    apksigner sign --ks "$KEYSTORE" --ks-pass pass:android build/haxball-debug.apk
else
    echo "⚠️ debug.keystore not found, skipping signature"
fi

if [ -d "/sdcard/Download" ]; then
    cp build/haxball-debug.apk /sdcard/Download/haxball-debug.apk 2>/dev/null || true
    echo "📲 Deployed to /sdcard/Download/haxball-debug.apk"
fi

echo "✅ Build complete: build/haxball-debug.apk ($(ls -lh build/haxball-debug.apk | awk '{print $5}'))"
