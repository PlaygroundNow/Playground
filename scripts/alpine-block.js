/**
 * Custom element representing an AlpineBlock, which parses a Single File Component (SFC) string
 * and renders its content in a shadow DOM. The SFC must contain exactly one root node (excluding
 * <script> and <style>), exactly one <script type="module">, and at most one <style>.
 *
 * @class
 * @extends HTMLElement
 *
 * @param {string} sfc - A string containing the SFC definition (HTML with optional <script type="module"> and <style>).
 *
 * @throws {Error} If the SFC does not contain exactly one <script type="module">.
 * @throws {Error} If the SFC contains more than one <style>.
 * @throws {Error} If the SFC does not contain exactly one root node (excluding <script> and <style>).
 */
function alpineBlockSFC(name, sfc) {
  class AlpineBlock extends HTMLElement {
    constructor() {
      super();

      this.alpineJS = window.Alpine ? window.Alpine : false;

      const parser = new DOMParser();
      const doc = parser.parseFromString(sfc, "text/html");

      const scripts = doc.querySelectorAll("script");
      const styles = doc.querySelectorAll("style");

      if (scripts.length !== 1) {
        throw new Error("SFC must contain exactly one <script>.");
      }
      if (styles.length > 1) {
        throw new Error("SFC must contain at most one <style>.");
      }

      // Find root nodes (excluding <script> and <style>)
      const rootNodes = Array.from(doc.body.childNodes).filter(
        (node) =>
          !(node.nodeType === Node.ELEMENT_NODE && (node.tagName === "SCRIPT" || node.tagName === "STYLE")) &&
          !(node.nodeType === Node.TEXT_NODE && node.textContent.trim() === "")
      );

      if (rootNodes.length !== 1) {
        throw new Error("SFC must contain exactly one root node (excluding <script> and <style>).");
      }

      this.attachShadow({ mode: "open" });

      if (styles.length === 1) {
        this.shadowRoot.appendChild(styles[0].cloneNode(true));
      }

      const script = scripts[0];
      try {
        new Function(script.textContent).call(this);
      } catch (e) {
        console.error("Error executing SFC script:", e);
      }

      const rootContent = rootNodes[0].cloneNode(true);
      this.shadowRoot.appendChild(rootContent);

      if (this.alpineJS) {
        this.alpineJS.initTree(this.shadowRoot);
      }
    }

    connectedCallback() {}

    connectedMoveCallback() {}

    attributeChangedCallback() {}

    disconnectedCallback() {}
  }

  customElements.define(name, AlpineBlock);
}
