<template>
  <div>
    <table class="min-w-max w-full table-auto shadow">
      <thead>
        <tr
          class="bg-gray-200 text-gray-600 uppercase text-sm leading-normal font-semibold"
        >
          <td
            class="py-3 px-1 text-left"
            v-for="header in tableHeaders"
            :key="header"
            :title="header.tooltip"
            :class="{
              tooltip: !!header.tooltip,
            }"
          >
            {{ header.title }}
          </td>
        </tr>
      </thead>
      <tbody class="text-gray-600 text-sm">
        <tr class="border-b border-gray-200 hover:bg-gray-200">
          <td
            @click="createDialog = true"
            colspan="7"
            class="py-3 px-1 text-left whitespace-nowrap font-semibold cursor-pointer"
          >
            + Create new queue
          </td>
        </tr>
        <tr
          class="border-b border-gray-200"
          v-for="queue in queues"
          :key="queue.name"
        >
          <td class="py-3 px-1 text-left whitespace-nowrap font-semibold">
            <router-link :to="`/queue/${queue.name}`">
              <span class="hover:text-blue-600">{{ queue.name }}</span>
            </router-link>
          </td>
          <td class="py-3 px-1 text-left whitespace-nowrap">
            {{ new Date(queue.created_at * 1000).toLocaleString() }}
          </td>
          <td class="py-3 px-1 text-left whitespace-nowrap">
            {{ queue.size }}
          </td>
          <td class="py-3 px-1 text-left whitespace-nowrap">
            {{ queue.num_unacknowledged }}
          </td>
          <td class="py-3 px-1 text-left whitespace-nowrap">
            {{ queue.num_acknowledged }}
          </td>
          <td class="py-3 px-1 text-left whitespace-nowrap">
            {{ queue.memory_size }} bytes
          </td>
          <td class="py-3 px-1 text-left whitespace-nowrap">
            {{ queue.persistent ? "Yes" : "No" }}
          </td>
        </tr>
      </tbody>
    </table>

    <Teleport to="#dialog-target">
      <c-dialog v-model="createDialog" render-target="#dialog-target">
        <template v-slot:title>Create queue</template>
        <template v-slot:actions>
          <div style="flex-grow: 1"></div>
          <button
            :disabled="!queueName"
            class="bg-blue-700 font-bold py-2 px-5 rounded-lg disabled:bg-gray-300 text-white"
            @click="createQueue"
          >
            Create
          </button>
          <div style="flex-grow: 1"></div>
        </template>
        <div>
          <input
            type="text"
            v-model="queueName"
            placeholder="Queue name"
            spellcheck="false"
            class="rounded px-4 py-3 focus:outline-none bg-gray-200 w-full font-semibold text-sm"
          />
          <div
            class="mt-1 mb-3 text-sm opacity-60 font-medium"
            :style="{
              opacity: queueName !== slug ? undefined : 0,
            }"
          >
            Will be created as <b>{{ slug }}</b>
          </div>
          <input type="checkbox" v-model="queuePersistent" />
          <div class="inline-block ml-2 font-semibold text-sm opacity-80">
            Persistent
          </div>
        </div>
      </c-dialog>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref } from "vue";
import { IQueueStat } from "corinth.js";
import { corinth } from "../corinth";
import slugify from "@sindresorhus/slugify";
import router from "../router";

export default defineComponent({
  name: "Queues",
  setup() {
    const tableHeaders = [
      {
        title: "Name",
      },
      {
        title: "Creation date",
      },
      {
        title: "Size",
      },
      {
        title: "In flight",
        tooltip: "Unacknowledged messages",
      },
      {
        title: "Successful",
        tooltip: "Acknowledged ('ack') messages",
      },
      {
        title: "Memory size",
      },
      {
        title: "Persistent",
      },
    ];
    const queues = ref<IQueueStat[]>([]);

    const createDialog = ref(false);
    const queueName = ref("");
    const queuePersistent = ref(true);
    const queueDeduplicationTime = ref(300);
    const queueRequeueTime = ref(300);
    const queueMaxLength = ref(0);

    const slug = computed(() => slugify(queueName.value));

    async function createQueue() {
      try {
        await corinth.defineQueue(slug.value).ensure({
          deduplication_time: queueDeduplicationTime.value,
          requeue_time: queueRequeueTime.value,
          persistent: queuePersistent.value,
          max_length: queueMaxLength.value,
          // dead_letter_queue:
          // dead_letter_queue_threshold: 3
        });
        router.push(`/queue/${slug.value}`);
      } catch (error) {}
    }

    onMounted(async () => {
      queues.value = await corinth.listQueues();
    });

    return {
      queues,
      tableHeaders,
      createDialog,
      queueName,
      queuePersistent,
      slug,
      createQueue,
    };
  },
});
</script>

<style lang="scss">
button {
  &:disabled {
    cursor: not-allowed;
  }
}

tbody {
  tr:nth-child(even) {
    background: #f5f5f5;
  }
}

.tooltip {
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-position: under;
}
</style>
