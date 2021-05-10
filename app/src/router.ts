import { createRouter, createWebHashHistory } from "vue-router";

// import Home from "./pages/index.vue";
import Queues from "./pages/queues.vue";
import QueueDetails from "./pages/queue_details.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "Home",
      //component: Home,
      redirect: "/queues",
    },
    {
      path: "/queues",
      name: "Queues",
      component: Queues,
    },
    {
      path: "/queue/:id",
      name: "Queue",
      component: QueueDetails,
    },
  ],
});

export default router;
