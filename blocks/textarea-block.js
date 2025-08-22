export default class TextareaBlock extends Block {
  static observedAttributes = ["value", "class", "placeholder", "rows", "cols"];
  tagName = "textarea-block";

  static defaultAttributes = {
    class: "!font-mono !text-sm px-2 py-1 rounded-sm border-solid border-1 border-black bg-[#f5f5f5] hover:bg-[#ddd] active:bg-[#ddd]",
  };

  render = `
    <style>
      textarea {
      	resize: both;
        font-family: inherit;
        font-size: inherit;
        width: 100%;
        box-sizing: border-box;
      }
    </style>
    <textarea
      placeholder="${this.getAttribute("placeholder") || ""}"
      class="${this.getAttribute("class") || ""}"
      style="width: ${this.getAttribute("width") || ""}; height: ${this.getAttribute("height") || ""};"
    >${this.getAttribute("value") || ""}</textarea>
  `;

  connectedCallback() {
    super.connectedCallback();

    this.textarea = this.shadowRoot.querySelector("textarea");

    // Record size on mouseup after resize
    this.textarea.addEventListener("mouseup", () => {
      // Use getBoundingClientRect to get pixel size
      const rect = this.textarea.getBoundingClientRect();
      this.setAttribute("width", `${Math.round(rect.width)}px`);
      this.setAttribute("height", `${Math.round(rect.height)}px`);
    });

    this.textarea.addEventListener("input", (event) => {
      if (this.hasAttribute("focus")) {
        this.setAttribute(
          "focus",
          JSON.stringify({
            start: this.textarea.selectionStart,
            end: this.textarea.selectionEnd,
          })
        );
      }
      this.setAttribute("value", event.target.value);
    });

    this.textarea.addEventListener("focus", () => {
      this.setAttribute("focus", this.getAttribute("focus") || "focus");
    });

    this.textarea.addEventListener("blur", () => {
      this.removeAttribute("focus");
    });

    if (this.hasAttribute("focus")) {
      this.textarea.focus();
      const val = this.textarea.value;
      try {
        const focus = JSON.parse(this.getAttribute("focus"));
        if (focus && typeof focus.start === "number" && typeof focus.end === "number") {
          this.textarea.setSelectionRange(focus.start, focus.end);
        } else {
          this.textarea.setSelectionRange(val.length, val.length);
        }
      } catch {
        this.textarea.setSelectionRange(val.length, val.length);
      }
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (!this.textarea) return;

    if (name === "value" && oldValue !== newValue) {
      this.textarea.innerHTML = newValue || "";
    }

    if (name === "placeholder") {
      this.textarea.placeholder = newValue || "";
    }

    if (name === "width") {
      this.textarea.style.width = newValue || "";
    }

    if (name === "height") {
      this.textarea.style.height = newValue || "";
    }
  }
}
