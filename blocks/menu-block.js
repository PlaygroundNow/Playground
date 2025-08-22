export default class Menu extends Block {
  tagName = "menu-block";

  static defaultAttributes = {
    class: "bg-white rounded-sm flex flex-col shadow-lg z-[9999] pb-2",
  };

  render = `
    <div>
      <slot></slot>
    </div>
  `;

  connectedCallback() {
    super.connectedCallback();

    this._handleClickOutside = this.handleClickOutside.bind(this);
    document.addEventListener("click", this._handleClickOutside);
    document.addEventListener("contextmenu", this._handleClickOutside);
  }

  disconnectedCallback() {
    super.disconnectedCallback && super.disconnectedCallback();

    document.removeEventListener("click", this._handleClickOutside);
    document.removeEventListener("contextmenu", this._handleClickOutside);
  }

  handleClickOutside(e) {
    if (!this.contains(e.target)) {
      this.parentElement.remove();
    }
  }
}
