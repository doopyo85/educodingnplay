import { createApp } from 'vue';
import CodeEditor from 'simple-code-editor/CodeEditor.vue';

const app = createApp({
  components: {
    'code-editor': CodeEditor
  }
});

app.mount('#app');

