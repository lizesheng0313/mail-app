import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { isTauri } from '@/services/api'
import { setupSeo } from '@/seo'
import { i18n } from '@/i18n'
import { useLocaleStore } from '@/stores/locale'

// 桌面端添加标识 class
if (isTauri()) {
  document.body.classList.add('is-tauri')
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

const localeStore = useLocaleStore(pinia)
localeStore.initialize()

setupSeo(router, i18n)

app.mount('#app')
