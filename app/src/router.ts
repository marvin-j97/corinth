import { createRouter, createWebHashHistory } from "vue-router";

import Home from "./pages/index.vue";
import Queues from "./pages/queues.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "Home",
      component: Home,
    },
    {
      path: "/queues",
      name: "Queues",
      component: Queues,
    },
  ],
});

export default router;
