<script setup lang="ts">
import ClipboardHistory from '~/components/ClipboardHistory.vue'

function openOptionsPage() {
  browser.runtime.openOptionsPage()
}
</script>

<template>
  <main class="w-full h-ful">
    <ClipboardHistory />
  </main>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  height: 100vh;
  overflow: hidden;
}
</style>
