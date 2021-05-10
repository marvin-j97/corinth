<template>
  <div class="h-full app">
    <div
      class="fixed w-full shadow-md p-3 flex justify-center align-center"
      id="header"
    >
      <div class="font-bold mr-2">
        Corinth
        <!-- <router-link to="/">Corinth</router-link> -->
      </div>
      <div class="text-medium text-opacity-60">
        <router-link to="/queues">Queues</router-link>
      </div>
    </div>

    <div class="px-3 pt-16" id="content">
      <div class="mx-auto max-w-screen-lg">
        <router-view></router-view>
      </div>
    </div>

    <div id="dialog-target" class="fixed"></div>

    <footer class="p-3 bg-gray-200 text-center mt-auto text-gray-600 text-md">
      <div>
        Corinth version: <span class="font-semibold">{{ version }}</span>
      </div>
      <div>Dashboard version: <span class="font-semibold">0.0.1</span></div>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from "vue";
import { corinth } from "./corinth";

export default defineComponent({
  name: "App",
  setup() {
    const version = ref("");
    const dialog = ref(true);

    onMounted(async () => {
      version.value = await corinth.version();
    });

    return { version, dialog };
  },
});
</script>

<style lang="scss">
#app {
  height: 100%;
}

.app {
  display: flex;
  flex-direction: column;
}

body {
  height: 100vh;
  margin: 0;
}
</style>
