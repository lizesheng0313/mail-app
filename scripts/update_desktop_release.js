const fs = require("fs");
const path = require("path");

const rawVersion = (process.argv[2] || "").trim();
const version = rawVersion.replace(/^v/i, "");

if (!version) {
  console.error(
    "缺少版本号参数，例如: node scripts/update_desktop_release.js 1.2.0",
  );
  process.exit(1);
}

const targetPath = path.resolve(
  __dirname,
  "../mail_frontend/src/config/desktopRelease.ts",
);

const nextContent = `export const DESKTOP_RELEASE_VERSION = '${version}'

const DESKTOP_RELEASE_BASE_URL = 'https://zjkdongao.cn/downloads'

export const DESKTOP_DOWNLOAD_URLS = {
  macos: \`\${DESKTOP_RELEASE_BASE_URL}/mail-desktop_\${DESKTOP_RELEASE_VERSION}_universal.dmg\`,
  windows: \`\${DESKTOP_RELEASE_BASE_URL}/mail-desktop_\${DESKTOP_RELEASE_VERSION}_x64-setup.nsis.zip\`,
}
`;

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, nextContent);

console.log(`desktopRelease.ts 已更新为版本 ${version}`);
