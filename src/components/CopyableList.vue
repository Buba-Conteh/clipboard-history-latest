<template>
    <div class="">
        <div 
            class="flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
            @click="copyToClipboard"
        >
            <input 
                type="checkbox" 
                class="mr-3 rounded text-green-500 focus:ring-green-500 h-4 w-4"
                @click.stop
            >
            <div 
                class="flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium" 
                :class="isCopied ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'"
            >
                {{ isCopied ? 'COPIED' : '' }}
            </div>
            <div class="flex-grow mx-3 truncate text-sm">{{ description }}</div>
            <div class="flex items-center space-x-1 item-actions">
                <button class="p-1 text-gray-400 hover:text-green-500" @click.stop>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                </button>
                <button class="p-1 text-gray-400 hover:text-green-500" @click.stop>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
            <div class="ml-1 text-xs text-gray-400">{{ count }}</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { defineComponent, PropType, ref } from 'vue';

const name = 'ListItem'
const props = defineProps({
    title: {
        type: String as PropType<string>,
        required: true
    },
    description: {
        type: String as PropType<string>,
        required: true
    },
    time: {
        type: String as PropType<string>,
        required: true
    },
    count: {
        type: Number as PropType<number>,
        required: true
    }
});

// State for tracking copy status
const isCopied = ref(false);

// Function to copy text to clipboard
const copyToClipboard = () => {
    navigator.clipboard.writeText(props.description)
        .then(() => {
            // Set copied state to true
            isCopied.value = true;
            
            // Reset the copied state after 2 seconds
            setTimeout(() => {
                isCopied.value = false;
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
        });
};
</script>

<style scoped>
.list-item {
    padding: 10px;
    border: 1px solid #ccc;
    margin-bottom: 10px;
}
</style>