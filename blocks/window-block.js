export default class Window extends Block {
  tagName = "window-block";

  render = `
<style>
.window {
  background: #ffffffee;
  align-items: center;
  border-radius: 4px;
  border: 1px solid black;
}
.window-nav {
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 16px;
  padding: 2px 6px;
  height: 24px;
  max-width: 100%;
  background: white;
  border-radius: 4px 4px 0 0;
  border-bottom: 1px solid #ccc;
  text-transform: capitalize;
}
.nav-button {
  background: none;
  outline: none;
  border: 0;
}
.nav-button svg {
  height: 12px;
  width: 12px;
}
</style>
<div class="window">
  <div class="window-nav">
    <slot name="nav-title">This is a window!</slot>
    <div>
      <button class="nav-button nav-close">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>
      </button>
    </div>
  </div>
  <slot>
</div>`;

  constructor() {
    super();
    this.space = document.querySelector("world-block").shadowRoot.querySelector(".space");
  }

  disconnectedCallback() {
    super.disconnectedCallback && super.disconnectedCallback();

    document.removeEventListener("mousemove", this._handleMove);
    document.removeEventListener("mouseup", this._handleMove);
    document.removeEventListener("touchmove", this._handleMove);
    document.removeEventListener("touchend", this._handleMove);
  }

  connectedCallback() {
    super.connectedCallback();

    this.window = this.shadowRoot.querySelector(".window");
    this.windowNav = this.shadowRoot.querySelector(".window-nav");
    this.closeButton = this.shadowRoot.querySelector(".nav-close");

    this.closeButton.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    this.closeButton.addEventListener("click", (e) => {
      this.dispatchEvent(new CustomEvent("window-block:close", { bubbles: true }));
      this.remove();
    });

    this.windowNav.addEventListener("mousedown", this.mouseDown.bind(this), true);
    //this.windowNav.addEventListener("touchstart", this.mouseDown.bind(this));

    // Save bound handler for removal
    this._handleMove = this.handleMove.bind(this);

    document.addEventListener("mousemove", this._handleMove);
    document.addEventListener("mouseup", this._handleMove);
    //document.addEventListener("touchmove", this._handleMove);
    //document.addEventListener("touchend", this._handleMove);

    if (this.hasAttribute("x") && this.hasAttribute("y")) {
      this.window.style.transform = `translate(${this.getAttribute("x")}px, ${this.getAttribute("y")}px)`;
    }

    if (this.getAttribute("closable") === "false") {
      this.closeButton.style.display = "none";
    }
  }

  mouseUp(e) {
    this.dragging = false;
  }

  mouseDown(e) {
    if (!this.windowNav.contains(e.target) && e.target.slot !== "nav-title") return;

    e.preventDefault();

    this.dragging = true;
    this.startRect = {
      x: Number(this.getAttribute("x")) || 0,
      y: Number(this.getAttribute("y")) || 0,
    };

    this.dragStartX = e.pageX;
    this.dragStartY = e.pageY;
  }

  handleMove(e) {
    if (!this.dragging) return;

    const point = e.touches ? e.touches[0] : e;
    const deltaX = point.pageX - this.dragStartX;
    const deltaY = point.pageY - this.dragStartY;

    const maxX = this.space.offsetWidth - this.window.offsetWidth;
    const maxY = this.space.offsetWidth - this.window.offsetHeight;

    const newX = Math.max(0, Math.min(this.startRect.x + deltaX, maxX));
    const newY = Math.max(0, Math.min(this.startRect.y + deltaY, maxY));

    this.window.style.transform = `translate(${newX}px, ${newY}px)`;
    this.setAttribute("x", newX);
    this.setAttribute("y", newY);
  }

  handleEnd() {
    this.dragging = false;
  }
}
