<template>
  <div>
    <div>
      {{ id }}
    </div>
    <div>
      {{ JSON.stringify(stat) }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from "vue";
import router from "../router";
import { corinth } from "../corinth";
import { IQueueStat } from "corinth.js";

export default defineComponent({
  name: "QueueDetails",
  setup() {
    const id = router.currentRoute.value.params.id;

    const stat = ref<IQueueStat | null>(null);

    onMounted(async () => {
      stat.value = await corinth
        .defineQueue(<string>router.currentRoute.value.params.id)
        .stat();
    });

    return { id, stat };
  },
});
</script>

<style></style>
