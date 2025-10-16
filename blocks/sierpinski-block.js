export default class SierpinskiBlock extends Block {
  tagName = "sierpinski-block";

  render = `
    <div>
      <slot />
    </div>
  `;
  
  renderSlot = `
  	<scene-block
      class="min-w-[250px] min-h-[300px] bg-white rounded-lg shadow-xl p-4 flex flex-col gap-3 border-solid border-black border-2"
    >
      <iframe
        src="https://www.forresto.com/oldsite/math/sierpinski-animation.html"
        width="500"
        height="500"
      ></iframe>
    </scene-block>
  `;

  connectedCallback() {
    super.connectedCallback();

    this.div = this.shadowRoot.querySelector("div");
  }
}