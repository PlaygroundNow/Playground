export default class LinkBlock extends Block {
  tagName = "link-block";

  static observedAttributes = ["x", "y", "class", "data-store", "href"];

  static defaultAttributes = {
    class: "underline text-blue-500",
  };

  render = `
    <a>
      <slot />
    </a>
  `;

  connectedCallback() {
    super.connectedCallback();

    this.a = this.shadowRoot.querySelector("a");

    const slot = this.shadowRoot.querySelector("slot");
    if (slot.assignedNodes().length === 0) {
      this.a.textContent = "my awesome link";
    }

    if (this.hasAttribute("href")) {
      this.a.setAttribute("href", this.getAttribute("href") || "", false);
    }

    if (this.hasAttribute("download")) {
      this.a.setAttribute("download", this.getAttribute("download") || "", false);
    }

    if (this.hasAttribute("target")) {
      this.a.setAttribute("target", this.getAttribute("target") || "", false);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (!this.a) return;

    if (name === "href" && oldValue !== newValue) {
      this.a.setAttribute("href", newValue || "", false);
    }

    if (name === "download" && oldValue !== newValue) {
      this.a.setAttribute("download", newValue || "", false);
    }

    if (name === "target" && oldValue !== newValue) {
      this.a.setAttribute("target", newValue || "", false);
    }
  }
}
