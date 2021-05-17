<template>
  <Teleport to="#dialog-target">
    <c-dialog
      :modelValue="modelValue"
      @update:modelValue="toggle"
      render-target="#dialog-target"
    >
      <template v-slot:title>Create queue</template>
      <template v-slot:actions>
        <div style="flex-grow: 1"></div>
        <button
          :disabled="
            !queueName ||
            (useDeadLetterQueue &&
              (!deadLetterQueueName || deadLetterThreshold <= 0))
          "
          class="
            bg-blue-700
            font-bold
            py-2
            px-5
            rounded-lg
            disabled:bg-gray-300
            text-white
          "
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
          class="
            rounded
            px-4
            py-3
            focus:outline-none
            bg-gray-200
            w-full
            font-semibold
            text-sm
          "
        />
        <div
          class="mt-1 mb-3 text-sm opacity-60 font-medium"
          :style="{
            opacity: queueName !== slug ? undefined : 0,
          }"
        >
          Will be created as <b>{{ slug }}</b>
        </div>
        <div>
          <input type="checkbox" v-model="queuePersistent" />
          <div class="inline-block ml-2 font-semibold text-sm opacity-80">
            Persistent
          </div>
        </div>
        <div>
          <input type="checkbox" v-model="useDeadLetterQueue" />
          <div class="inline-block ml-2 font-semibold text-sm opacity-80">
            Use dead letter queue
          </div>
        </div>
        <div class="p-3">
          <div class="text-sm font-semibold text-gray-700">
            Select dead letter queue
          </div>
          <select :disabled="!useDeadLetterQueue" v-model="deadLetterQueueName">
            <option v-for="name in queues" :key="name" :value="name">
              {{ name }}
            </option>
          </select>
          <div>
            <div class="text-sm font-semibold text-gray-700">
              Dead letter queue threshold
            </div>
            <input
              :disabled="!useDeadLetterQueue"
              type="number"
              v-model.number="deadLetterThreshold"
              placeholder="Enter number"
            />
          </div>
        </div>
      </div>
    </c-dialog>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import slugify from "@sindresorhus/slugify";

import { corinth } from "../corinth";

export default defineComponent({
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    queues: {
      type: Array,
      required: false,
      default: [],
    },
  },
  setup(_props, { emit }) {
    const queueName = ref("");
    const queuePersistent = ref(true);
    const queueDeduplicationTime = ref(300);
    const queueRequeueTime = ref(300);
    const queueMaxLength = ref(0);

    const useDeadLetterQueue = ref(false);
    const deadLetterQueueName = ref("");
    const deadLetterThreshold = ref(3);

    const slug = computed(() => slugify(queueName.value));

    function toggle(value: boolean): void {
      emit("update:modelValue", value);
    }

    async function createQueue() {
      try {
        const dlq = deadLetterQueueName.value
          ? corinth.defineQueue(deadLetterQueueName.value)
          : undefined;

        await corinth.defineQueue(slug.value).ensure({
          deduplication_time: queueDeduplicationTime.value,
          requeue_time: queueRequeueTime.value,
          persistent: queuePersistent.value,
          max_length: queueMaxLength.value,
          dead_letter_queue: dlq,
          dead_letter_queue_threshold: deadLetterThreshold.value,
        });
        // router.push(`/queue/${slug.value}`);
        emit("created", slug.value);
        queueName.value = "";
      } catch (error) {
        console.error(error.message);
      }
    }

    return {
      toggle,

      queueName,
      queuePersistent,

      slug,

      createQueue,

      useDeadLetterQueue,
      deadLetterQueueName,
      deadLetterThreshold,
    };
  },
});
</script>
