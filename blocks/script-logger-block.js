import WindowBlock from "./window-block.js";

export default class ScriptLoggerBlock extends WindowBlock {
  tagName = "script-logger-block";

  defaultAttributes = {
    class: "",
  };

  renderSlot = `
    <span slot="nav-title">Script Logger</span>
  	<flex-block static>
      <textarea-block :value="$logs"></textarea-block>
    </flex-block>
  `;

  constructor() {
    super();
    this.store.logs = "";
  }

  connectedCallback() {
    super.connectedCallback();

    this.div = this.shadowRoot.querySelector("div");
    document.addEventListener("playground:process", this.log.bind(this));
  }

  diconnectedCallback() {
    super.diconnectedCallback();

    document.removeEventListener("playground:process", this.log);
  }

  log(e) {
    const data = event.detail;
    if (data.type !== "process-stdout" && data.type !== "process-stderr") return;

    this.store.logs = data.payload.text + this.store.logs;
  }
}
