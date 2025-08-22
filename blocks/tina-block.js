export default class TinaBlock extends Block {
  tagName = "tina-block";

  render = `
    <div>
      <slot />
    </div>
  `;

  connectedCallback() {
    super.connectedCallback();
    
    alert('TINNNAAAA!')

    this.div = this.shadowRoot.querySelector("div");

    const slot = this.shadowRoot.querySelector("slot");
    if (slot.assignedNodes().length === 0) {
      this.div.textContent = "my awesome block";
    }
  }
}