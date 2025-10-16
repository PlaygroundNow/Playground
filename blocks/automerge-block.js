import * as AutomergeRepo from "https://esm.sh/@automerge/automerge-repo/slim?bundle-deps";
import * as CodeMirrorView from "https://esm.sh/@codemirror/view?bundle-deps";
import * as CodeMirrorState from "https://esm.sh/@codemirror/state?bundle-deps";
import * as IndexedDBStorageAdapter from "https://esm.sh/@automerge/automerge-repo-storage-indexeddb?bundle-deps";
import * as WebSocketClientAdapter from "https://esm.sh/@automerge/automerge-repo-network-websocket?bundle-deps";

export default class AutomergeBlock extends Block {
  tagName = "automerge-block";

  static defaultAttributes = {};

  render = `
    <style>
    </style>
    <div>
    	Automerge
    </div>
  `;

  connectedCallback() {
    super.connectedCallback();
    this.setupAutomerge();
    this.textarea = this.shadowRoot.querySelector("textarea");
  }

  async setupAutomerge() {
    window.Automerge = AutomergeRepo.Automerge;
    window.CodeMirrorView = CodeMirrorView;
    window.CodeMirrorState = CodeMirrorState;

    const automergeSyncPlugin = (await import("/libs/automerge-codemirror/dist/index.js")).automergeSyncPlugin;

    console.log(automergeSyncPlugin);

    const wasm = await fetch("https://esm.sh/@automerge/automerge/dist/automerge.wasm");
    const buf = await wasm.arrayBuffer();
    await AutomergeRepo.initializeWasm(buf);

    const repo = new AutomergeRepo.Repo({
      storage: new IndexedDBStorageAdapter.IndexedDBStorageAdapter(),
      network: [new WebSocketClientAdapter.WebSocketClientAdapter("wss://sync.automerge.org")],
    });

    const handle = await repo.find("automerge:3Eepkmao3Q3T4y9RQxbVmBeLF1in");

    const container = this.shadowRoot.querySelector("div");

    console.log(automergeSyncPlugin({ handle, path: ["text"] }));

    const config = {
      doc: handle.doc().text,
      extensions: [automergeSyncPlugin({ handle, path: ["text"] })],
      parent: container,
    };

    const view = new CodeMirrorView.EditorView(config);
  }

  attributeChangedCallback(name, oldValue, newValue) {}
}
