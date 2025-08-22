export default class ToolbarBlock extends Block {
  tagName = "toolbar-block";

  render = `
<style>
div {
  position: absolute;
  width: calc(100% - 24px);
  top: 50px;
  left: 12px;
  background: #F5F5F5;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  box-shadow: 0 20px 10px -20px rgba(0,0,0,0.45) inset;
  opacity: 0;
  animation: fade-in 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
}
</style>
<div>
  <slot></slot>
</div>
  `;

  renderSlot = `
<block-block static class="flex items-center w-full gap-x-2 pt-3 px-3 pb-2">
  <text-block :slot="$targetTagName"></text-block>
  <!--<block-block class="flex flex-col">
    <text-block class="text-sm text-gray-500">Position</text-block>
    <block-block class="flex items-center gap-1">
      <block-block class="flex items-center">
        <text-block class="text-sm -mr-4 pl-2 text-gray-500">X</text-block>
        <input-block class="pl-5 h-5 text-sm rounded-sm border-solid border-1 border-gray-500" resize placeholder="x" type="number" :value="targetX"></input-block>
      </block-block>
      <block-block class="flex items-center">
        <text-block class="text-sm -mr-4 pl-2 text-gray-500">Y</text-block>
        <input-block class="pl-5 h-5 text-sm rounded-sm border-solid border-1 border-gray-500" resize placeholder="y" type="number" :value="targetY"></input-block>
      </block-block>
    </block-block>
  </block-block>
  <block-block class="flex flex-col">
    <text-block class="text-sm text-gray-500">Dimensions</text-block>
    <block-block class="flex items-center gap-1 -ml-1">
      <block-block class="flex items-center">
        <text-block class="text-sm -mr-4 pl-2 text-gray-500">W</text-block>
        <dropdown-block class="text-sm pl-5 h-5 rounded-sm border-solid border-1 border-gray-500" options="2,4,6,8,10,12,24,32,sm,md,lg,xl,2xl,3xl,auto,fit,full" :value="targetWidth"></input-block>
      </block-block>
      <block-block class="flex items-center">
        <text-block class="text-sm -mr-4 pl-2 text-gray-500">H</text-block>
        <input-block class="text-sm pl-5 h-5 rounded-sm border-solid border-1 border-gray-500" resize :value="targetHeight"</input-block>
      </block-block>
    </block-block>
  </block-block>
  <block-block class="flex flex-col">
    <text-block class="text-sm text-gray-500">Typography</text-block>
    <block-block class="flex items-center gap-1">
      <block-block class="flex items-center">
        <text-block class="text-sm -mr-4 pl-2 text-gray-500">+</text-block>
        <dropdown-block class="text-xs pl-5 h-5 rounded-sm border-solid border-1 border-gray-500" options="xs,sm,md,lg,xl,2xl,3xl,4xl" :value="targetFontSize"></input-block>
      </block-block>
  </block-block>-->
  <input-block class="flex-1 w-full font-mono text-xs bg-gray-900 p-2 text-amber-500 rounded-sm" @input="$sourceBlock.props.class = props.value" :value="$sourceBlock.props.class || ''"></input-block>
</block-block>
  `;

  connectedCallback() {
    super.connectedCallback();

    const uuid = this.getAttribute("target");
    this.store.sourceBlock = window.blockTree[uuid].block;

    this.observer = new MutationObserver(this.mutationCallback.bind(this));
    this.observer.observe(this.store.sourceBlock, {
      attributes: true,
    });

    this.addEventListener("set:targetX", (e) => {
      e.stopPropagation();

      this.store.targetX = e.detail.value;
      this.store.sourceBlock.setAttribute("x", e.detail.value);
    });

    this.addEventListener("set:targetY", (e) => {
      e.stopPropagation();

      this.store.targetY = e.detail.value;
      this.sourceBlock.setAttribute("y", e.detail.value);
    });

    this.addEventListener("set:targetWidth", (e) => {
      e.stopPropagation();

      if (!e.detail.value || e.detail.value === "-") {
        return;
      }

      this.store.targetWidth = e.detail.value;
      const classList = this.sourceBlock.classList;
      const widthClass = Array.from(classList).find((c) => c.startsWith("w-"));
      if (widthClass) {
        this.sourceBlock.classList.remove(widthClass);
      }
      this.sourceBlock.classList.add(`w-${e.detail.value}`);
    });

    this.addEventListener("set:targetHeight", (e) => {
      e.stopPropagation();

      this.store.targetHeight = e.detail.value;
    });

    this.addEventListener("set:targetFontSize", (e) => {
      e.stopPropagation();

      if (!e.detail.value || e.detail.value === "-") {
        return;
      }

      this.store.targetFontSize = e.detail.value;
      const classList = this.sourceBlock.classList;
      const fontSizeClass = Array.from(classList).find((c) => c.startsWith("text-") && c.split("-")[1].length < 4);
      if (fontSizeClass) {
        this.sourceBlock.classList.remove(fontSizeClass);
      }
      this.sourceBlock.classList.add(`text-${e.detail.value}`);
    });

    this.mutationCallback();
  }

  remove() {
    const div = this.shadowRoot.querySelector("div");
    if (div) {
      setTimeout(() => {
        super.remove();
      }, 100);
    } else {
      super.remove();
    }
  }

  mutationCallback() {
    this.store.sourceBlock = window.blockTree[this.getAttribute("target")].block;

    this.store.targetClass = this.store.sourceBlock.className;

    this.store.targetTagName = this.store.sourceBlock.tagName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    this.store.targetX = this.store.sourceBlock.getAttribute("x");
    this.store.targetY = this.store.sourceBlock.getAttribute("y");

    const classList = Array.from(this.store.sourceBlock.classList);

    const widthClass = classList.find((className) => className.startsWith("w-"));
    this.store.targetWidth = widthClass?.replace("w-", "") || "-";

    const heightClass = classList.find((className) => className.startsWith("h-"));
    this.store.targetHeight = heightClass?.replace("h-", "") || "-";

    const fontSizeClass = Array.from(classList).find((c) => c.startsWith("text-") && c.split("-")[1].length < 4);
    this.store.targetFontSize = fontSizeClass?.replace("text-", "") || "-";
  }

  disconnectedCallback() {
    super.disconnectedCallback && super.disconnectedCallback();

    this.observer.disconnect();
  }
}
