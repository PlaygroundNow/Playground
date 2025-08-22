import WindowBlock from "./window-block.js";

export default class StageManagerBlock extends WindowBlock {
  tagName = "stage-manager-block";

  renderSlot = `
  <span slot="nav-title">Stage Manager</span>
  <flex-block
    static
    class="bg-white p-2"
  >
    <flex-block class="flex-col p-1">
      <text-block class="font-bold text-lg h-8">Scripts</text-block>
      <repeat-block
        :items="$processes"
        as="script"
      >
        <template slot="repeat">
          <text-block
            :slot="$script.location"
            class="mt-1 border-solid border-b-1 w-[300px]"
          ></text-block>
        </template>
     </repeat-block>
    </flex-block>
    <flex-block class="flex-col p-1">
      <text-block class="font-bold text-sm h-8 pb-1 flex items-end">
        Status
      </text-block>
      <repeat-block
        :items="$processes"
        as="script"
      >
        <template slot="repeat">
          <text-block
            :slot="$script.status"
            :class="'mt-1 border-solid border-b-1 border-black ' + ($script.status === 'running' ? 'text-green-500' : 'text-orange-500')"
          ></text-block>
        </template>
      </repeat-block>
    </flex-block>

    <flex-block class="flex-col p-1">
      <text-block class="font-bold text-sm h-8 pb-1 flex items-end">
        Action
      </text-block>
      <repeat-block
        :items="$processes"
        as="script"
      >
        <template slot="repeat">
          <flex-block>
            <button-block
              class="mt-1 text-blue-500 border-solid border-b-1 border-black cursor-pointer"
              :slot="$script.status === 'running' ? 'stop' : 'start'"
              @click="this.emit('start-stop-script', { location: $script.location });"
              >stop</button-block
            >
            <button-block
              class="mt-1 ml-2 text-blue-500 border-solid border-b-1 border-black cursor-pointer"
              @click="(e) => this.emit('view-logs', { processId: $script.processId, event: e });"
              >view logs</button-block
            >
          </flex-block>
        </template>
      </repeat-block>
    </flex-block>
  </flex-block>
 	`;

  connectedCallback() {
    super.connectedCallback();

    this.div = this.shadowRoot.querySelector("div");

    this.addEventListener("start-stop-script", this.startStopScript);
    this.addEventListener("view-logs", this.viewLogs);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.removeEventListener("start-stop-script", this.startStopScript);
    this.removeEventListener("view-logs", this.viewLogs);
  }

  startStopScript(e) {
    const data = e.detail;

    console.log(data);
  }

  viewLogs(e) {
    const { processId, event } = e.detail;

    const worldScrollX = Number(this.world.getAttribute("scroll-x")) || 0;
    const worldScrollY = Number(this.world.getAttribute("scroll-y")) || 0;

    const x = worldScrollX + event.clientX;
    const y = worldScrollY + event.clientY;

    // Insert as HTML string for custom element
    this.world.insertAdjacentHTML(
      "beforeend",
      `<script-logger-block process-id="${processId}" x="${Math.round(x)}" y="${Math.round(y)}"></script-logger-block>`
    );
  }
}
