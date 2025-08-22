export default class SpotlightNavBlock extends Block {
  tagName = "spotlight-nav-block";

  render = `
<slot></slot>
  `;

  renderSlot = `
<button-block
  class="flex px-4 py-1 rounded-sm items-center bg-[#efefef] hover:bg-[#ddd] active:bg-[#ddd] text-[#999]"
  ><img
    height="16"
    width="16"
    src="/assets/img/search.svg"
  />
  &nbsp;Spotlight...
  <kbd
    style="
      font-size: 14px;
      background: #aaa;
      padding: 2px;
      border-radius: 4px;
      border: 1px solid grey;
      margin-right: 2px;
      margin-left: 24px;
      color: white;
      height: 18px;
      width: 18px;
      line-height: 13px;
    ">⌘</kbd>
  <kbd
    style="
      font-size: 12px;
      background: #aaa;
      padding: 2px;
      border-radius: 4px;
      border: 1px solid grey;
      color: white;
      height: 18px;
      width: 18px;
      line-height: 13px;
    "
  >K</kbd>
</button-block>
  `;

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener("click", (e) => {
      e.stopPropagation();

      this.openSpotlight();
    });
  }
}
