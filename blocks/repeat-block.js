export default class RepeatBlock extends Block {
  static observedAttributes = [":items", "items"];

  tagName = "repeat-block";

  static defaultAttributes = {};

  render = `
    <style>
      div {
        display: contents;
      }
      ::slotted([slot="repeat"]) {
        display: none !important;
      }
    </style>
    <div>
      <slot name="repeat"></slot>
      <slot></slot>
    </div>
  `;

  connectedCallback() {
    super.connectedCallback();

    this.div = this.shadowRoot.querySelector("div");
    this.defaultSlot = this.shadowRoot.querySelector("slot:not([name])");

    // Support <template slot="repeat">
    const template = this.querySelector('template[slot="repeat"]');
    if (template) {
      this._templateElements = Array.from(template.content.children).map((el) => el.cloneNode(true));

      this.handleItems();
    }
  }

  attributeChangedCallback(name) {
    super.attributeChangedCallback();
    if (name === ":items" || name === "items") {
      this.handleItems(true);
    }
  }

  handleItems() {
    const itemsAttr = this.getAttribute(":items");
    if (!itemsAttr) {
      console.warn("Repeat block not given required prop - :items");
      return;
    }

    if (!this._templateElements?.length) {
      //console.warn("Repeat block has no slotted content");
      return;
    }

    const { evaluated } = this.evaluate(itemsAttr);
    if (evaluated == null || typeof evaluated[Symbol.iterator] !== "function") {
      //console.warn("Items evaluated to non-iterable value");
      return;
    }

    this.store.items = evaluated;

    const defaultAssigned = this.defaultSlot.assignedElements ? this.defaultSlot.assignedElements() : [];

    // Clear light DOM and collect keyed elements
    this._keyedElements = {};
    defaultAssigned.forEach((el) => {
      const key = el.getAttribute?.("key");
      if (key !== undefined || key !== null) this._keyedElements[key] = el;
    });

    // Build new light DOM using a fragment
    const frag = document.createDocumentFragment();
    let i = 0;

    for (const item of evaluated) {
      for (const templateEl of this._templateElements) {
        const node = templateEl.cloneNode(true);
        node.dataset.store = JSON.stringify({ [this.getAttribute("as")]: item, i });

        frag.appendChild(node);
      }
      i++;
    }

    defaultAssigned.forEach((el) => {
      el.remove();
    });

    this.appendChild(frag);
  }
}
