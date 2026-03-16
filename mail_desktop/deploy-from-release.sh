#!/bin/bash
set -e

# 从 GitHub Release 下载构建产物并部署到服务器
# 用法: bash deploy-from-release.sh 1.2.0

VERSION="${1:?请输入版本号，例如: bash deploy-from-release.sh 1.2.0}"

REPO="lizesheng0313/mail-app"
SERVER_HOST="8.140.27.159"
SERVER_USER="root"
DOWNLOAD_PATH="/var/www/html/downloads"
UPDATE_PATH="/var/www/html/desktop-updates"
TEMP_DIR=$(mktemp -d)

echo "============================================"
echo "  部署 v${VERSION}（从 GitHub Release）"
echo "============================================"

# 1. 从 GitHub Release 下载
echo ""
echo "[1/3] 从 GitHub Release 下载..."

# macOS DMG 安装包
echo "下载 macOS DMG 安装包..."
gh release download "v${VERSION}" -R "$REPO" -p "*.dmg" -D "$TEMP_DIR" 2>/dev/null && echo "✅ macOS dmg" || echo "⚠️ macOS dmg 未找到"

# macOS 更新包
echo "下载 macOS 更新包..."
gh release download "v${VERSION}" -R "$REPO" -p "*.app.tar.gz" -D "$TEMP_DIR" 2>/dev/null && echo "✅ macOS tar.gz" || echo "⚠️ macOS tar.gz 未找到"
gh release download "v${VERSION}" -R "$REPO" -p "*.app.tar.gz.sig" -D "$TEMP_DIR" 2>/dev/null && echo "✅ macOS sig" || echo "⚠️ macOS sig 未找到"

# Windows 安装包
echo "下载 Windows 安装包..."
gh release download "v${VERSION}" -R "$REPO" -p "*.exe" -D "$TEMP_DIR" 2>/dev/null && echo "✅ Windows exe" || echo "⚠️ Windows exe 未找到"
gh release download "v${VERSION}" -R "$REPO" -p "*.nsis.zip" -D "$TEMP_DIR" 2>/dev/null && echo "✅ Windows nsis.zip" || echo "⚠️ Windows nsis.zip 未找到"
gh release download "v${VERSION}" -R "$REPO" -p "*.nsis.zip.sig" -D "$TEMP_DIR" 2>/dev/null && echo "✅ Windows nsis.zip.sig" || echo "⚠️ Windows nsis.zip.sig 未找到"

echo ""
echo "下载的文件："
ls -lh "$TEMP_DIR"

# 2. SCP 上传到服务器
echo ""
echo "[2/3] 上传到服务器..."

# macOS DMG 安装包
DMG=$(find "$TEMP_DIR" -name "*.dmg" | head -1)
if [ -n "$DMG" ]; then
    scp "$DMG" ${SERVER_USER}@${SERVER_HOST}:${DOWNLOAD_PATH}/
    echo "✅ macOS DMG 安装包已上传"
fi

# macOS 更新包
TAR_GZ=$(find "$TEMP_DIR" -name "*.app.tar.gz" | head -1)
SIG_FILE=$(find "$TEMP_DIR" -name "*.app.tar.gz.sig" | head -1)
if [ -n "$TAR_GZ" ]; then
    scp "$TAR_GZ" ${SERVER_USER}@${SERVER_HOST}:${DOWNLOAD_PATH}/mail-desktop.app.tar.gz
    echo "✅ macOS 更新包已上传"
fi

# Windows 安装包
EXE=$(find "$TEMP_DIR" -name "*.exe" | head -1)
if [ -n "$EXE" ]; then
    scp "$EXE" ${SERVER_USER}@${SERVER_HOST}:${DOWNLOAD_PATH}/
    echo "✅ Windows 安装包已上传"
fi

# 3. 生成更新清单
echo ""
echo "[3/3] 生成更新清单..."

echo "读取 GitHub Release 更新说明..."
RELEASE_BODY=$(gh release view "v${VERSION}" -R "$REPO" --json body -q .body 2>/dev/null || true)
if [ -z "$RELEASE_BODY" ]; then
    RELEASE_BODY="邮件管理客户端 v${VERSION} 发布"
fi

NOTES=$(printf '%s' "$RELEASE_BODY" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read(), ensure_ascii=False))')

# macOS 更新清单 (universal-apple-darwin)
if [ -n "$SIG_FILE" ]; then
    SIGNATURE=$(cat "$SIG_FILE")
    PUB_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    MANIFEST="{\"version\":\"${VERSION}\",\"notes\":${NOTES},\"pub_date\":\"${PUB_DATE}\",\"url\":\"https://zjkdongao.cn/downloads/mail-desktop.app.tar.gz\",\"signature\":\"${SIGNATURE}\"}"
    ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${UPDATE_PATH}/universal-apple-darwin"
    printf '%s' "$MANIFEST" | ssh ${SERVER_USER}@${SERVER_HOST} "cat > ${UPDATE_PATH}/universal-apple-darwin/latest"
    echo "✅ macOS 更新清单已生成（latest -> ${VERSION}）"
fi

# Windows 更新清单 (x86_64-pc-windows-msvc)
WIN_SIG=$(find "$TEMP_DIR" -name "*.nsis.zip.sig" | head -1)
WIN_ZIP=$(find "$TEMP_DIR" -name "*.nsis.zip" ! -name "*.sig" | head -1)
if [ -n "$WIN_SIG" ] && [ -n "$WIN_ZIP" ]; then
    WIN_SIGNATURE=$(cat "$WIN_SIG")
    WIN_FILENAME=$(basename "$WIN_ZIP")
    PUB_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    scp "$WIN_ZIP" ${SERVER_USER}@${SERVER_HOST}:${DOWNLOAD_PATH}/
    WIN_MANIFEST="{\"version\":\"${VERSION}\",\"notes\":${NOTES},\"pub_date\":\"${PUB_DATE}\",\"url\":\"https://zjkdongao.cn/downloads/${WIN_FILENAME}\",\"signature\":\"${WIN_SIGNATURE}\"}"
    ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${UPDATE_PATH}/x86_64-pc-windows-msvc"
    printf '%s' "$WIN_MANIFEST" | ssh ${SERVER_USER}@${SERVER_HOST} "cat > ${UPDATE_PATH}/x86_64-pc-windows-msvc/latest"
    echo "✅ Windows 更新清单已生成（latest -> ${VERSION}）"
fi

# 清理
rm -rf "$TEMP_DIR"

echo ""
echo "============================================"
echo "  ✅ 全部完成！版本: $VERSION"
echo "============================================"
