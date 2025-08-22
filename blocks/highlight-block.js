export default class HighlightBlock extends Block {
  tagName = "highlight-block";

  render = `
    <style>
      div {
        position: absolute;
        pointer-events: none !important;
        outline: 2px solid cornflowerblue;
      }
    </style>
    <div>
    </div>
  `;

  connectedCallback() {
    super.connectedCallback();

    this.highlight = this.shadowRoot.querySelector("div");

    const position = this.getAttribute("target");
    this.sourceBlock = window.blockTree[position]?.block;
    
    if (!this.sourceBlock) return;

    const x = this.sourceBlock?.props?.x;
    const y = this.sourceBlock?.props?.y;
    
		const scrollX = this.world.props?.['scroll-x'];
    const scrollY = this.world.props?.['scroll-y'];
        
    this.highlight.style.left = `${x - scrollX}px`;
    this.highlight.style.top = `${y - scrollY}px`;
    this.highlight.style.width = `${this.sourceBlock.offsetWidth}px`;
    this.highlight.style.height = `${this.sourceBlock.offsetHeight}px`;

    this.observer = new MutationObserver(this.mutationCallback.bind(this));
    this.observer.observe(this.sourceBlock, {
      attributeFilter: ["x", "y"],
    });
  }

  mutationCallback(records) {
    for (let record of records) {
      if (record.type === "attributes") {
        const x = this.sourceBlock.getAttribute("x");
        const y = this.sourceBlock.getAttribute("y");
        this.highlight.style.left = `${x}px`;
        this.highlight.style.top = `${y}px`;
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback && super.disconnectedCallback();

    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
