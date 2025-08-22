export default class World extends Block {
  tagName = "world-block";

  render = `
<style>
.world {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
.world::before {
  z-index: -1;
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  text-align: center;
  background: white; /*#22333b*/;
}
.space {
  position: absolute;
  top: 0;
  left: 0;
  width: 4096px;
  height: 4096px;
  background-size: 32px 32px;
  background-image: linear-gradient(
    to right,
    rgba(40, 126, 255, 0.1) 1px,
    transparent 1px
  ),
  linear-gradient(to bottom, rgba(40, 126, 255, 0.1) 1px, transparent 1px);
  transform: translate3d(0, 0, 0);
}

</style>
<div class="world">
    <div class="space">
      <slot>
    </div>
</div>
`;

  connectedCallback() {
    super.connectedCallback();
    this.rootElement = true;

    this.shadowWorld = this.shadowRoot.querySelector(".world");
    this.space = this.shadowRoot.querySelector(".space");

    this.buildBlockTree();

    this.store.meta = false;

    const playerId = localStorage.getItem("playerId") || crypto.randomUUID();
    localStorage.setItem("playerId", playerId);
    this.store.playerId = playerId;

    this.observer = new MutationObserver((record) => {
      const hasBlocks = (arr) => Array.isArray(arr) && arr.some((el) => el.tagName?.toLowerCase().endsWith("block"));

      const added = record
        .map((r) => Array.from(r.addedNodes))
        .filter(hasBlocks)
        .flat(2);
      const removed = record
        .map((r) => Array.from(r.removedNodes))
        .filter(hasBlocks)
        .flat(2);

      if (![...added, ...removed].length) {
        return;
      }

      this.buildBlockTree(added, removed);
    });

    this.observer.observe(this, {
      childList: true,
      subtree: true,
    });

    /* this.saveObserver.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
    }); */

    this.scrollX = Number(this.getAttribute("scroll-x")) || 0;
    this.scrollY = Number(this.getAttribute("scroll-y")) || 0;

    this._boundHandleScroll = this.handleScroll.bind(this);
    this.shadowWorld.addEventListener("wheel", this._boundHandleScroll, { passive: false });

    this._boundClick = this.click.bind(this);
    this.shadowWorld.addEventListener("click", this._boundClick);

    this._boundClearMeta = this.clearMeta.bind(this);
    document.addEventListener("keyup", this._boundClearMeta);
    document.addEventListener("visibilitychange", this._boundClearMeta);

    this._boundKeydownHandler = this._keydownHandler.bind(this);
    document.addEventListener("keydown", this._boundKeydownHandler);

    if (!this.hasAttribute("scroll-x") && !this.hasAttribute("scroll-y")) {
      this.scrollX = (this.space.offsetWidth - this.shadowWorld.offsetWidth) / 2;
      this.scrollY = (this.space.offsetHeight - this.shadowWorld.offsetHeight) / 2;
      this.setAttribute("scroll-x", this.scrollX);
      this.setAttribute("scroll-y", this.scrollY);
    }

    this.space.style.transform = `translate(${-this.scrollX}px, ${-this.scrollY}px)`;

    this.isDragging = false;

    /*this.shadowWorld.addEventListener(
      "touchstart",
      this.handleTouchStart.bind(this),
    );
    this.shadowWorld.addEventListener(
      "touchmove",
      this.handleTouchMove.bind(this),
    );
    this.shadowWorld.addEventListener(
      "touchend",
      this.handleTouchEnd.bind(this),
    );*/
  }

  disconnectedCallback() {
    super.disconnectedCallback && super.disconnectedCallback();

    this.observer && this.observer.disconnect();

    this.shadowWorld?.removeEventListener("wheel", this._boundHandleScroll, { passive: false });
    this.shadowWorld?.removeEventListener("click", this._boundClick);

    document.removeEventListener("keyup", this._boundClearMeta);
    document.removeEventListener("visibilitychange", this._boundClearMeta);
    document.removeEventListener("keydown", this._boundKeydownHandler);

    // If you use bound handlers for touch events, remove them as well:
    // this.shadowWorld?.removeEventListener("touchstart", this.handleTouchStart.bind(this));
    // this.shadowWorld?.removeEventListener("touchmove", this.handleTouchMove.bind(this));
    // this.shadowWorld?.removeEventListener("touchend", this.handleTouchEnd.bind(this));
  }

  _keydownHandler(e) {
    if (e.metaKey || e.ctrlKey) {
      this.store.meta = true;
    }

    if (e.keyCode === 83 && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
      // CMD+S / CTRL+S
      e.preventDefault();
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();

      if (!document.querySelector("spotlight-block")) {
        const spotlight = document.createElement("spotlight-block");
        spotlight.setAttribute("fixed", "");
        document.body.appendChild(spotlight);
      } else {
        const spotlight = document.querySelector("spotlight-block");
        spotlight.remove();
      }
    }
  }

  clearMeta() {
    this.store.meta = false;
  }

  isAncestorScrollable(el) {
    let node = el;
    while (node && node !== document.body) {
      const hasScrollableContent = node.scrollHeight > node.clientHeight;
      const overflowYStyle = window.getComputedStyle(node).overflowY;
      const isOverflowHidden = overflowYStyle.indexOf("hidden") !== -1;
      const canScroll = hasScrollableContent && !isOverflowHidden;

      if (canScroll) {
        return true;
      }

      node = node.parentElement;
      if (node && node.tagName === "world-block") return false;
    }
    return false;
  }

  handleScroll(e) {
    e.preventDefault();
    //if (this.isAncestorScrollable(e.target)) {
    //return;
    //}

    if (e.target.tagName === "code-block") return;

    // Don't scroll if context menu is open
    const spotlightBlock = document.querySelector("spotlight-block");
    const menuBlocks = document.querySelectorAll("menu-block");
    if (menuBlocks.length || spotlightBlock) return;

    if (e.ctrlKey) {
      const scale = this.scale || 1;
      const delta = -e.deltaY * 0.001;
      const newScale = Math.max(0.1, Math.min(3, scale + delta));
      this.scale = newScale;

      //this.space.style.transform = `translate(${-this.scrollX}px, ${-this.scrollY}px) scale(${newScale})`;
      return;
    }

    const newScrollX = this.scrollX + e.deltaX;
    const newScrollY = this.scrollY + e.deltaY;

    const maxScrollX = this.space.offsetWidth - this.shadowWorld.offsetWidth;
    const maxScrollY = this.space.offsetHeight - this.shadowWorld.offsetHeight;

    this.scrollX = Math.max(0, Math.min(newScrollX, maxScrollX));
    this.scrollY = Math.max(0, Math.min(newScrollY, maxScrollY));

    // Update attributes
    this.setAttribute("scroll-x", this.scrollX);
    this.setAttribute("scroll-y", this.scrollY);

    this.space.style.transform = `translate(${-this.scrollX}px, ${-this.scrollY}px)`;
  }

  handleTouchStart(event) {
    event.preventDefault();

    this.isDragging = true;
    this.lastTouchX = event.touches[0].clientX;
    this.lastTouchY = event.touches[0].clientY;
  }

  handleTouchMove(e) {
    if (!this.isDragging) return;
    e.preventDefault();

    const touch = e.touches[0];
    const deltaX = this.lastTouchX - touch.clientX;
    const deltaY = this.lastTouchY - touch.clientY;

    this.updateScroll(deltaX, deltaY);

    this.lastTouchX = touch.clientX;
    this.lastTouchY = touch.clientY;
  }

  handleTouchEnd() {
    this.isDragging = false;
  }

  updateScroll(deltaX, deltaY) {
    const newScrollX = this.scrollX + deltaX;
    const newScrollY = this.scrollY + deltaY;

    const maxScrollX = this.space.offsetWidth - this.shadowWorld.offsetWidth;
    const maxScrollY = this.space.offsetHeight - this.shadowWorld.offsetHeight;

    this.scrollX = Math.max(0, Math.min(newScrollX, maxScrollX));
    this.scrollY = Math.max(0, Math.min(newScrollY, maxScrollY));

    this.setAttribute("scroll-x", this.scrollX);
    this.setAttribute("scroll-y", this.scrollY);

    this.space.style.transform = `translate(${-this.scrollX}px, ${-this.scrollY}px)`;
  }

  click() {
    const toolbars = document.querySelectorAll("toolbar-block");
    toolbars.forEach((toolbar) => toolbar.remove());
  }

  nextSpreadsheetLetter(char) {
    let carry = 1;
    let res = "";

    for (let i = char.length - 1; i >= 0; i--) {
      let charCode = char.charCodeAt(i) - 65 + carry;
      if (charCode === 26) {
        res = "A" + res;
        carry = 1;
      } else {
        res = String.fromCharCode((charCode % 26) + 65) + res;
        carry = 0;
      }
    }

    if (carry === 1) res = "A" + res;

    return res;
  }

  buildBlockTree(added, removed) {
    let currentNode = null;
    let rowCounts = {
      A: 0,
    };

    const pgRoot = document.querySelector("#playground");
    let todo = [
      {
        parent: null,
        position: "_Ax0",
        block: pgRoot,
      },
    ];
    window.blockTree = {
      _Ax0: { block: pgRoot },
    };

    while (todo.length) {
      currentNode = todo.shift();

      let isPrivate = currentNode.position.startsWith("_");
      let position = isPrivate ? currentNode.position.slice(1) : currentNode.position;

      let [row] = position.split("x");
      const childRow = this.nextSpreadsheetLetter(row);

      for (let child of Array.from(currentNode.block.childNodes || [])) {
        if (!child.tagName?.toLowerCase().endsWith("block")) {
          continue;
        }

        const childColumn = ++rowCounts[childRow] || (rowCounts[childRow] = 1);

        const node = {
          parent: currentNode.position,
          position: child.tagName === "world-block" ? "Ax0" : (isPrivate ? "_" : "") + childRow + "x" + childColumn,
          block: child,
        };

        const { position: _, ...nodeWithoutPosition } = node;
        window.blockTree[node.position] = nodeWithoutPosition;

        if (child.childNodes) {
          todo.push(node);
        }
      }
    }

    //console.timeEnd("build-block-tree");
  }
}
