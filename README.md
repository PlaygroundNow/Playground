[![Wiki](https://img.shields.io/badge/wiki-Documentation-blue)](../../wiki)

# Playground (Beta) - Live code on the web!
Start building on the public beta site at https://playground.now

<img width="1710" height="984" alt="Screenshot 2025-08-21 at 10 54 38 PM" src="https://github.com/user-attachments/assets/82d1e9e3-98aa-4e1e-9431-de8c7f91f9b1" />

## What is Playground?

Playground is a live coding environment built with modern web technologies:
- Web Components (https://github.com/web-padawan/awesome-web-components)
- Block (Vue.js-like frontend framework)
- Deno Scripts (https://deno.com)
- Tailwind CSS (https://tailwindcss.com)

Live coding in Playground means:
- The world and all its components can be edited by right-clicking, even the Playground UI itself!
- Start backend processes as Deno scripts, edit them while they are running
- Create entire applications using point and click, or write the block code yourself
- Install kits of blocks and scripts or share your own creations in the Library

## Why code in this way?

1. Liveness. Stay in the flow by editing UI and backend code without restarting a process or switching screens.
2. Directness. Code is where you expect it to be, right click any component to view the code behind.
3. Collaborative. Work side by side with designers, developers, clients, project managers, and other stakeholders.

## What inspired Playground?

Playground closely resembles lively.next (https://lively-next.org), which itself is inspired by the SmallTalk programming language.

##  How do I get started?

Playground is available in public beta. Navigate to https://playground.now in your browser and start live coding.

### 1. Create your own world (TBD)

A world is a canvas made of blocks. This canvas is powerful because blocks persist their data and can trigger frontend scripts or backend processes. Each canvas works like its own computer: it can store files, run applications in windows, connect to the internet, and execute background processes.

### 2. Create a scene, compose Blocks into apps.

1. Drag a scene into the world by clicking **Spotlight** in the top bar, or use the shortcut **CMD+K**.  
2. Use Spotlight to drag blocks onto the scene, try a button or input block.  
3. Alternatively, right-click the scene and select **Code** in the menu to manually type in blocks.  
4. Add events to your block:  
   1. Use **Code** in the right-click menu to add events to your block.  
   2. Try adding an alert to the click event of the button block by typing:  
      ```javascript
      @click="alert('hi');"
      ```  
      The code inside will be evaluated on click.  
   3. For an input block you may want to use the input event:  
      ```javascript
      @input="$name = props.value"
      ```  
      Whenever the input is typed in, the store variable `$name` will get set to the current value.  
5. Add styles to your block by writing Tailwind classes directly into the `class` attribute.

### 3. Store data

A simple way to persist data in Playground is to write to the world store. Open a debug block by right-clicking and selecting **Debug** in the menu. Set a variable, like:

```javascript
this.world.store.todoList = []
```

You can execute this one of two ways.

1. Right-click the debug code and select **Do it!** in the menu. This will execute all the code in the debug block.
2. Highlight the entire line of code, right-click and select **Print it!** in the menu. This will execute only the highlighted code, and print the value at the bottom of the debug editor.

After you do this, try adding something to the list with the dollar sign shorthand:

```javascript
$todoList = [...$todoList, 'Take out the trash']`.
```

Do it! or Print it! and the value is persisted in the world.

### 4. Write a backend script

Open the Library by right-clicking and selecting **Library** in the menu. Select the kit you would like to create your script in and create a new script.

Execute the script by opening **Spotlight** and selecting the script in the list.

You can also execute this script by adding the following to a click event.

```javascript
this.emit('playground:event', {
  type: 'run-script',
  payload: {
    script: 'KIT_NAME.scripts.my-script.ts',
  },
});
```

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/PlaygroundNow/Playground)
