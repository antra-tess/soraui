import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import '@mdi/font/css/materialdesignicons.css'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

// Install Pinia first so it's available to router guards
app.use(pinia)
app.use(router)
app.use(vuetify)

app.mount('#app')

