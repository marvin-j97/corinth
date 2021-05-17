<template>
  <div>
    <div class="mb-4 flex items-center" v-if="stat">
      <div>
        <span class="font-bold text-gray-600">
          <router-link class="hover:text-blue-600" to="/queues"
            >Queues</router-link
          >
        </span>
        > <span class="font-semibold text-gray-600">{{ stat.name }}</span>
      </div>
      <div class="flex-grow"></div>
      <!-- TODO: -->
      <!-- <div>Delete</div> -->
    </div>
    <div v-if="stat">
      <div class="mt-3 text-sm font-bold text-gray-500 uppercase">General</div>
      <div>
        Created at {{ new Date(stat.created_at * 1000).toLocaleString() }}
      </div>
      <div>Persistent: {{ stat.persistent ? "Yes" : "No" }}</div>
      <div class="mt-3 text-sm font-bold text-gray-500 uppercase">Messages</div>
      <div>
        # queued: {{ stat.size }}<span>/{{ stat.max_length || "∞" }}</span>
      </div>
      <div># in flight: {{ stat.num_unacknowledged }} messages</div>
      <div># deduplicating: {{ stat.num_deduplicating }} messages</div>
      <div># deduplicated: {{ stat.num_deduplicated }} messages</div>
      <div># requeued: {{ stat.num_requeued }} messages</div>
      <div># acknowledged: {{ stat.num_acknowledged }} messages</div>
      <div class="mt-3 text-sm font-bold text-gray-500 uppercase">Timers</div>
      <div>Deduplication time: {{ stat.deduplication_time }} seconds</div>
      <div>Requeue time: {{ stat.requeue_time }} seconds</div>
      <div class="mt-3 text-sm font-bold text-gray-500 uppercase">
        Space usage
      </div>
      <div>Disk size: {{ stat.disk_size }} bytes</div>
      <div>Memory size: {{ stat.memory_size }} bytes</div>

      <div class="mt-3" v-if="stat.dead_letter">
        <div class="text-sm font-bold text-gray-500 uppercase">
          Dead letter queue
        </div>
        <div>
          <div>
            Name:
            <router-link
              class="hover:text-blue-600 font-semibold"
              :to="`/queue/${stat.dead_letter.name}`"
              >{{ stat.dead_letter.name }}</router-link
            >
          </div>
          <div>Threshold: {{ stat.dead_letter.threshold }}</div>
        </div>
      </div>

      <div class="mt-10 mb-5 p-3 shadow border rounded">
        <div class="mb-3 text-gray-500 font-semibold">
          JSON response (beautified)
        </div>
        <pre style="font-family: monospace">{{
          JSON.stringify(stat, null, 2)
        }}</pre>
        <div class="mt-3">
          <a
            class="hover:text-blue-600 font-semibold text-sm"
            :href="`/queue/${stat.name}`"
            target="_blank"
            >Open in new tab</a
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, watch } from "vue";
import router from "../router";
import { corinth } from "../corinth";
import type { IQueueStat } from "corinth.js";

export default defineComponent({
  name: "QueueDetails",
  setup() {
    const stat = ref<IQueueStat | null>(null);

    async function loadData() {
      stat.value = null;
      stat.value = await corinth
        .defineQueue(<string>router.currentRoute.value.params.id)
        .stat();
    }

    watch(router.currentRoute, loadData);

    onMounted(async () => {
      await loadData();
    });

    return { stat };
  },
});
</script>

<style></style>
