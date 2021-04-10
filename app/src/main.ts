import { createApp } from "vue";

import App from "./App.vue";
import router from "./router";

import "./style/index.scss";

import CDialog from "./components/dialog.vue";

const app = createApp(App);

app.use(router);

app.component("CDialog", CDialog);

app.mount("#app");
