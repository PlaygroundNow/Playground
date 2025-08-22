class Block extends HTMLElement {
  static observedAttributes = ["x", "y", "class", "data-store", "if", ":if"];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    window.elementMap = window.elementMap || {};

    this.blockStyleSheet = new CSSStyleSheet();
    this.tailwindStyleSheet = new CSSStyleSheet();

    const defaultClasses = this.constructor.defaultAttributes?.class;

    // Preload classes from the 'class' attribute since shadowRoot is not ready yet
    const classes = new Set();
    const classAttr = this.getAttribute("class") + (defaultClasses ? " " + defaultClasses : "");
    if (classAttr) {
      classAttr.split(/\s+/).forEach((cls) => {
        if (cls) classes.add(cls);
      });
    }
    this.tailwindStyleSheet.replace(window.tailwindCompiler.build(Array.from(classes)));

    this.shadowRoot.adoptedStyleSheets.push(this.tailwindStyleSheet);
  }

  #props = this.attributes;

  get props() {
    return new Proxy(this.#props, {
      get: (target, prop) => {
        return this.getAttribute(prop);
      },
      set: (target, prop, value) => {
        this.setAttribute(prop, value);
        return true;
      },
    });
  }

  #store = this.getAttribute("data-store") ? JSON.parse(this.getAttribute("data-store")) : {};

  get store() {
    return new Proxy(this.#store, {
      set: (target, key, value) => {
        target[key] = value;

        if (this.id()) {
          window.dispatchEvent(
            new CustomEvent(`set:${this.id()}:${key}`, {
              detail: { key, value },
            })
          );
        }

        function serializeValue(value) {
          if (value instanceof HTMLElement) {
            return this.id(value);
          } else if (Array.isArray(value)) {
            return value.map((v) => serializeValue.call(this, v));
          } else if (value && typeof value === "object") {
            return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serializeValue.call(this, v)]));
          }
          return value;
        }

        const storeWithUUIDs = Object.fromEntries(
          Object.entries(this.#store).map(([key, value]) => {
            return [key, serializeValue.call(this, value)];
          })
        );
        this.setAttribute("data-store", JSON.stringify(storeWithUUIDs));

        return true;
      },
    });
  }

  set store(value) {
    Object.assign(this.#store, value);
  }

  connectedMoveCallback() {
    console.log("Custom move-handling logic here.");
  }

  connectedCallback() {
    this.world = document.querySelector("world-block");
    this.space = this.world?.shadowRoot?.querySelector(".space");

    const proto = Object.getPrototypeOf(this);
    this._$listeners = [];

    Object.getOwnPropertyNames(proto).forEach((key) => {
      if (key.startsWith("$") && typeof this[key] === "function") {
        const eventName = key.slice(1);
        const originalHandler = this[key].bind(this);
        const handler = (event) => {
          event.stopPropagation();
          originalHandler(event);
        };
        this.addEventListener(eventName, handler, { capture: false, passive: false });
        this._$listeners.push({ eventName, handler });
      }
    });

    if (
      !this.hasAttribute("static") &&
      !this.hasAttribute("fixed") &&
      !this.hasAttribute("absolute") &&
      !this.closest("[static]")
    ) {
      this.blockStyleSheet.replace(`
        @keyframes fadeInSpotlight {
          to {
            opacity: 1;
          }
        }
        :host {
          position: absolute;
          display: block;
          pointer-events: none;
          opacity: 0;
    			animation: fadeInSpotlight 0.25s ease forwards;
        }
        *:not(slot) {
          pointer-events: auto;
        }
      `);
    } else {
      this.blockStyleSheet.replace(`
        @keyframes fadeInSpotlight {
          to {
            opacity: 1;
          }
        }
        :host {
          display: contents;
        }
        * {
          //opacity: 0;
    			//animation: fadeInSpotlight 0.2s ease forwards;
        }
      `);
    }

    this.shadowRoot.adoptedStyleSheets.push(this.blockStyleSheet);

    if (this.render) {
      this.template = document.createElement("template");
      this.template.innerHTML = this.render;
      this.shadowRoot.replaceChildren();
      this.shadowRoot.appendChild(this.template.content.cloneNode(true));
    }

    if (this.renderSlot) {
      const slotTemplate = document.createElement("template");
      slotTemplate.innerHTML = this.renderSlot;

      this.replaceChildren();
      this.appendChild(slotTemplate.content.cloneNode(true));
    }

    if (this.hasAttribute("uuid")) {
      elementMap[this.getAttribute("uuid")] = this;
      this.removeAttribute("uuid");
    }

    if (this.tagName === "block-block") {
      this.shadowRoot.innerHTML = `
        <div class="${this.getAttribute("class") || ""}">
          <slot>
        </div>
      `;
    }

    this.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();

      document.querySelectorAll("flex-block[menu-block]").forEach((el) => {
        el.remove();
      });

      const point = e.touches ? e.touches[0] : e;
      const x = point.pageX;
      const y = point.pageY;

      document.body.insertAdjacentHTML(
        "beforeend",
        `<flex-block menu-block fixed class="fixed z-10 w-fit border-solid border-1 border-blue-100 rounded-sm " x="${x}" y="${y}">
            <menu-block static>
              <flex-block class="text-center flex-col text-white font-bold capitalize bg-teal-500 py-1 rounded-t-sm">${this.tagName
                .split("-")
                .join(" ")} <text-block class="text-xs">#${this.id()}</text-block></flex-block>
              ${
                this.quickActions
                  ?.map(
                    (action, i) => `
                  <menu-item-block icon="${action.icon}" text="${action.title}" id="quick-action-${i}"></menu-item-block>
                `
                  )
                  .join("") || ""
              }
							<menu-item-block icon="pen" text="Playwright" id="open-playwright"></menu-item-block>
              <menu-item-block icon="toolbox" text="Library" id="open-kit-browser"></menu-item-block>
              <menu-item-block icon="htmx" text="Code" id="open-code-item"></menu-item-block>
              <menu-item-block icon="terminal" text="Script" id="open-block-script"></menu-item-block>
              <menu-item-block icon="debug" text="Debug" id="open-debug"></menu-item-block>
              <menu-item-block icon="extension" text="Duplicate" id="duplicate-block"></menu-item-block>
              <menu-item-block icon="extension-remove" text="Remove" id="remove-block"></menu-item-block>
          </menu-block>
        </flex-block>`
      );

      if (this.quickActions?.length) {
        this.quickActions.forEach((action, i) => {
          const quickActionEl = document.body.querySelector(`#quick-action-${i}`);
          if (quickActionEl && typeof action.action === "function") {
            quickActionEl.addEventListener("click", (event) => action.action.call(this, event), true);
          }
        });
      }

      const openPlaywright = document.body.querySelector("#open-playwright");
      if (openPlaywright) {
        openPlaywright.addEventListener(
          "click",
          (clickEvent) => this.openPlaywright.call(this, clickEvent, x, y),
          true
        );
      }

      // Add the click handler after insertion
      const openCodeItem = document.body.querySelector("#open-code-item");
      if (openCodeItem) {
        openCodeItem.addEventListener("click", (clickEvent) => this.openCodeWindow.call(this, clickEvent, x, y), true);
      }

      const openKitBrowser = document.body.querySelector("#open-kit-browser");
      if (openKitBrowser) {
        openKitBrowser.addEventListener("click", this.openKitBrowser.bind(this), true);
      }

      const openDebug = document.body.querySelector("#open-debug");
      if (openDebug) {
        openDebug.addEventListener(
          "click",
          (mouseDownEvent) => {
            const worldScrollX = Number(this.world.getAttribute("scroll-x")) || 0;
            const worldScrollY = Number(this.world.getAttribute("scroll-y")) || 0;

            const x = worldScrollX + mouseDownEvent.clientX;
            const y = worldScrollY + mouseDownEvent.clientY;

            this.world.insertAdjacentHTML(
              "beforeend",
              `
                <window-block
                  x="${x}"
                  y="${y}"
                >
                  <span slot="nav-title">Debug</span>
                  <code-block static>this.world.store</code-block>
                </window-block
                >
              `
            );
          },
          true
        );
      }

      const openBlockScript = document.body.querySelector("#open-block-script");
      if (openBlockScript) {
        openBlockScript.addEventListener(
          "click",
          () => {
            for (let [kit, folders] of Object.entries(this.get("kits"))) {
              for (let [folder, files] of Object.entries(folders)) {
                for (let file of files) {
                  if (this.tagName === file.split(".")[0]) {
                    this.emit("playground:event", {
                      type: "open-file",
                      payload: { location: `${kit}.${folder}.${file}` },
                    });
                    return;
                  }
                }
              }
            }
          },
          true
        );
      }

      const duplicateBlock = document.body.querySelector("#duplicate-block");
      if (duplicateBlock) {
        duplicateBlock.addEventListener("mousedown", (mouseDownEvent) => {
          const worldScrollX = Number(this.world.getAttribute("scroll-x")) || 0;
          const worldScrollY = Number(this.world.getAttribute("scroll-y")) || 0;

          const x = worldScrollX + mouseDownEvent.clientX;
          const y = worldScrollY + mouseDownEvent.clientY;

          const newNode = document.cloneNode.call(e.target, true);
          newNode.setAttribute("grabbed", "");
          newNode.setAttribute("x", Math.round(x));
          newNode.setAttribute("y", Math.round(y));

          this.world.insertAdjacentElement("beforeend", newNode);
        });
      }

      const removeBlock = document.body.querySelector("#remove-block");
      if (removeBlock) {
        removeBlock.addEventListener("click", () => {
          e.target.remove();
        });
      }
    });

    setTimeout(() => {
      const getters = Array.from(this.attributes).filter((attr) => attr.name.startsWith(":"));
      if (getters.length) {
        for (let attr of getters) {
          const key = attr.name.split(":").pop();
          const value = this.getAttribute(attr.name);

          const { evaluated, dependencies } = this.evaluate(value);

          const setSlot = () => {
            const { evaluated } = this.evaluate(value);

            if (!evaluated) {
              this.textContent = evaluated;
              return;
            }

            if (typeof evaluated !== "string" && !(evaluated instanceof Node)) {
              this.textContent = evaluated;
              return;
            }

            try {
              this.replaceChildren();

              if (evaluated.nodeName) {
                this.appendChild(evaluated.cloneNode(true));
              } else {
                const template = document.createElement("template");
                template.innerHTML = evaluated.trim();
                const node = template.content.firstChild;

                if (node && node.nodeType === Node.ELEMENT_NODE) {
                  this.appendChild(node);
                } else {
                  this.innerHTML = String(evaluated).replace(/\n/g, "<br>");
                }
              }
            } catch (e) {
              this.textContent = evaluated;
            }
          };

          if (key === "slot") {
            setSlot();
            dependencies.forEach((dep) => {
              window.addEventListener(`set:${dep}`, setSlot.bind(this));
            });
          } else {
            if (evaluated !== undefined) {
              this.setAttribute(key, evaluated);
            }

            const listener = () => {
              const { evaluated } = this.evaluate(value);

              if (evaluated !== undefined) {
                this.setAttribute(key, evaluated, false);
              }
            };
            dependencies.forEach((dep) => {
              window.addEventListener(`set:${dep}`, listener.bind(this));
            });
          }
        }
      }

      const scripts = Array.from(this.attributes).filter((attr) => attr.name.startsWith("@"));
      if (scripts.length) {
        for (const attr of scripts) {
          const eventName = attr.name.slice(1);
          const { evaluated } = this.evaluate(this.getAttribute(attr.name), false);

          const eventTarget = eventName.startsWith("set:") ? window : this;

          if (evaluated) {
            eventTarget.addEventListener(eventName, (e) => {
              new Function(evaluated).call(this, e);
            });
          }
        }
      }

      if (this.rootElement) return;

      const rootNodes = Array.from(this.shadowRoot.children)
        .filter((node) => node.nodeType === Node.ELEMENT_NODE)
        .filter((node) => node.tagName !== "STYLE");

      if (rootNodes.length > 1) {
        console.warn("Multiple root nodes found in shadowRoot");
      }
      if (rootNodes.length > 0) {
        this.setRootElement(rootNodes[0]);
      }
    });

    // block-added websocket event
    /* setTimeout(() => {
      const author = localStorage.getItem("playerId");
      const position = this.registerBlock();
      const attributes = Array.from(this.attributes).map((attr) => ({
        name: attr.name,
        value: attr.value,
      }));

      console.log(position);

      if (position) {
        document.body.dispatchEvent(
          new CustomEvent("playground:event", {
            detail: {
              type: "block-added",
              payload: {
                author,
                parentPosition: window.blockTree[position].node,
                position,
                blockName: this.tagName.toLowerCase(),
                attributes,
              },
            },
          })
        );
      }
    }); */
  }

  setRootElement(rootElement) {
    this.rootElement = rootElement;

    if (this.constructor.defaultAttributes) {
      for (const [key, value] of Object.entries(this.constructor.defaultAttributes)) {
        if (!this.hasAttribute(key)) {
          this.setAttribute(key, value, false);
        }
      }
    }

    if (this.hasAttribute("x") && this.hasAttribute("y") && !this.closest("[static]")) {
      this.rootElement.style.transform = `translate(${this.getAttribute("x")}px, ${this.getAttribute("y")}px)`;
    }

    if (this.hasAttribute("class")) {
      this.rootElement.className = this.getAttribute("class");
    }

    if (this.hasAttribute("style")) {
      this.rootElement.style = this.getAttribute("style");
    }

    // Save bound handlers for removal
    this._handleMove = this.handleMove.bind(this);
    this._mouseUp = this.mouseUp.bind(this);

    document.addEventListener("mousemove", this._handleMove);
    document.addEventListener("mouseup", this._mouseUp);

    this.rootElement.addEventListener("mouseenter", this.mouseEnter.bind(this), { captures: true });
    this.rootElement.addEventListener("mouseleave", this.mouseLeave.bind(this));
    //this.rootElement.addEventListener("click", this.click.bind(this));
    this.rootElement.addEventListener("mousedown", this.mouseDown.bind(this));
    //this.rootElement.addEventListener("touchstart", this.mouseDown.bind(this));

    /* document.addEventListener("mousemove", this.handleMove.bind(this));
    document.addEventListener("mouseup", this.mouseUp.bind(this));
    //document.addEventListener("mouseup", this.handleEnd.bind(this));
    document.addEventListener("touchmove", this.handleMove.bind(this), {
      passive: false,
    });
    //document.addEventListener("touchend", this.handleEnd.bind(this)); */
  }

  openSpotlight() {
    if (!document.querySelector("spotlight-block")) {
      const spotlight = document.createElement("spotlight-block");
      spotlight.setAttribute("fixed", "");
      document.body.appendChild(spotlight);
    }
  }

  openKitBrowser(e) {
    const worldScrollX = Number(this.world.getAttribute("scroll-x")) || 0;
    const worldScrollY = Number(this.world.getAttribute("scroll-y")) || 0;

    this.world.insertAdjacentHTML(
      "beforeend",
      `<library-block x="${this.getAttribute("x") || worldScrollX + e.clientX}" y="${
        this.getAttribute("y") || worldScrollY + e.clientY
      }"></library-block>`
    );
  }

  openPlaywright(e) {
    const worldScrollX = Number(this.world.getAttribute("scroll-x")) || 0;
    const worldScrollY = Number(this.world.getAttribute("scroll-y")) || 0;

    this.world.insertAdjacentHTML(
      "beforeend",
      `<playwright-block position="${this.id()}" x="${this.getAttribute("x") || worldScrollX + e.clientX}" y="${
        this.getAttribute("y") || worldScrollY + e.clientY
      }"></playwright-block>`
    );
  }

  openCodeWindow(e) {
    const position = this.id();

    const worldScrollX = Number(this.world.getAttribute("scroll-x")) || 0;
    const worldScrollY = Number(this.world.getAttribute("scroll-y")) || 0;

    const attrX = this.props.x;
    const attrY = this.props.y;
    const parsedX = parseInt(this.props.x) || 0;
    const parsedY = parseInt(this.props.y) || 0;

    const isStatic = this.closest("[static]");

    const x = this.props.x && this.props.x !== "0" && !isStatic ? this.props.x : worldScrollX + e.clientX + parsedX;
    const y = this.props.y && this.props.y !== "0" && !isStatic ? this.props.y : worldScrollY + e.clientY + parsedY;

    console.log(this.props.x, x);
    console.log(this.props.y, y);

    this.world.insertAdjacentHTML(
      "beforeend",
      `<window-block x="${x}" y="${y}">
          <span slot="nav-title">${this.tagName}</span>
          <code-block static target="${position}"></code-block>
      </window-block>`
    );
  }

  mouseEnter(e) {
    if (!this.world.store.meta) return;

    e.preventDefault();
    e.stopPropagation();

    this.highlight();
  }

  mouseLeave(e) {
    const ghostHighlights = document.querySelectorAll("highlight-block[ghost]");
    ghostHighlights?.forEach((hb) => hb.remove());

    if (this.world.store.focusedElement) return;

    e.preventDefault();
    e.stopPropagation();

    const highlightBlock = document.querySelectorAll("highlight-block");
    highlightBlock?.forEach((hb) => hb.remove());
  }

  highlight(position = "") {
    if (!position) {
      position = this.id();
    }

    if (this.world.store.focusedElement) {
      if (this.world.store.focusedElement === position) {
        return;
      }

      const highlight = document.createElement("highlight-block");
      highlight.setAttribute("target", position);
      highlight.setAttribute("ghost", "");
      document.querySelector("#playground").appendChild(highlight);

      return;
    }

    const highlightBlock = document.querySelectorAll("highlight-block");
    highlightBlock?.forEach((hb) => hb.remove());

    const highlight = document.createElement("highlight-block");
    highlight.setAttribute("target", position);
    document.querySelector("#playground").appendChild(highlight);
  }

  mouseDown(e) {
    if (!this.world.store.meta) return;
    e.stopPropagation();

    this.setAttribute("grabbed", "");

    //this.classList.add("relative", "!pointer-events-none");

    const p = e.touches?.[0] || e;

    this.startRect = {
      x: Number(this.getAttribute("x")),
      y: Number(this.getAttribute("y")),
    };

    this.dragStartX = p.pageX;
    this.dragStartY = p.pageY;
    this.deltaX = 0;
    this.deltaY = 0;
  }

  handleMove(e) {
    if (!this.hasAttribute("grabbed")) return;

    e.preventDefault();

    const point = e.touches ? e.touches[0] : e;

    this.startRect = this.startRect || {
      x: Number(this.getAttribute("x")),
      y: Number(this.getAttribute("y")),
    };
    this.dragStartX = this.dragStartX || point.pageX;
    this.dragStartY = this.dragStartY || point.pageY;

    this.deltaX = point.pageX - this.dragStartX;
    this.deltaY = point.pageY - this.dragStartY;

    const maxX = this.space.offsetWidth - this.rootElement.offsetWidth;
    const maxY = this.space.offsetWidth - this.rootElement.offsetHeight;

    const newX = Math.max(-Infinity, Math.min(this.startRect.x + this.deltaX, maxX));
    const newY = Math.max(-Infinity, Math.min(this.startRect.y + this.deltaY, maxY));

    this.rootElement.style.transform = `translate(${newX}px, ${newY}px)`;
    this.setAttribute("x", Math.round(newX));
    this.setAttribute("y", Math.round(newY));
  }

  mouseUp(e) {
    if (!this.hasAttribute("grabbed")) return;

    this.removeAttribute("grabbed");
    this.classList.remove("relative", "!pointer-events-none", "cursor-[var(--grabbed-cursor)]");

    if (!this.world.store.meta) return;

    /* if (this.world.store.focusedElement) {
      if (this.world.store.focusedElement === this) {
        if (Math.abs(this.deltaX) > 0) return;

        this.world.store.focusedElement = null;
        this.mouseLeave(e);
        return;
      }

      this.world.store.focusedElement = null;
      this.mouseEnter(e);
      this.world.store.focusedElement = this;
    } else {
      this.mouseEnter(e);
      this.world.store.focusedElement = this;
    } */
  }

  attributeChangedCallback(name, old, changed) {
    switch (name) {
      case "x":
      case "y":
        if (this.rootElement?.tagName) {
          this.rootElement.style.transform = `translate(${this.getAttribute("x")}px, ${this.getAttribute("y")}px)`;
        }
        break;
      case "class": {
        if (this.rootElement) {
          this.rootElement.className = this.getAttribute("class");
        }

        const defaultClasses = this.constructor.defaultAttributes?.class;

        // Preload classes from the 'class' attribute since shadowRoot is not ready yet
        const classes = new Set();
        const classAttr = this.getAttribute("class") + (defaultClasses ? " " + defaultClasses : "");
        if (classAttr) {
          classAttr.split(/\s+/).forEach((cls) => {
            if (cls) classes.add(cls);
          });
        }
        this.tailwindStyleSheet.replace(window.tailwindCompiler.build(Array.from(classes)));

        break;
      }
      default:
        break;
    }
  }

  isCommand(e) {
    return e.metaKey || e.ctrlKey;
  }

  get(key) {
    let parent = this;
    while (parent && !parent.store?.hasOwnProperty(key)) {
      parent = parent.parentElement;
    }

    const foundKey = parent?.store?.[key];

    if (foundKey) {
      return foundKey;
    }
  }

  createStoreProxy(key) {
    const self = this;
    return new Proxy(
      { value: self.get(key) },
      {
        set(target, prop, val) {
          let p = self;
          while (p && !p.store?.hasOwnProperty(key)) {
            p = p.parentElement;
          }
          if (p) {
            p.store[key] = val;
          }
          return true;
        },
        get(target, prop) {
          return self.get(key);
        },
        getOwnPropertyDescriptor(target, key) {
          return {
            value: self.get(key),
            enumerable: true,
            configurable: true,
          };
        },
      }
    );
  }

  evaluate(script, execute = true) {
    const varNames = [];
    const storeVars = [];
    const usedVars = new Set();

    if (!this.closest("body")) {
      // Shouldn't be evaluating code if you aren't in the world
      return {
        evaluated: null,
        dependencies: [],
      };
    }

    let parent = this;
    const seenKeys = new Set();
    while (parent) {
      if (parent.store) {
        Object.entries(parent.store).forEach(([key, value]) => {
          const uniqueKey = `${parent.id?.() || ""}:${key}`;
          if (!seenKeys.values().some((v) => v.split(":")[1] === key)) {
            varNames.push(key);
            storeVars.push(`let $${key} = this.createStoreProxy("${key}");`);
            seenKeys.add(uniqueKey);
          }
        });
      }
      parent = parent.parentElement;
    }

    function transformScript(script) {
      let transformed = script;

      varNames.forEach((varName) => {
        // Only match varName when not preceded by . or part of a property key or declaration
        const regex = new RegExp(`\\$${varName}(?!\\s*[:\\w$])`, "g");
        if (regex.test(transformed)) {
          usedVars.add(seenKeys.values().find((k) => k.split(":")[1] === varName));
          transformed = transformed.replace(regex, `$${varName}.value`);
        }
      });

      return transformed;
    }

    const scriptWithStore =
      "const props = this.props;\n" +
      storeVars.join("\n") +
      "\n\nconst retVal = " +
      transformScript(script) +
      ";\n\n" +
      `if (typeof retVal === "function") {
        return retVal.call(this, ...arguments);
      } else {
        return retVal;
      }
    `;

    if (!execute) {
      return {
        evaluated: scriptWithStore,
        dependencies: Array.from(usedVars),
      };
    }

    try {
      const value = new Function(scriptWithStore).call(this);
      /* if (script.includes("tagName")) {
        console.log("get tagname", JSON.stringify(this.closest("playwright-node-block").store));
      } */
      return {
        evaluated: value,
        dependencies: Array.from(usedVars),
      };
    } catch (e) {
      console.warn("Error evaluating script:", e, scriptWithStore, this);

      return {
        evaluated: null,
        dependencies: [],
      };
    }
  }

  id(block = undefined) {
    const [position, node] =
      Object.entries(window.blockTree || {}).find(([_, node]) => node.block === (block || this)) || [];

    if (!position) {
      return;
    }

    return position;
  }

  getBlock(pos) {
    const found = window.blockTree[pos] || [];

    if (!found) {
      return null;
    }

    return found.block;
  }

  remove() {
    super.remove();

    const highlightBlock = document.querySelector("highlight-block");
    const toolbarBlock = document.querySelector("toolbar-block");

    const uuid = Object.entries(window.elementMap).find(([_, el]) => el === this)?.[0];
    if (highlightBlock && highlightBlock.getAttribute("target") === uuid) {
      highlightBlock.remove();
      toolbarBlock?.remove();
    }
  }

  setAttribute(attribute, value, notify = true) {
    super.setAttribute(attribute, value);

    if (!notify) return;

    const result = Object.entries(window.blockTree || {}).find(([_, node]) => node.block === this) || [null, null];
    const [position, node] = result;

    // Rate limit attribute update events to once every 120ms per attribute
    this._attributeLastUpdate = this._attributeLastUpdate || {};
    this._attributeLastValue = this._attributeLastValue || {};
    this._attributeUpdateTimeouts = this._attributeUpdateTimeouts || {};

    const now = performance.now();
    const shouldUpdate = !this._attributeLastUpdate[attribute] || now - this._attributeLastUpdate[attribute] >= 40;

    const sendEvent = (val) => {
      if (!this.world?.store?.playerId) return;

      this.emit("playground:event", {
        type: "attribute-updated",
        payload: {
          author: this.world.store.playerId,
          position,
          attribute,
          value: val,
        },
      });
      this.emit("playground:event", {
        type: "run-script",
        payload: {
          script: "Playground.scripts.save.js",
        },
      });
      this._attributeLastUpdate[attribute] = performance.now();
    };

    if (shouldUpdate) {
      sendEvent(value);
      this._attributeLastValue[attribute] = value;
      // Clear any pending timeout for this attribute
      if (this._attributeUpdateTimeouts[attribute]) {
        clearTimeout(this._attributeUpdateTimeouts[attribute]);
        this._attributeUpdateTimeouts[attribute] = null;
      }
    } else {
      // Save the value for later and schedule the event
      /* this._attributeLastValue[attribute] = value;
      if (!this._attributeUpdateTimeouts[attribute]) {
        const delay = 20 - (now - this._attributeLastUpdate[attribute]);
        this._attributeUpdateTimeouts[attribute] = setTimeout(() => {
          sendEvent(this._attributeLastValue[attribute]);
          this._attributeUpdateTimeouts[attribute] = null;
        }, delay);
      } */
    }
  }

  emit(eventName, value) {
    this.dispatchEvent(
      new CustomEvent(eventName, {
        detail: value,
        bubbles: true,
        composed: true,
      })
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback && super.disconnectedCallback();

    this._$listeners?.forEach(({ eventName, handler }) => {
      this.removeEventListener(eventName, handler);
    });

    document.removeEventListener("mousemove", this._handleMove);
    document.removeEventListener("mouseup", this._mouseUp);
  }
}

customElements.define("block-block", Block);
