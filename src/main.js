import { createApp } from 'vue';
import App from './App.vue';  // App.vue 컴포넌트 가져오기
import CodeEditor from 'simple-code-editor/CodeEditor.vue';  // Simple Code Editor 컴포넌트 가져오기

const app = createApp(App);

// Simple Code Editor 컴포넌트 전역 등록
app.component('code-editor', CodeEditor);

app.mount('#app');

