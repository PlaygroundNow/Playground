export default class DropdownBlock extends Block {
  static observedAttributes = ["value", "options"];
  tagName = "dropdown-block";

  render = `
    <select></select>
  `;

  connectedCallback() {
    super.connectedCallback();

    this.shadowRoot.innerHTML = this.render;
    this.select = this.shadowRoot.querySelector("select");

    // Parse options from attribute (expects a JSON array or comma-separated string)
    this.updateOptions();

    // Set initial value if present
    if (this.hasAttribute("value")) {
      this.select.value = this.getAttribute("value");
    }

    // Listen for changes and update :value attribute
    this.select.addEventListener("change", (event) => {
      this.setAttribute("value", event.target.value);
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback?.(name, oldValue, newValue);

    if (name === "options") {
      this.updateOptions();
    }
    if (name === "value" && this.select) {
      this.select.value = newValue;
    }
  }

  updateOptions() {
    if (!this.select) return;
    let options = this.getAttribute("options");
    if (!options) return;

    // Support both JSON array and comma-separated string
    try {
      options = JSON.parse(options);
    } catch {
      options = options.split(",").map((v) => v.trim());
    }

    this.select.innerHTML = "";
    options.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = opt;
      this.select.appendChild(option);
    });
  }
}
