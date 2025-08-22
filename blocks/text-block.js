export default class TextBlock extends Block {
  tagName = "text-block";

  render = `
    <div>
      <slot></slot>
    </div>
  `;

  connectedCallback() {
    super.connectedCallback();

    this.text = this.shadowRoot.querySelector("div");

    if (this.childNodes.length === 0) {
      const textNode = document.createTextNode("some text");
      this.appendChild(textNode);
    }

    let pascalCase;
    try {
      pascalCase = JSON.parse(this.getAttribute("pascal-case"));
    } catch (e) {}

    if (pascalCase) {
      this.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent = node.textContent
            .split("-")
            .slice(0, -1)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");
        }
      });
    }
  }
}
