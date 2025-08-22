export default class MenuItemBlock extends Block {
  static observedAttributes = ["icon", "text"];

  tagName = "menu-item-block";

  static defaultAttributes = {
    class: "flex items-center bg-white hover:bg-gray-100 shadow-sm px-4 py-4 text-sm cursor-pointer",
  };

  render = `
  <style>
  div {
    padding-top: 4px;
    padding-bottom: 4px;
  }
    div:hover {
      background: #eee;
    }
    span {
      margin-left: 8px;
    }
  </style>
  <div>
    ${
      this.hasAttribute("icon")
        ? `<img src="/assets/img/${this.getAttribute("icon")}.svg" alt="${this.text}" width="18">`
        : ""
    }
    ${this.hasAttribute("text") ? `<span class="text-sm">${this.getAttribute("text")}</span>` : ""}
    <slot></slot>
  </div>`;

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener("click", this.handleClick.bind(this));
  }

  handleClick() {
    document.querySelectorAll("flex-block[menu-block]").forEach((el) => {
      el.remove();
    });
  }
}
