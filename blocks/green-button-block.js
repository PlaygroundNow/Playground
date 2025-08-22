export default class GreenButtonButton extends Block {
  tagName = "green-button-block";

  static defaultAttributes = {
    class: "bg-green-500 rounded-sm cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-200",
  };

  render = `
    <button>
      <slot>
    </button>
  `;

  connectedCallback() {
    super.connectedCallback();

    this.button = this.shadowRoot.querySelector("button");

    const slot = this.shadowRoot.querySelector("slot");
    if (slot.assignedNodes().length === 0) {
      this.button.textContent = "my awesome button";
    }
  }
}
