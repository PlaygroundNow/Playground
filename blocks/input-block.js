export default class InputBlock extends Block {
  static observedAttributes = ["value", "class", "placeholder"];
  tagName = "input-block";

  static defaultAttributes = {
    class: "px-2 py-1 rounded-sm border-solid border-2 border-black bg-[#f5f5f5] hover:bg-[#ddd] active:bg-[#ddd]",
  };

  render = `
    <style>
      input::-webkit-outer-spin-button,
      input::-webkit-inner-spin-button {
        display: none;
      }
    </style>
    <input type="${this.getAttribute("type") || "text"}" placeholder="${
    this.getAttribute("placeholder") || ""
  }" />
  `;

  connectedCallback() {
    super.connectedCallback();

    this.input = this.shadowRoot.querySelector("input");

    this.input.addEventListener("input", (event) => {
      if (this.hasAttribute("focus")) {
        this.setAttribute(
          "focus",
          JSON.stringify({
            start: this.input.selectionStart,
            end: this.input.selectionEnd,
          })
        );
      }

      this.setAttribute("value", event.target.value);
    });

    this.input.addEventListener("focus", () => {
      this.setAttribute("focus", this.getAttribute("focus") || "focus");
    });

    this.input.addEventListener("blur", () => {
      this.removeAttribute("focus");
    });
    
    if (this.hasAttribute("value")) {
    	this.input.value = this.getAttribute('value');
    }

    if (this.hasAttribute("focus")) {
      this.input.focus();
      const val = this.input.value;
      if (this.hasAttribute("focus")) {
        try {
          const focus = JSON.parse(this.getAttribute("focus"));
          if (focus && typeof focus.start === "number" && typeof focus.end === "number") {
            this.input.setSelectionRange(focus.start, focus.end);
          } else {
            this.input.setSelectionRange(val.length, val.length);
          }
        } catch {
          this.input.setSelectionRange(val.length, val.length);
        }
      } else {
        this.input.setSelectionRange(val.length, val.length);
      }
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback(name, oldValue, newValue);

    if (!this.input) return;

    if (name === "value" && newValue) {
      this.input.value = newValue;

      if (this.hasAttribute("resize")) {
        this.rootElement.style.width = newValue.length + 5 + "ch";
      }
    }

    if (name === "placeholder" && newValue) {
      this.rootElement.placeholder = newValue;
    }
  }
}
