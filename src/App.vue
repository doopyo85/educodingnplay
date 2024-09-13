<template>
  <div id="app">
    <h1>Vue + Simple Code Editor</h1>
    <code-editor
      theme="github-dark"
      :line-nums="true"
      :languages="[['cpp', 'C++'], ['python', 'Python']]"
    ></code-editor>
  </div>
</template>

<script>
export default {
  name: 'App',
};
</script>

<style>
/* 스타일 추가 가능 */
</style>

