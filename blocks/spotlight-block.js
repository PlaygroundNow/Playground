function filenameToName(filename) {
  return filename
    .replace("-block", "")
    .replace(/\.[^.]+$/, "")
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default class Spotlight extends Block {
  tagName = "spotlight-block";

  render = `
<style>
  :host {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    opacity: 0;
    animation: fadeInSpotlight 0.35s ease forwards;
  }
</style>
<div>
  <slot></slot>
</div>
    `;

  renderSlot = `
  <style>
  @keyframes fadeInSpotlight {
    to {
      opacity: 1;
    }
  }
  @keyframes fadeOutSpotlight {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
  .fadeOutSpotlight {
    animation: fadeOutSpotlight 0.35s ease forwards;
  }
  @keyframes trigger {
    from {
      opacity: 1;
    }
    to {
      opacity: 1;
    }
  }
  .trigger {
    animation: trigger 0s;
  }
  .spotlight-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.35);
    z-index: 0;
  }
  .spotlight-container {
    position: fixed;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 32px rgba(0,0,0,0.18);
    padding: 8px 12px;
    min-width: 320px;
    max-width: 600px;
    width: 100%;
    margin-top: 80px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    z-index: 1;
    left: 50%;
    transform: translateX(-50%);
  }
  .spotlight-input {
    width: 100%;
    font-size: 1.3rem;
    padding: 12px 16px;
    border: 1px solid #ddd;
    border-radius: 6px;
    outline: none;
    box-sizing: border-box;
  }
  .spotlight-results {
  	list-style: none;
    margin: 16px 0 0 0;
    padding: 0;
    list-style: none;
    font-size: 1.1rem;
    background: none;
    border: none;
    max-height: 70vh;
    overflow-y: scroll;
  }
  .spotlight-result {
  	list-style: none;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.15s;
  }
  .spotlight-result:hover {
    background: #48C9B0;
    color: white;
  }
    </style>
  	<div class="spotlight-backdrop"></div>
    <div class="spotlight-container">
      <input class="spotlight-input" type="search" placeholder="Spotlight search..." />
      <ul class="spotlight-results">
      </ul>
		</div>
  `;

  connectedCallback() {
    super.connectedCallback();

    this.world = document.querySelector("world-block");
    this.slotted = this.shadowRoot.querySelector("slot");
    this.spotlightResultsContainer = this.querySelector(".spotlight-results");
    this.spotlightBackdrop = this.querySelector(".spotlight-backdrop");

    const kits = this.world?.store?.kits || {};
    this.spotlightResults = [];

    for (const [kit, content] of Object.entries(kits)) {
      for (const type of ["blocks", "scripts", "assets"]) {
        if (Array.isArray(content[type])) {
          for (const name of content[type]) {
            this.spotlightResults.push({
              type: type.slice(0, -1),
              kit,
              name: filenameToName(name),
              location: `${kit}.${type}.${name}`,
            });
          }
        }
      }
    }

    const input = this.querySelector(".spotlight-input");
    if (input) input.focus();
    
    // fetch hax components
    /*fetch('https://cdn.webcomponents.psu.edu/cdn/wc-registry.json')
      .then(resp => resp.json())
    	.then(data => {
      	const results = Object.entries(data).map(wc => ({
        	type: 'hax',
          kit: 'HAX',
          name: filenameToName(wc[0]),
          location: wc[1]
        }));
      	this.spotlightResults = this.spotlightResults.concat(results);
    	});*/
   	
    // Render!
    this.renderResults();

    input.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      this.renderResults(searchTerm);
    });

    this.spotlightBackdrop.addEventListener("click", () => this.remove());
    this.spotlightBackdrop.addEventListener("wheel", (e) => e.preventDefault());

    this._handleClickOutside = this.handleClickOutside.bind(this);
    document.addEventListener("click", this._handleClickOutside);
  }

  renderResults(term = "") {
    this.spotlightResultsContainer.replaceChildren();

    const filtered = this.spotlightResults.filter((r) =>
      r.name.toLowerCase().includes(term),
    ).filter((_, i) => i < 51);
    
    filtered.forEach((r) => {
      const li = document.createElement("li");
      li.tabIndex = 0;
      li.setAttribute("role", "option");
      li.innerHTML = `
      	<flex-block class="justify-between py-1 px-2" static>
        	<flex-block>
          	<text-block>${r.name}</text-block>
            <text-block class="ml-2" style="font-size: 0.95em;">- ${r.kit} / ${r.type}</text-block>
          </flex-block>
          <flex-block>
            <button-block class="cursor-pointer bg-green-500 text-sm text-white p-2 rounded-sm" style="${r.type === 'script' ? 'margin-right: 12px;' : 'display: none;'}">
              Run
            </button-block>
            <button-block class="cursor-pointer bg-blue-500 text-sm text-white p-2 rounded-sm" @click="(e) => { this.emit('playground:event',{type:'open-file',payload:{location:'${r.location}'}}); }">
              Edit
            </button-block>
          </flex-block>
        </flex-block>
      `;
      li.classList.add("spotlight-result");

      function handleSelect(e) {
        if (e.target.tagName.includes("button")) {
          this.remove();
          return;
        }

        e.stopPropagation();
        e.preventDefault();

        if (r.type === "block" /*|| r.type === "hax"*/) {
          const blockPrefix = this.dasherize(r.name.toLowerCase());

          const world = document.querySelector("world-block");
          const worldScrollX = Number(world.getAttribute("scroll-x")) || 0;
          const worldScrollY = Number(world.getAttribute("scroll-y")) || 0;

          const x =
            e.clientX !== undefined
              ? worldScrollX + e.clientX
              : worldScrollX + window.innerWidth / 2;
          const y =
            e.clientY !== undefined
              ? worldScrollY + e.clientY
              : worldScrollY + window.innerHeight / 2;

          if (r.type === "block") {
            world.insertAdjacentHTML(
              "beforeend",
              `<${blockPrefix}-block grabbed x="${x}" y="${y}"></${blockPrefix}-block>`,
            );
          } else if (r.type === "hax") {
          	world.insertAdjacentHTML(
              "beforeend",
              `<scene-block grabbed x="${x}" y="${y}">
              	<${blockPrefix}></${blockPrefix}>
              </scene-block>`,
            );
          }
          this.remove();
        } else if (r.type === "script") {
          this.emit("playground:event", {
            type: "run-script",
            payload: {
              script: r.location,
            },
          });
          this.remove();
        }
      }

      li.addEventListener("mousedown", handleSelect.bind(this));
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleSelect.call(this, e);
        }
      });

      this.spotlightResultsContainer.appendChild(li);
    });
  }

  handleClickOutside(e) {
    if (!this.contains(e.target) && e.target.tagName !== "button-block") {
      this.remove();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback && super.disconnectedCallback();

    document.removeEventListener("click", this._handleClickOutside);
  }

  remove() {
    // Animate fade out, then remove from DOM
    this.querySelector(".spotlight-container").classList.add(
      "fadeOutSpotlight",
    );
    setTimeout(() => super.remove(), 300);
  }

  dasherize(str) {
    return str.replace(/\s+/g, "-");
  }
}
