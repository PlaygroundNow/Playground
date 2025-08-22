export default class Cursor extends Block {
  tagName = "cursor-block";

  static defaultAttributes = {
    class: "w-4 h-4",
  };

  render = `
    <div>
        <slot></slot>
    </div>
  `;

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();

    const player = localStorage.getItem("playerId");

    const cursorUrl = this.getAttribute("cursor-url") || "/assets/img/cursor.png";
    const grabbedUrl = this.getAttribute("grabbed-url") || "/assets/img/grabbed.png";

    //console.log(player, this.getAttribute("player"));

    if (player === this.getAttribute("player")) {
      // Do nothing for current player
      /* this.shadowRoot.querySelector("div").display = "none";

      document.body.style.setProperty("--default-cursor", `url("${cursorUrl}"), default`);
      document.body.style.setProperty("--grabbed-cursor", `url("${grabbedUrl}"), grabbing`);
      document.body.style.cursor = "var(--default-cursor)";

      document.addEventListener(
        "mousemove",
        (e) => {
          const point = e.touches ? e.touches[0] : e;

          const maxX = this.space.offsetWidth - this.shadowRoot.querySelector("div").offsetWidth;
          const maxY = this.space.offsetWidth - this.shadowRoot.querySelector("div").offsetHeight;

          const newX = Math.max(0, Math.min(point.pageX + Number(this.world.props["scroll-x"]), maxX));
          const newY = Math.max(0, Math.min(point.pageY + Number(this.world.props["scroll-y"]), maxY));

          this.shadowRoot.querySelector("div").style.transform = `translate(${newX}px, ${newY}px)`;
          this.setAttribute("x", Math.round(newX));
          this.setAttribute("y", Math.round(newY));
        },
        true
      ); */
    } else {
      this.classList.add(`bg-[url("${cursorUrl}")]`, "bg-no-repeat", "bg-center", "bg-contain");
    }
  }
}
