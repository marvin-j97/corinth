<template>
  <transition name="fade">
    <div class="fixed w-full h-full" v-if="modelValue">
      <div class="w-full h-full flex justify-center content-center relative">
        <div
          class="absolute w-full h-full"
          style="background: #00000077; backdrop-filter: blur(1px)"
          @click="toggle(false)"
        ></div>

        <div class="absolute w-full h-full" style="pointer-events: none">
          <div class="w-full h-full flex justify-center items-center">
            <div
              class="p-4 bg-white rounded shadow-lg flex flex-col"
              style="min-width: 400px; min-height: 250px; pointer-events: auto"
            >
              <div class="text-lg font-bold mb-4">
                <slot name="title"></slot>
              </div>
              <div>
                <slot></slot>
              </div>
              <div style="flex-grow: 1"></div>
              <div class="flex">
                <slot name="actions"></slot>
              </div>
            </div>
          </div>
        </div>
      </div></div
  ></transition>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "CDialog",
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
  },
  setup(_, { emit }) {
    function toggle(value: boolean): void {
      emit("update:modelValue", value);
    }

    return { toggle };
  },
});
</script>

<style lang="scss">
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
