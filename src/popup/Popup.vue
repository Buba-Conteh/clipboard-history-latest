<script setup lang="ts">
import ClipboardHistory from '~/components/ClipboardHistory.vue'

function openOptionsPage() {
  browser.runtime.openOptionsPage()
}
</script>

<template>
  <main class="w-full min-h-[500px]">

    <ClipboardHistory />
  </main>
</template>

<style>
body {
  margin: 0;
  padding: 0;
}
</style>
