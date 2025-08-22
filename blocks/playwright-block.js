import WindowBlock from "./window-block.js";

export default class PlaywrightBlock extends WindowBlock {
  static observedAttributes = ["position"]
  
  tagName = "playwright-block";

  renderSlot = `
    <span slot="nav-title">🎭 Playwright</span>
    <flex-block
      static
      class="flex-col"
    >

      <flex-block
        class="flex-col p-1"
      >
        <playwright-node-block :position="$position || 'Ax0'"></playwright-node-block>
       </flex-block>
    </flex-block>
  `;
  
  constructor() {
    super();
    
    this.store.position = this.getAttribute('position') || 'Ax0';
  }

  connectedCallback() {
    super.connectedCallback();
  }
  
  attributeChangedCallback() {
  	this.store.position = this.getAttribute('position');
  };
}