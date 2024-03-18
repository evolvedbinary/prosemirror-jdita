import { keymap } from "prosemirror-keymap";
import { MarkType, NodeType, Schema } from "prosemirror-model";
import { menuBar, MenuElement, MenuItem, MenuItemSpec } from "prosemirror-menu";
import { toggleMark, newLine, hasMark, insertNode, insertImage, InputContainer } from "./commands";
import { redo, undo } from "prosemirror-history";
import { Command } from "prosemirror-state";

/**
 * This is the entire DOM node of the Prosemirror editor that will be observed for DOM mutations
 */
const targetNode = document.getElementById('editor');

/**
 * Set the Observer to watch for changes being made to the editor DOM tree
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver}
 * for more info on the MutationObserver interface
 */
// make sure the editor element exists
if (targetNode) {
  // Options for the observer (which mutations to observe)
  const config = { attributes: false, childList: true, subtree: true };
  // Callback function to execute when mutations are observed
  const callback: MutationCallback = function(mutationsList) {
    for(const mutation of mutationsList) {
      // if the mutation happened on one of the children of the editor
      if (mutation.type === 'childList') {
        // if the mutation happened on the menubar
        if((mutation.target as HTMLElement).classList.contains('ProseMirror-menubar')){
          let separators: HTMLElement[] = [];
          mutation.addedNodes.forEach(node => {
            // if the node is a separator, add it to the separators array
            if (node.childNodes[0] && (node.childNodes[0] as HTMLElement).classList.contains('separator')) {
              separators.push(node as HTMLElement);
            }
          });
          // set the CSS `flex grow` rule of the separators to 1
          separators.forEach(separator => separator.style.flex = '1');
        }
      }
    }
  };

  /**
   * Create an observer instance linked to the callback function
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver}
   * for more info on the MutationObserver interface
   */
  const observer = new MutationObserver(callback);

  /**
   * Start observing the target node for configured mutations
   */
  observer.observe(targetNode, config);
}

/**
 * Provide keyboard shortcuts for the editor
 *
 * @remarks
 * The `newLine` is a custom command and is representing the `enterPressed` command
 * `toggleMark`, `undo`, and `redo` are Prosemirror functions
 *
 * @param schema - generated schema from JDITA
 * @returns - keymap object of shortcuts
 */
export function shortcuts(schema: Schema) {
  return keymap({
    'Enter': newLine,
    'Ctrl-b': toggleMark(schema.marks.b),
    'Ctrl-u': toggleMark(schema.marks.u),
    'Ctrl-i': toggleMark(schema.marks.i),
    'Ctrl-=': toggleMark(schema.marks.sub),
    'Ctrl-+': toggleMark(schema.marks.sup),
    'Ctrl-z': undo,
    'Ctrl-y': redo,
    'Ctrl-Shift-z': redo,
  });
}

/**
 * Create a new instance of MenuItem and attach a command
 *
 * @example of the returned MenuItem
 * MenuItem {spec: {class: "ic-undo", enable: undo(state, dispatch), icon:{}, run: undo(state, dispatch), title: "Undo"}}
 *
 * @param command - The command associated with the menu item
 * @param props - The properties of the menu item
 * @returns A new MenuItem instance
 */
function commandItem(command: Command, props: Partial<MenuItemSpec> = {}) {
  return new MenuItem({
    ...props,
    run: command,
    enable: command,
  });
}

/**
 * Processes MarkTypes and mark properties
 * and returns a MenuItem containing information about all active
 * and enabled menu mark items and their properties and binds them to a command.
 *
 * @remarks
 * Will be called and populated by menu() to bind mark item commands in the editor menu
 *
 * @param mark - MarkType object containing all values of the instance, e.g. name: 'b', rank: '4' (order in menu)
 * @param props - The properties of the mark item (MenuElement) that will be inserted as HTML attributes
 *  to the menu element in the editor, e.g. title: 'Bold', class: 'ic-bold'
 * @returns The MenuItem object
 */
function markItem(mark: MarkType, props: Partial<MenuItemSpec> = {}): MenuElement {
  const command = toggleMark(mark);
  return commandItem(command, {
    ...props,
    active: state => hasMark(state, mark),
    enable: state => !state.selection.empty,
  });
}

/**
 * Menu item callbacks
 */
interface SimpleItemCallbacks {
  call: () => void;
  enable?: () => boolean;
  active?: () => boolean;
}

/**
 * Creates a custom instance of class MenuItem
 * when clicked, executes a command
 *
 * @remarks
 * This instance of MenuItem is used for the "Debug Info" icon button in the menu
 *
 * @example of the MenuItem object
 * MenuItem {spec: {label: 'Show debug info', class: 'ic-bug', css: 'color: #c81200', enable: undefined, run}}
 *
 * @example of the callback functions
 * active:() => document.body.classList.contains('debug')
 * call:() => document.body.classList.toggle('debug')
 *
 * @param callbacks - callbacks `active`, `call`, e.g.
 * @param props - MenuItem properties, e.g. {label: 'Show debug info', class: 'ic-bug', css: 'color: #c81200'}
 * @returns The MenuItem object
 */
function simpleCommand(callbacks: SimpleItemCallbacks | (() => void), props: Partial<MenuItemSpec> = {}): MenuElement {
  if (typeof callbacks === 'function') {
    callbacks = { call: callbacks };
  }
  return new MenuItem({
    ...props,
    run: (state, dispatch) => {
      (callbacks as SimpleItemCallbacks).call();
      dispatch(state.tr);
    },
    enable: callbacks.enable,
    active: callbacks.active,
  });
}

/**
 * Create a new instance of class MenuItem and provide a classname "separator"
 *
 * @remarks
 * This is used for a simple vertical line as a visual seperator for the items in the menu bar
 *
 * @returns The new instance of MenuItem
 */
function separator(): MenuElement {
  return new MenuItem({
    run: () => {},
    enable: () => false,
    class: 'separator',
  });
}

/**
 * Insert a new item into the menu
 *
 * @param type - NodeType object
 * @param props - MenuItem Configuration object
 * @returns MenuElement
 */
function insertItem(type: NodeType, props: Partial<MenuItemSpec> = {}): MenuElement {
  return commandItem(insertNode(type), {
    ...props,
  });
}

/**
 * Create a menu button for uploading an image
 *
 * @param type - The NodeType object
 * @param props - The icon object containing the title and the class of the icon
 * @returns A MenuElement containing the HTML node of the entire button element bound to its command
 */
function insertImageItem(type: NodeType, props: Partial<MenuItemSpec> = {}): MenuElement {
  const input = new InputContainer();
  const command = insertImage(type, input);
  return commandItem(command, {
    ...props,
    enable: command,
    // Prosemirror method `render`: Renders the icon according to its MenuItemSpec.display, and adds an event handler which
    // executes the command when the representation is clicked.
    render(editorView) {
      const el = document.createElement('div');
      // create a button containing the "Open XDITA file" option
      el.classList.add('ProseMirror-menuitem-file');
      input.el = document.createElement('input');
      input.el.type = 'file';
      input.el.title = typeof props.title === 'function' ? props.title(editorView.state) : props.title || '';
      // create the label for the button and add a CSS class according to the EditorState
      const label = document.createElement('span');
      label.innerHTML = props.label || '';
      el.appendChild(input.el);
      el.appendChild(label);
      if (command(editorView.state)) {
        el.classList.remove('ProseMirror-menu-disabled');
        input.el.disabled = false;
      } else {
        el.classList.add('ProseMirror-menu-disabled');
        input.el.disabled = true;
      }
      // return the HTML node containing the "insert Image" button
      return el;
    },
  });
}

/**
 * Supports Menu Item placement
 */
export interface Additions {
  start?: MenuElement[][];
  before?: MenuElement[][];
  after?: MenuElement[][];
  end?: MenuElement[][];
}

/**
 * Create a menu bar for the editor
 *
 * @param schema - Node schema
 * @param param1 - Object that contains the placement of the menu items
 * @returns menuBar
 */
export function menu(schema: Schema, { start, before, after, end}: Additions = {}) {
  const debug = [
    separator(),
    simpleCommand({
      call: () => document.body.classList.toggle('debug'),
      active: () => document.body.classList.contains('debug'),
    }, { label: 'Show debug info', class: 'ic-bug', css: 'color: #c81200' }),
  ];
  const toolbar:MenuElement[][] = [[
    commandItem(undo, { title: 'Undo', class: 'ic-undo' }),
    commandItem(redo, { title: 'Redo', class: 'ic-redo' }),
  ], [
    markItem(schema.marks.b, { title: 'Bold', class: 'ic-bold' }),
    markItem(schema.marks.u, { title: 'Underlined', class: 'ic-underline' }),
    markItem(schema.marks.i, { title: 'Italic', class: 'ic-italic' }),
    markItem(schema.marks.sub, { title: 'Subscript', class: 'ic-subscript' }),
    markItem(schema.marks.sup, { title: 'Superscript', class: 'ic-superscript' }),
  ], [
    insertItem(schema.nodes.ol, { title: 'Ordered list', class: 'ic-olist' }),
    insertItem(schema.nodes.ul, { title: 'Unordered list', class: 'ic-ulist' }),
    insertImageItem(schema.nodes.image, { title: 'Insert image', class: 'ic-image' }),
  ]];
  if (!start) {
    start = [];
  }
  if (!before) {
    before = [];
  }
  if (!after) {
    after = [];
  }
  if (!end) {
    end = [];
  }
  if (after.length > 0) {
    after[after.length - 1] = [...after[after.length - 1], ...debug];
  } else {
    toolbar[toolbar.length - 1] = toolbar[toolbar.length - 1].concat(debug);
  }
  if (before.length > 0) {
    before[before.length - 1] = [separator(), ...before[before.length - 1]];
  } else {
    toolbar[0].unshift(separator());
  }
  return menuBar({ content: [
    ...start,
    ...before,
    ...toolbar,
    ...after,
    ...end,
  ] });
}
