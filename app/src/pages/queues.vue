<template>
  <div>
    <div class="flex items-center mb-4">
      <div class="font-bold text-gray-600">
        {{ foundQueues.length }}
        {{ foundQueues.length === 1 ? "queue" : "queues" }} found
      </div>
      <div class="flex-grow"></div>
      <div>
        <input
          class="
            font-semibold
            shadow
            appearance-none
            border
            rounded
            w-full
            py-2
            px-3
            text-gray-700
            leading-tight
            focus:outline-none
            focus:shadow-outline
          "
          placeholder="Search"
          v-model="searchTerm"
        />
      </div>
    </div>

    <table class="min-w-max w-full table-auto shadow">
      <thead>
        <tr
          class="
            bg-gray-200
            text-gray-600
            uppercase
            text-sm
            leading-normal
            font-semibold
          "
        >
          <td
            class="py-3 px-2 text-left"
            v-for="header in tableHeaders"
            :key="header.title"
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
            :colspan="8"
            class="
              py-3
              px-1
              text-left
              whitespace-nowrap
              font-semibold
              cursor-pointer
            "
          >
            + Create new queue
          </td>
        </tr>
        <tr
          class="border-b border-gray-200"
          v-for="queue in foundQueues"
          :key="queue.name"
        >
          <td class="py-3 px-2 text-left whitespace-nowrap font-semibold">
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
          <td
            class="py-3 px-1 text-left whitespace-nowrap tooltip"
            :title="bytesToReadableFormats(queue.disk_size)"
          >
            {{ queue.disk_size }} bytes
          </td>
          <td
            class="py-3 px-1 text-left whitespace-nowrap tooltip"
            :title="bytesToReadableFormats(queue.memory_size)"
          >
            {{ queue.memory_size }} bytes
          </td>
          <td class="py-3 px-1 text-left whitespace-nowrap">
            <i> {{ queue.persistent ? "Yes" : "No" }}</i>
          </td>
        </tr>
      </tbody>
    </table>

    <create-queue-dialog
      :modelValue="createDialog"
      @update:modelValue="createDialog = $event"
      @created="onQueueCreated"
      :queues="queues.map((c) => c.name)"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, computed } from "vue";
import type { IQueueStat } from "corinth.js";

import { corinth } from "../corinth";
import CreateQueueDialog from "../components/create_queue_dialog.vue";

export default defineComponent({
  name: "Queues",
  components: {
    CreateQueueDialog,
  },
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
        title: "Disk size",
      },
      {
        title: "Memory size",
      },
      {
        title: "Persistent",
      },
    ];
    const queues = ref<IQueueStat[]>([]);

    const searchTerm = ref("");
    const createDialog = ref(false);

    onMounted(async () => {
      queues.value = await corinth.listQueues();
    });

    function bytesToReadableFormats(bytes: number): string {
      const formats: [number, string][] = [
        [1000, "KB"],
        [1000 * 1000, "MB"],
        [1000 * 1000 * 1000, "GB"],
      ];

      return formats
        .map(([div, unit]) => `${(bytes / div).toFixed(2)} ${unit}`)
        .join("\n");
    }

    const foundQueues = computed(() => {
      return queues.value.filter(({ name }) => {
        if (!searchTerm.value.length) {
          return true;
        }
        return name.toLowerCase().includes(searchTerm.value.toLowerCase());
      });
    });

    async function onQueueCreated() {
      createDialog.value = false;
      queues.value = await corinth.listQueues();
    }

    return {
      tableHeaders,

      queues,
      foundQueues,
      searchTerm,

      createDialog,

      bytesToReadableFormats,

      onQueueCreated,
    };
  },
});
</script>

<style lang="scss">
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
