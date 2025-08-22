export default class FlexBlock extends Block {
  tagName = "flex-block";

  render = `
    <div style="display: flex;">
      <slot />
    </div>
  `;
}
