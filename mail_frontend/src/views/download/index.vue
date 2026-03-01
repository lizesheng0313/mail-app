<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <PageHeader />

    <div class="download-page">
      <div class="download-container">
        <div class="header">
          <h1>下载邮件管理客户端</h1>
          <p class="subtitle">支持 macOS 和 Windows 系统</p>
        </div>

        <div class="download-cards">
          <!-- macOS 下载 -->
          <div class="download-card">
            <div class="platform-icon">
              <svg viewBox="0 0 24 24" width="64" height="64">
                <path fill="#000000" d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
              </svg>
            </div>
            <h2>macOS</h2>
            <p class="version">版本 1.3.1</p>
            <a
              href="https://zjkdongao.cn/downloads/mail-desktop_1.3.1_universal.dmg"
              class="download-btn"
            >
              下载 macOS 版本
            </a>
            <p class="system-req">支持 macOS 10.15+（Apple Silicon / Intel 通用）</p>
          </div>

          <!-- Windows 下载 -->
          <div class="download-card">
            <div class="platform-icon">
              <svg viewBox="0 0 24 24" width="64" height="64">
                <path fill="#0078D4" d="M0,3.4l9.7-1.3v9.4H0V3.4z M10.7,2l12.2-1.7v11.2H10.7V2z M0,12.5h9.7v9.4L0,20.6V12.5z M10.7,12.5h12.2v11.2L10.7,22V12.5z"/>
              </svg>
            </div>
            <h2>Windows</h2>
            <p class="version">版本 1.3.1</p>
            <a
              href="https://zjkdongao.cn/downloads/mail-desktop_1.3.1_x64-setup.exe"
              class="download-btn"
            >
              下载 Windows 版本
            </a>
            <p class="system-req">Windows 10/11 (64位)</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/components/PageHeader/index.vue'
</script>

<style scoped>
.download-page {
  min-height: calc(100vh - 64px);
  background: #ffffff;
  padding: 60px 20px;
}

.download-container {
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 60px;
}

.header h1 {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 16px;
  color: #1f2937;
}

.header .subtitle {
  font-size: 20px;
  color: #6b7280;
}

.download-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 40px;
  margin-bottom: 60px;
}

.download-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.download-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(34, 197, 94, 0.15);
  border-color: #22c55e;
}

.download-card .platform-icon {
  margin-bottom: 24px;
}

.download-card .platform-icon svg {
  width: 64px;
  height: 64px;
}

.download-card h2 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #1f2937;
}

.download-card .version {
  color: #9ca3af;
  margin-bottom: 24px;
  font-size: 14px;
}

.download-card .download-btn {
  display: block;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  padding: 16px 32px;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 12px;
  transition: all 0.3s;
}

.download-card .download-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 6px 20px rgba(34, 197, 94, 0.3);
}

.download-card .download-btn.secondary {
  background: #f3f4f6;
  color: #374151;
}

.download-card .download-btn.secondary:hover {
  background: #e5e7eb;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.download-card .download-btn.disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
  pointer-events: none;
}

.download-card.coming-soon {
  opacity: 0.7;
}

.download-card.coming-soon:hover {
  transform: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-color: #e5e7eb;
}

.download-card .system-req {
  color: #9ca3af;
  font-size: 14px;
  margin-top: 16px;
}

.features {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  padding: 40px;
}

.features h3 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  color: #1f2937;
  text-align: center;
}

.features ul {
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.features ul li {
  font-size: 18px;
  color: #4b5563;
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
</style>
