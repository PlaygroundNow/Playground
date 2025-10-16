import * as prettier from "https://unpkg.com/prettier@3.6.2/standalone.mjs";
import * as prettierPluginHtml from "https://unpkg.com/prettier@3.6.2/plugins/html.mjs";
import * as prettierPluginEstree from "https://unpkg.com/prettier@3.6.2/plugins/estree.mjs";
import * as prettierPluginBabel from "https://unpkg.com/prettier@3.6.2/plugins/babel.mjs";

export default class Code extends Block {
  tagName = "code-block";

  quickActions = [
    {
      icon: "terminal",
      title: "Do it!",
      action: (e) => this.evaluate(`(() => {${this.doc.getValue()}})()`),
    },
    {
      icon: "eye",
      title: "Print it!",
      action: (e) => {
        const cursor = this.doc.getCursor();
        const selection = this.doc.getSelection();
        const value = this.evaluate(selection).evaluated;

        let replacement = typeof value === "string" ? value : JSON.stringify(value);

        this.doc.setValue(this.doc.getValue() + "\n" + replacement);
        const height = Math.min(4 + this.doc.lineCount() * 20, 800);
        this.doc.setSize("auto", height);
      },
    },
  ];

  render = `
<style>
  .CodeMirror {
    max-width: 800px
  }
</style>
<div class="container">
  <link
    rel="stylesheet"
    type="text/css"
    href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.19/codemirror.min.css"
  />
  <link
    rel="stylesheet"
    type="text/css"
    href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.19/theme/mdn-like.min.css"
  />
  <link
    rel="stylesheet"
    type="text/css"
    href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.19/theme/material.min.css"
  />
  <textarea name="code"></textarea>
  <div style="display: none;">
  <slot />
  </div>
</div>
`;

  constructor() {
    super();

    this.store.value = "";
  }

  connectedCallback() {
    super.connectedCallback();

    setTimeout(() => {
      this.setup();
    }, 500);
  }

  setup() {
    this.html = this.shadowRoot.querySelector("textarea");
    this.slotted = this.shadowRoot.querySelector("slot");
    this.position = this.props.target;

    // If slotted has content, move it into the shadowroot pre innerText so it can be edited
    if (this.slotted && this.slotted.assignedNodes().length > 0) {
      this.html.value = this.slotted
        .assignedNodes()
        .map((n) => n.textContent)
        .join("");
      
      console.log(this.props.location);

      this.doc = CodeMirror.fromTextArea(this.html, {
        lineNumbers: true,
        tabSize: 2,
        theme: "mdn-like",
        mode: this.props?.location?.endsWith('html') ?
        	"htmlmixed" :
        	{ name: "javascript", jsx: true },
        viewportMargin: Infinity,
        extraKeys: {
          "Cmd-S": () => {},
        },
      });

      const height = Math.min(4 + this.doc.lineCount() * 20, 800);
      this.doc.setSize("auto", height);

      this.doc.on("change", (inst, change) => {
        if (change.origin === "setValue") return;

        const height = Math.min(4 + this.doc.lineCount() * 20, 800);
        this.doc.setSize("auto", height);
      });

      this.doc.on("keyHandled", (inst, name, event) => {
        if (name !== "Cmd-S") return;
        this.replaceChildren();
        this.textContent = this.doc.getValue();

        this.doc.save();

        this.emit("playground:event", {
          type: "save-file",
          payload: {
            location: this.props.location,
            contents: this.doc.getValue(),
          },
        });

        const location = this.props.location;
        if (!location) return;

        const [kit, type, filename, ext] = location.split(".");

        if (type !== "blocks") return;
                
        function refresh() {
        	document.querySelectorAll(filename).forEach((el) => {
              const clone = el.cloneNode(true);
    					el.replaceWith(clone);
          });
        }
        
        if (ext === 'js') {
          import(`/kits/${kit}/${type}/${filename}.${ext}?cachebust=${new Date().getTime()}`).then((module) => {
            customElements.define(filename, module.default);
            refresh();
          });
        } else if (ext === 'html') {
          fetch(`/kits/${kit}/${type}/${filename}?cachebust=${new Date().getTime()}`, { method: "GET", headers: { Accept: "text/html" } })
            .then((res) => res.text())
            .then((sfc) => {
              alpineBlockSFC(filename, sfc);
            	refresh();
            });
        }
        
        const height = Math.min(4 + this.doc.lineCount() * 20, 800);
        this.doc.setSize("auto", height);
      });
    }

    if (!this.position) return;
    this.sourceBlock = window.blockTree[this.position]?.block;

    if (!this.sourceBlock) {
      console.warn(`No element found with ID: ${this.uuid}`);
      return;
    }

    this.html.value = this.cleanBooleanAttributes(this.sourceBlock.outerHTML);

    this.doc = CodeMirror.fromTextArea(this.html, {
      lineNumbers: true,
      tabSize: 2,
      theme: "mdn-like",
      mode: "htmlmixed",
    });

    prettier
      .format(this.doc.getValue(), {
        parser: "html",
        plugins: [prettierPluginHtml],
        singleAttributePerLine: true,
      })
      .then((formatted) => {
        this.doc.setValue(formatted);
        this.doc.save();
        const height = Math.min(4 + this.doc.lineCount() * 20, 800);
        this.doc.setSize("auto", height);
      });

    if (this.getAttribute("target")) {
      if (!this.observer) {
        this.observer = new MutationObserver(this.mutationCallback.bind(this));
        this.observer.observe(this.sourceBlock, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
          characterDataOldValue: true,
        });
      }

      this.doc.on("change", (inst, change) => {
        if (change.origin === "setValue") {
          return;
        }

        const height = Math.min(4 + this.doc.lineCount() * 20, 800);
        this.doc.setSize("auto", height);

        const tempContainer = document.createElement("div");
        tempContainer.innerHTML = this.doc.getValue();

        if (!tempContainer.firstElementChild) {
          return;
        }

        const parsedElement = tempContainer.firstElementChild;
        parsedElement.setAttribute("id", this.position);
        const newContent = tempContainer.innerHTML;
        this.sourceBlock.outerHTML = this.cleanBooleanAttributes(newContent);
        
        const updatedElement = document.getElementById(this.position);
        updatedElement.removeAttribute("id");

        if (updatedElement) {
          window.blockTree[this.position].block = updatedElement;
          this.sourceBlock = updatedElement;
          
          if (this.observer) {
            this.observer.disconnect();
            this.observer = new MutationObserver(this.mutationCallback.bind(this));
            this.observer.observe(this.sourceBlock, {
              childList: true,
              subtree: true,
              attributes: true,
              characterData: true,
              characterDataOldValue: true,
            });
          }
        }
      });
    }
  }

  cleanBooleanAttributes(html) {
    // Replace attributes with empty strings with the attribute name
    return html.replace(/(\s[a-zA-Z-]+)=["']["']/g, "$1").replace(/^\s+|\s+$/g, '');
  }

  mutationCallback() {
    this.sourceBlock = window.blockTree[this.position].block;

    // Only update if the HTML is different
    const cleaned = this.cleanBooleanAttributes(this.sourceBlock.outerHTML);
    return;

    prettier
      .format(cleaned, {
        parser: "html",
        plugins: [prettierPluginHtml],
        singleAttributePerLine: true,
      })

      .then((formatted) => {
        if (this.doc.getValue() === formatted) {
          return;
        }

        this.doc.setValue(formatted);
        this.doc.save();
        const height = Math.min(4 + this.doc.lineCount() * 20, 800);
        this.doc.setSize("auto", height);
      });
  }

  disconnectedCallback() {
    super.disconnectedCallback && super.disconnectedCallback();

    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
