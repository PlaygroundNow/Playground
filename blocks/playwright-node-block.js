export default class PlaywrightNodeBlock extends Block {
  static observedAttributes = ["x", "y", "class", "data-store", "if", ":if", "position"];

  tagName = "playwright-node-block";

  render = `
  	<style>
      div {
        margin-bottom: 4px;
        padding: 4px;
        border-radius: 8px;
        cursor: pointer;
      }
      div:hover {
      	background: rgba(50, 50, 50, 0.04);
			}
    </style>
    <div>
      <slot />
    </div>
  `;

  renderSlot = `
  	<flex-block class="flex-col" @mouseenter="this.emit('enter')" @mouseleave="this.emit('leave')">
      <flex-block class="items-center gap-1">
        <text-block
          :class="'w-4 pl-1 text-sm' + ($open ? ' scale-[0.5]' : '') + ($children.length ? ' pl-1' : '')"
          :slot="$children.length ? ($open ? '&#9660;' : '&#9656;') : ''"
        ></text-block>
        <text-block
        	@click="this.emit('toggle')"
          pascal-case="true"
          :slot="$tagName"
        ></text-block>
      </flex-block>
      <flex-block :class="'flex-col pl-2 overflow-hidden ' + (!$open ? 'h-0' : '')">
        <repeat-block
        	:items="$children"
         	as="child"
        >
        	<template slot="repeat">
         		<playwright-node-block
            	:position="$child"
            ></playwright-node-block>
          </template>
        </repeat-block>
      </flex-block>
    </flex-block>
  `;

  constructor() {
    super();

    this.store.tagName = "";
    this.store.open = false;
    this.store.children = [];

    this.setup();
  }

  setup() {
    const position = this.getAttribute("position");
    if (position) {
      this.store.position = position;
      this.store.children = Object.entries(window.blockTree)
        .filter(
          ([, block]) => block.parent === position && blockTree[position].block.tagName !== "playwright-node-block"
        )
        .map(([position]) => position);

      const block = window.blockTree[position]?.block;
      this.store.tagName = block?.tagName?.toLowerCase();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback?.(name, oldValue, newValue);

    if (name === "position") {
      this.setup();
    }
  }

  $toggle(e) {
    e.currentTarget.store.open = !e.currentTarget.store.open;
  }
  
  $enter(e) {
    const pos = this.props?.position;
    if (pos) {
    	this.highlight(pos);
    }
  }
}
