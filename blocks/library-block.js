import WindowBlock from "./window-block.js";

export default class LibraryBlock extends WindowBlock {
  tagName = "library-block";

  static defaultAttributes = {
    class: "border-black border-solid border-1 rounded-sm",
  };

  renderSlot = `
    <span slot="nav-title">Library</span>
    <flex-block class="h-[400px]" static>
      <flex-block class="flex-col bg-white p-4 border-r-2 border-gray-200 border-dashed">
        <repeat-block
          :items="$kitsList"
          as="kit">
          <template slot="repeat">
            <text-block
            	:class="\`hover:text-blue-500 cursor-pointer whitespace-nowrap py-1 px-2 rounded-sm \${$selectedKit === $kit && 'bg-gray-100'}\`"
            	:slot="$kit" @click="$selectedKit = $kit" />
          </template>
        </repeat-block>
      </flex-block>
      <flex-block class="flex-col bg-white p-4 border-r-2 border-gray-200 border-dashed min-w-36">
        <repeat-block
          :items="Object.keys($kits?.[$selectedKit] ?? [])"
          as="folder">
          <template slot="repeat">
          	<text-block
            	:class="'hover:text-blue-500 cursor-pointer whitespace-nowrap py-1 px-2 rounded-sm ' + ($selectedFolder === $folder ? 'bg-gray-100' : '')"
            	:slot="$folder" @click="$selectedFolder = $folder" />
          </template>
        </repeat-block>
      </flex-block>
      <flex-block class="flex-col overflow-y-scroll bg-white p-4 border-r-2 border-gray-200 border-dashed min-w-xs">
        <text-block :slot="$selectedFolder === 'scripts' ? 'Create Script' : 'Create Block'" class="pb-2"></text-block>
        <flex-block class="border-b-1 pb-4 mb-2 flex-wrap">
        	<input-block
          	placeholder="Name"
            class="mr-2 px-2 py-1 rounded-sm border-solid border-2 border-black bg-[#f5f5f5] hover:bg-[#ddd] active:bg-[#ddd]"
          	@input="$name = props.value"
          ></input-block>
          <button-block class="bg-blue-500 px-4 rounded-sm text-white" @click="this.emit('create-block')">Create</button-block>
          <text-block :slot="$error || ' '" :class="'w-full text-red-500 ' + ($error ? 'hidden' : '')"></text-block>
        </flex-block>
        <repeat-block
          :items="$kits[$selectedKit]?.[$selectedFolder] ?? []"
          as="file">
          <template slot="repeat">
            <text-block
              class="py-1 cursor-pointer hover:text-blue-500"
              :pascal-case="$selectedFolder === 'blocks'"
              :slot="$selectedFolder === 'blocks' ? $file.split('.')[0] : $file"
              @click="this.emit('playground:event', { type: 'open-file', payload: { location: [$selectedKit, $selectedFolder, $file].join('.')}})" />
        		</template>
        </repeat-block>
      </flex-block>
    </flex-block>
  `;

  constructor() {
    super();

    this.store.selectedKit = "Playground";
    this.store.selectedFolder = "blocks";
    this.store.kitsList = Object.keys(this.get("kits") ?? {});
    this.store.error = "";
    this.store.name = "";
  }

  connectedCallback() {
    super.connectedCallback();

    this.createBlockListener = this.addEventListener("create-block", this.createBlock);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.removeEventListener("create-block", this.createBlockListener);
  }

  createBlock() {
    const name = this.store.name;
    const isAlphanumeric = /^[a-zA-Z0-9]+$/.test(name);
    const endsWithBlock = /block$/i.test(name);

    if (!isAlphanumeric) {
      this.store.error = "Name must be alphanumeric with no spaces.";
      return;
    }
    if (endsWithBlock) {
      this.store.error = "Name cannot end with 'Block' or 'block'.";
      return;
    }

    const snakecase =
      name
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
        .toLowerCase() + "-block.js";

    this.store.error = "";
    this.emit("playground:event", {
      type: "create-block",
      payload: { name, location: [this.store.selectedKit, this.store.selectedFolder, snakecase].join(".") },
    });
  }
}
