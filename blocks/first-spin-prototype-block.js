export default class FirstSpinPrototypeBlock extends Block {
  tagName = "first-spin-prototype-block";

  render = `
    <div>
      <slot />
    </div>
  `;
  
  renderSlot =`
  	<scene-block
      x="3166"
      y="1162"
      class="min-w-[250px] min-h-[300px] bg-white rounded-lg shadow-xl p-4 flex flex-col gap-3 border-solid border-black border-2"
    >
      <flex-block static class="flex-col">
        <button-block>Fetch</button-block>
        <button-block @click="$djs = [];">Clear</button-block>
        <repeat-block :items="$djs.slice(0, 20)" as="dj">
          <template slot="repeat">
            <text-block :slot="$dj.email"></text-block>
          </template>
        </repeat-block>
      </flex-block>
    </scene-block>
  `;

  connectedCallback() {
    super.connectedCallback();

    this.div = this.shadowRoot.querySelector("div");
  }
}