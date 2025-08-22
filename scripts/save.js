const html = document.querySelector("world-block").outerHTML.toString();
let world = window.location.pathname.split("/").pop();
if (!world || world === "") world = "home";

document.body.dispatchEvent(
  new CustomEvent("playground:event", {
    detail: {
      type: "html-updated",
      payload: { world, html },
    },
  })
);
