<template>
  <div>
    <h1>Vue IDE</h1>
    <code-editor theme="github-dark" :line-nums="true" :languages="[['cpp', 'C++'], ['python', 'Python']]"></code-editor>
  </div>
</template>

<script>
import CodeEditor from 'simple-code-editor'

export default {
  name: 'App',
  components: {
    CodeEditor
  }
}
</script>
