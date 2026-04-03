#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 跳过 pnpm 传入的 "--" 参数
for arg in "$@"; do
    if [ "$arg" != "--" ]; then
        VERSION="$arg"
        break
    fi
done
VERSION="${VERSION:-0.1.0}"

PRIVATE_KEY_PATH="$SCRIPT_DIR/.tauri-key"
SERVER_HOST="8.140.27.159"
SERVER_USER="root"
DOWNLOAD_PATH="/var/www/html/downloads"
UPDATE_PATH="/var/www/html/desktop-updates"


export PATH="$HOME/.cargo/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "============================================"
echo "  桌面应用构建 & 部署 v${VERSION}"
echo "============================================"

# 1. 检查环境
echo ""
echo "[1/7] 检查环境..."
node --version
rustc --version
cargo --version
rustup target add x86_64-apple-darwin aarch64-apple-darwin 2>/dev/null || true

if [ ! -f "$PRIVATE_KEY_PATH" ]; then
    echo "❌ 找不到签名私钥: $PRIVATE_KEY_PATH"
    exit 1
fi

export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="tauri"

# 2. 读取当前版本号（升级前的版本，用于生成更新清单）
echo ""
echo "[2/7] 读取当前版本号..."
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' "$SCRIPT_DIR/src-tauri/tauri.conf.json" | head -1 | sed 's/"version": "\(.*\)"/\1/')

if [ "$CURRENT_VERSION" = "$VERSION" ]; then
    echo "⚠️ 当前版本已经是 $VERSION，无法确定旧版本号"
    echo "请输入需要更新的旧版本号（例如上一个发布版本）:"
    read -r CURRENT_VERSION
fi

echo "当前版本: $CURRENT_VERSION -> 新版本: $VERSION"

# 更新版本号
cd "$SCRIPT_DIR/src-tauri"
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" tauri.conf.json
grep '"version"' tauri.conf.json

# 更新下载页版本号和 DMG 链接
DOWNLOAD_VUE="$PROJECT_ROOT/mail_frontend/src/views/download/index.vue"
sed -i '' "s/版本 [0-9.]*[0-9]/版本 ${VERSION}/g" "$DOWNLOAD_VUE"
sed -i '' "s/mail-desktop_[0-9.]*[0-9]_/mail-desktop_${VERSION}_/g" "$DOWNLOAD_VUE"
echo "✅ 下载页版本号已更新为 ${VERSION}"

cd "$PROJECT_ROOT"

# 3. 安装依赖
echo ""
echo "[3/7] 安装依赖..."
cd "$PROJECT_ROOT/mail_frontend" && pnpm install
cd "$PROJECT_ROOT/mail_desktop" && pnpm install

# 4. 构建前端
echo ""
echo "[4/7] 构建前端..."
cd "$PROJECT_ROOT/mail_frontend" && pnpm run build

# 5. 构建桌面应用
echo ""
echo "[5/7] 构建桌面应用（universal）..."
cd "$SCRIPT_DIR"
export TAURI_SIGNING_PRIVATE_KEY="$(cat "$PRIVATE_KEY_PATH")"

pnpm tauri build --target universal-apple-darwin --bundles app,updater

BUNDLE_DIR="src-tauri/target/universal-apple-darwin/release/bundle"

echo "📦 手动创建 DMG..."
mkdir -p "$BUNDLE_DIR/dmg"
TEMP_DIR=$(mktemp -d)
cp -R "$BUNDLE_DIR/macos/肥猫猫邮箱.app" "$TEMP_DIR/"
ln -s /Applications "$TEMP_DIR/Applications"
hdiutil create -volname "肥猫猫邮箱" -srcfolder "$TEMP_DIR" -ov -format UDZO "$BUNDLE_DIR/dmg/mail-desktop_${VERSION}_universal.dmg"
rm -rf "$TEMP_DIR"

echo ""
echo "构建产物："
find "$BUNDLE_DIR" -type f \( -name "*.dmg" -o -name "*.app.tar.gz" -o -name "*.sig" \) 2>/dev/null

# 6. 上传文件到服务器
echo ""
echo "[6/7] 上传文件到服务器..."
ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${DOWNLOAD_PATH} ${UPDATE_PATH}/darwin-aarch64 ${UPDATE_PATH}/darwin-x86_64"

# 上传 DMG（用户手动下载安装用）
scp "$BUNDLE_DIR/dmg/mail-desktop_${VERSION}_universal.dmg" ${SERVER_USER}@${SERVER_HOST}:${DOWNLOAD_PATH}/
echo "✅ DMG 已上传"

# 上传 .app.tar.gz（在线更新用，重命名为英文避免 URL 中文问题）
TAR_GZ=$(find "$BUNDLE_DIR/macos" -name "*.app.tar.gz" | head -1)
SIG_FILE="${TAR_GZ}.sig"
REMOTE_TAR_GZ_NAME="mail-desktop.app.tar.gz"
if [ -n "$TAR_GZ" ] && [ -f "$TAR_GZ" ]; then
    scp "$TAR_GZ" ${SERVER_USER}@${SERVER_HOST}:${DOWNLOAD_PATH}/${REMOTE_TAR_GZ_NAME}
    echo "✅ 更新包已上传: $REMOTE_TAR_GZ_NAME"
else
    echo "⚠️ 未找到 .app.tar.gz，跳过在线更新配置"
    echo ""
    echo "============================================"
    echo "  ✅ 构建完成！版本: $VERSION（仅 DMG）"
    echo "============================================"
    exit 0
fi

# 7. 生成更新清单
echo ""
echo "[7/7] 生成更新清单..."

if [ -f "$SIG_FILE" ]; then
    SIGNATURE=$(cat "$SIG_FILE")
    PUB_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # 尝试从 GitHub Release 读取更新说明
    echo "读取 GitHub Release 更新说明..."
    RELEASE_BODY=$(gh release view "v${VERSION}" -R "lizesheng0313/mail-app" --json body -q .body 2>/dev/null || true)
    if [ -z "$RELEASE_BODY" ]; then
        RELEASE_BODY="邮件管理客户端 v${VERSION} 发布"
        echo "⚠️ 未找到 GitHub Release，使用默认说明"
    else
        echo "✅ 已读取 GitHub Release 更新说明"
    fi

    NOTES=$(printf '%s' "$RELEASE_BODY" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read(), ensure_ascii=False))')

    # 本地生成清单 JSON（扁平格式，因为 endpoint 已包含 {{target}}）
    MANIFEST="{\"version\":\"${VERSION}\",\"notes\":${NOTES},\"pub_date\":\"${PUB_DATE}\",\"url\":\"https://zjkdongao.cn/downloads/${REMOTE_TAR_GZ_NAME}\",\"signature\":\"${SIGNATURE}\"}"

    # 上传清单：当前客户端读取 /desktop-updates/{{target}}/latest
    # 同时兼容保留旧目录名，避免历史客户端升级链路断掉
    ssh ${SERVER_USER}@${SERVER_HOST} \
        "mkdir -p ${UPDATE_PATH}/darwin-aarch64 ${UPDATE_PATH}/darwin-x86_64 ${UPDATE_PATH}/universal-apple-darwin ${UPDATE_PATH}/aarch64-apple-darwin ${UPDATE_PATH}/x86_64-apple-darwin"
    printf '%s' "$MANIFEST" | ssh ${SERVER_USER}@${SERVER_HOST} \
        "tee ${UPDATE_PATH}/darwin-aarch64/latest ${UPDATE_PATH}/darwin-x86_64/latest ${UPDATE_PATH}/universal-apple-darwin/latest ${UPDATE_PATH}/aarch64-apple-darwin/latest ${UPDATE_PATH}/x86_64-apple-darwin/latest > /dev/null"
    echo "✅ 更新清单已生成（latest -> ${VERSION}）"
else
    echo "⚠️ 未找到签名文件，跳过更新清单"
fi

echo ""
echo "============================================"
echo "  ✅ 全部完成！版本: $VERSION"
echo "  下载页: https://zjkdongao.cn/downloads/mail-desktop_${VERSION}_universal.dmg"
echo "  更新: ${CURRENT_VERSION} 的用户将收到 ${VERSION} 的更新提示"
echo "============================================"
