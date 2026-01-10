<script setup>


import * as VueInstance from 'vue';
import {defineComponent} from 'vue';

const props = defineProps({
  widget: {
    type: Object,
    required: true
  },
  data: {
    required: false
  }
});

const parseStringComponent = (componentString) => {
  try {
    if (typeof componentString !== 'string') {
      return null;
    }

    /** ----------------------------
     *  Extract template - Match the outermost template tag only
     * ---------------------------- */
        // First, find the opening <template> tag (without attributes like #reference)
    const templateStartMatch = componentString.match(/<template(?:\s[^>]*)?>|<template>/i);

    if (!templateStartMatch) {
      console.error('Dynamic component missing <template>');
      return null;
    }

    const templateStartIndex = templateStartMatch.index + templateStartMatch[0].length;

    // Find the matching closing </template> tag by counting nested templates
    let templateDepth = 1;
    let currentIndex = templateStartIndex;
    let templateEndIndex = -1;

    while (currentIndex < componentString.length && templateDepth > 0) {
      const nextOpenTag = componentString.indexOf('<template', currentIndex);
      const nextCloseTag = componentString.indexOf('</template>', currentIndex);

      if (nextCloseTag === -1) {
        console.error('Unclosed <template> tag');
        return null;
      }

      if (nextOpenTag !== -1 && nextOpenTag < nextCloseTag) {
        templateDepth++;
        currentIndex = nextOpenTag + 9; // length of '<template'
      } else {
        templateDepth--;
        if (templateDepth === 0) {
          templateEndIndex = nextCloseTag;
        }
        currentIndex = nextCloseTag + 11; // length of '</template>'
      }
    }

    if (templateEndIndex === -1) {
      console.error('Could not find matching closing </template> tag');
      return null;
    }

    const template = componentString.substring(templateStartIndex, templateEndIndex).trim();

    /** ----------------------------
     *  Extract script (optional)
     * ---------------------------- */
    const scriptMatch = componentString.match(
        /<script>([\s\S]*?)<\/script>/i
    );

    let componentOptions = {};

    if (scriptMatch) {
      const rawScript = scriptMatch[1].trim();

      // Must export default
      if (!/export\s+default/.test(rawScript)) {
        console.error('Dynamic component script must export default');
        return null;
      }

      // Strip "export default"
      const cleanScript = rawScript.replace(
          /export\s+default/,
          'return'
      );

      /**
       * 🔒 Sandbox execution
       * Only allow Vue-related globals
       */
      const factory = new Function(
          'Vue',
          'ElMessage',
          'ElMessageBox',
          cleanScript
      );

      componentOptions = factory(
          VueInstance,
          window?.ELEMENT?.ElMessage,
          window?.ELEMENT?.ElMessageBox
      ) || {};
    }

    return defineComponent({
      ...componentOptions,
      template
    });

  } catch (e) {
    console.error('Failed to parse dynamic Vue component:', e);
    return null;
  }
};


const getDynamicComponent = (component) => {
  // If it's a string, parse it first
  if (typeof component === 'string') {
    const parsed = parseStringComponent(component);
    return parsed ? defineComponent(parsed) : null;
  }

  // If it's already an object, use it directly
  return defineComponent(component);
};


</script>

<template>
  <component
      ref="componentRefs"
      :is="getDynamicComponent(widget.component)"
      :data="data"
      v-bind="{
        ...widget
      }"
  />
</template>

<style scoped>

</style>
