export default class SceneBlock extends Block {
  tagName = "scene-block";

  quickActions = [
    {
      icon: "play",
      title: "Play",
      action: () => {
        window.open(this.getAttribute("route"), "_blank");
      },
    },
  ];

  static defaultAttributes = {
    class:
      "min-w-[250px] min-h-[300px] bg-white rounded-lg shadow-xl p-4 flex flex-col gap-3 border-solid border-black border-2",
  };

  render = `
    <div>
      <slot></slot>
    </div>
  `;
}
