export default class ImageBlock extends Block {
  tagName = "image-block";

  static observedAttributes = ["src", "alt", "headers"];

  static defaultAttributes = {
    class: "rounded-sm border border-gray-200 max-w-full",
    alt: "",
  };

  render = `
    <img
      alt="${this.getAttribute("alt") || ""}"
    />
  `;

  connectedCallback() {
    super.connectedCallback();
    this.img = this.shadowRoot.querySelector("img");
    this.loadImage();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback?.(name, oldValue, newValue);
    if (!this.img) return;
    if (name === "alt") this.img.alt = newValue || "";
    if (name === "class") this.img.className = newValue || "";
    if (name === "src" || name === "headers") this.loadImage();
  }

  async loadImage() {
    const src = this.getAttribute("src");
    if (!src) {
      this.img.removeAttribute("src");
      return;
    }

    let headers = {};
    try {
      headers = JSON.parse(this.getAttribute("headers") || "{}");
    } catch (e) {
      console.warn("Invalid headers JSON", e);
    }
    
    try {
      const res = await fetch(src, { headers });
      if (!res.ok) throw new Error(`Failed to load image: ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      this.img.src = objectUrl;
    } catch (err) {
      console.error(err);
      this.img.removeAttribute("src");
    }
  }
}
