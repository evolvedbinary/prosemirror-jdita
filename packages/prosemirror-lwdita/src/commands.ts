/*!
Copyright (C) 2020 Evolved Binary

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

export { toggleMark } from 'prosemirror-commands';
import { canSplit } from 'prosemirror-transform';
import { chainCommands } from 'prosemirror-commands';
import { Fragment, MarkType, Node, NodeType, ResolvedPos } from 'prosemirror-model';
import { Command, EditorState, TextSelection, Transaction } from 'prosemirror-state';

/**
 * Create a new Node and fill it with the args as attributes.
 * Fill the node with child nodes if they're required.
 *
 * @privateRemarks
 * An image node is only retrieving the `href` attribute from the source, the according `alt` tag is not implemented yet.
 *
 * @param type - NodeType
 * @param args - Node attributes
 * @returns a new Node
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createNode(type: NodeType, args: Record<string, any> = {}): Node {
  switch (type.name) {
    case 'p': return type.createAndFill() as Node;
    case 'data': return type.createAndFill({}, type.schema.text('text')) as Node;
    case 'simpletable': return type.createAndFill({}, createNode(type.schema.nodes['strow'])) as Node;
    case 'li': return type.createAndFill({}, createNode(type.schema.nodes['p'])) as Node;
    case 'stentry': return type.createAndFill({}, createNode(type.schema.nodes['p'])) as Node;
    case 'ul':
    case 'ol': return type.createAndFill({}, createNode(type.schema.nodes['li'])) as Node;
    case 'section': return type.createAndFill({}, createNode(type.schema.nodes['ul'])) as Node;
    case 'strow': return type.createAndFill({}, createNode(type.schema.nodes['stentry'])) as Node;
    case 'image': return type.createAndFill({ href: args.src, height: args.height, width: args.width, scope: args.scope }) as Node;
    case 'fig': return type.createAndFill({}, createNode(type.schema.nodes['image'], args)) as Node;
  }
  throw new Error('unkown node type: ' + type.name);
}

/**
 * Creates a node tree from the given NodeType array.
 *
 * @param tree - The node tree of type `NodeType` that has been passed
 * @returns The node object
 */
export function createNodesTree(tree: NodeType[]): Node {
  let result: Node | undefined;
  // Go through the NodeType array ("tree")
  // and call `createAndFill()` on each item.
  tree.forEach(type => {
    // Create a node object.
    // If needed, create a new one to the start or
    // end of the given fragment to make it fit the node.
    // If no fitting wrapping can be found, return null.
    // Assign the result to variable "result".
    result = type.createAndFill({}, result) as Node;
  });
  // Return the node object
  return result as Node;
}

/**
 * Creates a command to insert a new node at the current cursor position.
 *
 * @remarks
 * This function will be called by `insertItem()` which again will be called by `menu()`.
 * `insertNode` will help to create editor buttons in the editor menu bar,
 * currently these are the buttons for creating new ordered and unordered lists.
 * menu() -\> insertItem() -\> insertNode()
 *
 * @param type - NodeType
 * @returns Command
 */
export function insertNode(type: NodeType): Command {
  // type = the NodeTypes that have been initialized in the menu,
  // currently the types are `ol` and `ul` nodes (that can be inserted via the menu buttons)
  // state = the current EditorState
  // dispatch = without any interaction it will be undefined at runtime, but if triggered by clicking one of the
  // buttons with the according `type`, the Prosemirror `dispatch` function will be called:
  // this will dispatch a transaction
  return function (state, dispatch) {
    try {
      // If the cursors selection is not empty, return false
      if (!state.selection.empty) {
        return false;
      }
      // "dispatch" becomes "true" when a button in the menu
      // has been clicked that matches the required NodeType, e.g. "ol" or "ul"
      if (dispatch) {
        // create a new node for the according type
        const node = createNode(type);
        // update the the transaction object and thus the EditorState
        const tr = state.tr.insert(state.selection.$to.end() + 1, node);
        // with the information about exact position and selection
        const pos = tr.selection.$to.doc.resolve(tr.selection.$to.pos + 2);
        // create a new text section at the given position info
        const newSelection = new TextSelection(pos, pos);
        // and update the transaction's current selection - it will determine the
        // selection that the editor gets when the transaction is applied.
        // Scroll to the updated node in the browser's editor window.
        dispatch(tr.setSelection(newSelection).scrollIntoView());
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

/**
 * Construct a type alias `InputContainerListener`.
 */
export type InputContainerListener = (this: HTMLInputElement, event: Event) => void;

/**
 * Create a new class `InputContainer` to handle uploading of images
 * currently used in `insertImageItem()` as a new instance
 */
export class InputContainer {
  // class fields:
  // optional, type HTMLInputElement
  _el?: HTMLInputElement;
  // Type parameters for Record are string and HTMLInputElement + Event,
  // both by default set to an empty object
  listeners: Record<string, InputContainerListener> = {};
  // bind object property "_el" to a function of type HTMLInputElement
  // or undefined that will be called when that property is looked up

  // class methods:
  get el(): HTMLInputElement | undefined {
    return this._el;
  }
  // setter function with arguments of type HTMLInputElement or undefined
  set el(value: HTMLInputElement | undefined) {
    // will not do anything, if the the current HTML input element equals the to-be-set element
    if (this._el === value) {
      return;
    }
    this._el = value;
    this._el?.addEventListener('change', this.change.bind(this));
  }

  change(event: Event) {
    if (this._el) {
      const el = this._el;
      // method "keys" returns the names of the enumerable string properties and methods of object "this.listeners"
      Object.keys(this.listeners)
        // and returns the keys of the listeners array with value "function"
        .filter(key => typeof this.listeners[key] === 'function')
        // and binds those to the change event
        .forEach(key => this.listeners[key].bind(el)(event));
    }
  }
  // enable the input container to listen to events
  on(key: string, listener: InputContainerListener) {
    this.off(key);
    this.listeners[key] = listener;
  }
  // disable the input container events
  off(key: string) {
    if (this.listeners[key]) {
      delete (this.listeners[key]);
    }
  }
}

/**
 * Render an image upload dialog. with an overlay
 * upload an image from local machine or a URL
 * set the image attributes like height, width, alt text
 * @param callback - callback function to handle the image attributes
 * @param node - Node selected node to edit
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function imageInputOverlay(callback: (args: any) => void, node?: Node): void {
  // show the image upload dialog
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'overlay';

  // Create dialog
  const dialog = document.createElement('div');
  dialog.id = 'dialog';

  // Create dialog content
  const title = document.createElement('h1');
  title.textContent = 'Upload Image';

  const fileLabel = document.createElement('label');
  fileLabel.textContent = 'File:';
  fileLabel.htmlFor = 'fileInput';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'fileInput';

  const urlLabel = document.createElement('label');
  urlLabel.textContent = 'URL:';
  urlLabel.htmlFor = 'urlInput';
  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.id = 'urlInput';
  urlInput.placeholder = 'url';

  const embeddedLabel = document.createElement('label');
  embeddedLabel.textContent = 'embed a copy';
  embeddedLabel.htmlFor = 'embeddedInput';
  const embeddedInput = document.createElement('input');
  embeddedInput.type = 'checkbox';
  embeddedInput.id = 'embeddedInput';

  const heightLabel = document.createElement('label');
  heightLabel.textContent = 'Height:';
  heightLabel.htmlFor = 'heightInput';
  const heightInput = document.createElement('input');
  heightInput.type = 'text';
  heightInput.id = 'heightInput';
  heightInput.placeholder = 'Height';

  const widthLabel = document.createElement('label');
  widthLabel.textContent = 'Width:';
  widthLabel.htmlFor = 'widthInput';
  const widthInput = document.createElement('input');
  widthInput.type = 'text';
  widthInput.id = 'widthInput';
  widthInput.placeholder = 'Width';

  const altTextLabel = document.createElement('label');
  altTextLabel.textContent = 'Alt Text:';
  altTextLabel.htmlFor = 'altTextInput';
  const altTextInput = document.createElement('input');
  altTextInput.type = 'text';
  altTextInput.id = 'altTextInput';
  altTextInput.placeholder = 'Alt Text';

  const btnConatiner = document.createElement('div');
  btnConatiner.id = 'btnConatiner';

  const closeButton = document.createElement('button');
  closeButton.id = 'closeButton';
  closeButton.classList.add('ic-cross');

  const okButton = document.createElement('button');
  okButton.id = 'okButton';
  okButton.classList.add('ic-checkmark');

  btnConatiner.appendChild(closeButton);
  btnConatiner.appendChild(okButton);

  // Append dialog content to dialog
  dialog.appendChild(title);

  const fields = [
    { label: fileLabel, input: fileInput },
    { label: urlLabel, input: urlInput },
    { label: embeddedLabel, input: embeddedInput },
    { label: heightLabel, input: heightInput },
    { label: widthLabel, input: widthInput },
    { label: altTextLabel, input: altTextInput },
  ];

  fields.forEach(field => {
    const container = document.createElement('div');
    container.classList.add('field-container');
    container.appendChild(field.label);
    container.appendChild(field.input);
    dialog.appendChild(container);
  });

  dialog.appendChild(btnConatiner);

  // Append dialog to overlay
  overlay.appendChild(dialog);

  // Append overlay to body
  document.body.appendChild(overlay);

  if(node) {
    //extract the image attributes
    const src = node.attrs.href;
    const alt = node.attrs.alt;
    const height = node.attrs.height;
    const width = node.attrs.width;
    //set the input fields
    urlInput.value = src;
    altTextInput.value = alt;
    heightInput.value = height;
    widthInput.value = width;
  }

  // Add event listener to close button
  closeButton.addEventListener('click', function () {
    document.body.removeChild(overlay);
    return null;
  });

  urlInput.addEventListener('change', () => {

  });

  // Add event listener to ok button
  fileInput.addEventListener('change', function () {
    if (!fileInput.files || !fileInput.files.length) return false;
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = () => {
    };
    reader.onload = () => {
      const img = new Image();
      img.onload = function () {
        const width = img.width;
        const height = img.height;
        // Update the input fields with the image dimensions
        widthInput.value = width as unknown as string;
        heightInput.value = height as unknown as string;
      };
      img.src = reader.result as string;
    };
  });

  okButton.addEventListener('click', () => {
    if (fileInput.files?.length) {
      const reader = new FileReader();
      const file = fileInput.files[0];
      reader.readAsDataURL(file);
      reader.onload = () => {
        // capture the file name in the base64 string
        // edit the image base64 to include a url copy
        const base64 = reader.result?.split(',') as string;
        const base64withName = base64[0] + `;filename=${file.name}` + ',' + base64[1];
        callback({
          src: base64withName,
          scope: 'peer',
          alt: altTextInput.value,
          height: heightInput.value,
          width: widthInput.value
        })
      }
    } else if (urlInput.value.length && !embeddedInput.checked) {
      callback({
        src: urlInput.value,
        scope: 'external',
        alt: altTextInput.value,
        height: heightInput.value,
        width: widthInput.value
      })
    } else if (urlInput.value.length && embeddedInput.checked) {
      // handled the case where the user wants to embed the image from an external source
      fetch(urlInput.value)
        .then(response => response.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            // edit the image base64 to include a url copy
            const base64 = reader.result?.split(',') as string;
            const base64withurl = base64[0] + `;url=${urlInput.value}` + ',' + base64[1];
            callback({
              src: base64withurl,
              scope: 'peer',
              alt: altTextInput.value,
              height: heightInput.value,
              width: widthInput.value
            })
          };
          reader.readAsDataURL(blob);
        })
    }
    document.body.removeChild(overlay);
  });
}


/**
 * Creates a command to insert a new Image node at the current cursor position.
 *
 * @remarks
 * Will be triggered onload via function menu() in example.ts
 *
 * @privateRemarks
 * Error handling should be improved in `reader.onerror = () => {};`
 *
 * @param type - NodeType
 * @param input - InputContainer
 * @returns Command
 */
export function insertImage(type: NodeType): Command {
  return function (state, dispatch) {
    // on click, the cursor selection should be empty
    try {
      if (!state.selection.empty) {
        return false;
      }
      if (dispatch) {
        // show the image upload dialog
        imageInputOverlay((imageInfo) => {
          if (!imageInfo) return false;
          const node = createNode(type.schema.nodes['fig'], { src: imageInfo.src, scope: imageInfo.scope, alt: imageInfo.alt, height: imageInfo.height, width: imageInfo.width });
          const tr = state.tr.insert(state.selection.$to.pos, node);
          dispatch(tr.scrollIntoView());
        });
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

/**
 * Check the node in allowed nodes list and return the index of the node.
 * This function also ensures that the order of the nodes is correct.
 *
 * @param type - NodeType or nodeName
 * @returns node index from the list of nodes
 */
function canCreateIndex(type: NodeType) {
  return ['data', 'ul', 'li', 'p', 'section', 'stentry', 'strow', 'simpletable'].indexOf(type.name);
}


/**
 * Check if the node can be created or not.
 *
 * @param type - NodeType object, contains the node name
 * @returns Boolean of whether the node can be created or not
 */
function canCreate(type: NodeType) {
  return canCreateIndex(type) > -1;
}

/**
 * Create an array of NodeTypes that are "allowed" nodes to be
 * added at the current curser position.
 *
 * @remarks
 * `defaultBlocks` will be triggered on key "press enter", function `enterEOL()`
 * which calls `defaultBlocksAt()`, in which `defaultBlocks()` is finally called.
 *
 *
 * @param pos - Cursor position
 * @param depth - distance from the current cursor position to the closest parent Node with children
 * @returns List of NodeTypes that can be created
 */
function defaultBlocks(pos: ResolvedPos, depth = 0) {
  // Get the content match at the current cursor position
  const match = pos.node(-depth - 1).contentMatchAt(pos.indexAfter(-depth - 1));

  const result: NodeType[] = [];
  // loop through the possible content matches
  for (let i = 0; i < match.edgeCount; i++) {
    const edge = match.edge(i)
    // check if the node can be created
    if (canCreate(edge.type)) {
      // if success, then add new NodeType object to the array
      result.push(edge.type);
    }
  }
  return result;
}


/**
 * Get the Node that can be created at the current cursor position.
 *
 * @param pos - ResolvedPos current cursor position
 * @param depth - distance from the current cursor position to the closest parent Node with children
 * @param preferred - preferred NodeType
 * @returns NodeType
 */
function defaultBlockAt(pos: ResolvedPos, depth = 0, preferred?: NodeType) {
  let index = -1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let type: NodeType = null as any;
  // assign all allowed NodeType objects to variable `blocks`
  const blocks = defaultBlocks(pos, depth || undefined);

  // if the preferred node is contained in the default node blocks, then return the current node
  if (preferred && blocks.find(block => block.name === preferred.name)) {
    return preferred;
  }
  // loop through the allowed blocks and return the first block that can be created
  blocks.forEach(newType => {
    const newIndex = canCreateIndex(newType);
    if (newIndex > index) {
      index = newIndex;
      type = newType;
    }
  });
  return type;
}

/**
 * Handle the enter key event when the cursor is at the end of the line.
 *
 *
 * @param tr - The transaction object
 * @param dispatch - dispatch function
 * @param depth - distance from the current cursor position to the closest parent Node with children
 * @returns Boolean - true if the transaction is triggered
 */
export function enterEOL(tr: Transaction, dispatch = false, depth = 0): Transaction | false {
  const { $from, $to } = tr.selection
  const parent = $to.node(-depth || undefined);
  // get the allowed node types that can be created at the current cursor position
  const type = defaultBlockAt($to, depth, parent.type);

  // if the transaction is triggered from the last function call
  if (dispatch) {
    //if we have a possible node type to create
    if (type) {
      // get the new cursor position
      const side = (!$from.parentOffset && $to.index() < parent.childCount ? $from : $to).pos + depth + 1;
      // create and insert the new node
      tr = tr.insert(side, createNodesTree(getTree($from, depth)));
      // select the new node
      tr = tr.setSelection(TextSelection.create(tr.doc, side + depth + 1));
      // complete the transaction
      return tr.scrollIntoView();
    }
    return false;
  }
  return false;
}

/**
 * Deletes the empty line in the current cursor position
 *
 * @param tr - The transaction object
 * @param depth - distance from the current cursor position to the closest parent Node with children
 * @param shift - cursor shift value to sleect the empty line
 * @returns deleteSelection transaction object
 */
export function deleteEmptyLine(tr: Transaction, depth = 0, shift = 0): Transaction {
  // select the empty line and delete it
  return tr.setSelection(TextSelection.create(tr.doc, tr.selection.anchor - depth * 2 + shift, tr.selection.anchor + shift)).deleteSelection();
}

/**
 * Handle the enter key event when the cursor is at empty line.
 *
 * @param tr - The Transaction object
 * @param dispatch - A boolean, set to `false`
 * @param depth - distance from the current cursor position to the closest parent Node with children
 * @returns transaction of EnterEOL or false
 */
export function enterEmpty(tr: Transaction, dispatch = false, depth = 0): Transaction | false {
  // if we are trying to go deeper in a empty node.
  if (depth > 0) {
    // delete the empty line
    deleteEmptyLine(tr, depth);
  }
  return enterEOL(tr, dispatch, depth);
}

/**
 * Handle the enter key event when the cursor is in the middle of a node.
 *
 * @param tr - transaction object
 * @param dispatch - dispatch function
 * @param depth - distance from the current cursor position to the closest parent Node with children
 * @returns boolean - true if the transaction is triggered
 */
export function enterSplit(tr: Transaction, dispatch = false, depth = 0): Transaction | false {
  depth++;
  let { $from, $to } = tr.selection;
  // if the transaction is triggered from the last function call
  if (dispatch) {
    // check if the cursor is at the end of the line
    const atEnd = $to.parentOffset == $to.parent.content.size;
    // check if the previous node is empty
    const prevDepth = getPrevDepth(tr);
    if (prevDepth > 0) {
      // setting $from and $to is not necessary here, as they are already set above
      $from = tr.selection.$from;
      $to = tr.selection.$to;

      depth++;
      // split the parent node
      tr = tr.split(tr.mapping.map($from.pos), depth);
      const pos = tr.selection.from;
      const selStart = pos - prevDepth * 2 - 2;
      const selEnd = selStart - prevDepth * 2 - 2;
      tr.setSelection(TextSelection.create(tr.doc, selStart, selEnd));
      // delete the empty node
      tr = tr.deleteSelection();
      tr.setSelection(TextSelection.create(tr.doc, tr.mapping.map(pos - depth * 2)));
      // complete the transaction
      return tr;
    }
    if (atEnd && depth > 1 && $from.depth - depth > 2) {
      const defaultType = $from.node(-depth + 1).type;
      return deleteEmptyLine(tr, depth - 1)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .split(tr.mapping.map($from.pos), depth, [{ type: defaultType }] as any);
    }
    if (tr.selection instanceof TextSelection) tr.deleteSelection();
    // Object containing the information about parent (and name of grand-parent)
    // `parent` is returning the parent level (in this case `-depth` = -1)
    const parent = $to.node(-depth || undefined);
    // "$from": https://prosemirror.net/docs/ref/#state.Selection.$from
    // `parent.type`: It's giving us the current NodeType, where the cursor has been set to split the lines
    // @see {@link https://prosemirror.net/docs/ref/#model.NodeType}
    const defaultType = $from.depth == 0 ? null : defaultBlockAt($from, depth, parent.type);
    if (defaultType) {
      let types = atEnd ? [{ type: defaultType }] : null;
      // "can": Check whether splitting at the given position is allowed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let can = canSplit(tr.doc, tr.mapping.map($from.pos), depth, types as any);

      if (!types && !can && canSplit(tr.doc, tr.mapping.map($from.pos), depth, [{ type: defaultType }])) {
        types = [{ type: defaultType }];
        can = true;
      }
      // if we can split, then split the node
      if (can) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tr.split(tr.mapping.map($from.pos), depth, types as any);
        if (!atEnd && !$from.parentOffset && $from.parent.type != defaultType && $from.node(-depth).canReplace($from.index(-depth), $from.indexAfter(-depth), Fragment.from([(defaultType as NodeType).create(), $from.parent]))) {
          // update the previous node markups
          tr.setNodeMarkup(tr.mapping.map($from.before()), defaultType);
        }
      }
      // complete the transaction and scroll into view
      return tr.scrollIntoView();
    }
  }
  // return false if the transaction is not triggered.
  return false;
}

/**
 * Check if the cursor is at the end of the line.
 *
 * @param tr - The Transaction object
 * @param depth - distance from the current cursor position to the closest parent Node with children
 * @returns Boolean - true if the cursor is at the end of the line
 */
export function isEOL(tr: Transaction, depth = 0) {
  const { $to } = tr.selection;
  let parent = $to.parent;
  if ($to.parentOffset < parent.content.size) {
    return false;
  }
  for (let i = 1; i <= depth; i++) {
    const grandParent = $to.node(-i);
    if (grandParent.childCount !== 1 + $to.index(-i)) {
      return false;
    }
    parent = grandParent;
  }
  return true;
}

/**
 * Checks whether the cursor is at an empty line or not.
 *
 * @param tr - The Transaction object
 * @param depth - distance from the current cursor position to the closest parent Node with children
 * @returns Boolean, e.g. true, if the the parent node has no content
 */
export function isEmpty(tr: Transaction, depth = 0) {
  const { $to } = tr.selection;
  let parent = $to.parent;
  if (parent.content.size) {
    return false;
  }
  for (let i = 1; i <= depth; i++) {
    const grandParent = $to.node(-i);
    if (parent.childCount > 1) {
      return false;
    }
    parent = grandParent;
  }
  return true;
}

/**
 * Checks if the previous node is empty or not when the cursor is at the beginning of the line.
 *
 * @param tr - The Transaction object
 * @param depth - distance from the current cursor position to the closest parent Node with children
 * @returns Boolean
 */
export function isPrevEmpty(tr: Transaction, depth = 0) {
  const pos = tr.doc.resolve(tr.selection.to - 2);
  let parent = pos.parent;
  if (parent.content.size) {
    return false;
  }
  for (let i = 1; i <= depth; i++) {
    const grandParent = pos.node(-i);
    if (parent.childCount > 1) {
      return false;
    }
    parent = grandParent;
  }
  return true;
}

/**
 * Get the distance from the current cursor position to the closest parent Node with children.
 *
 * @param tr - The Transaction object
 * @param empty - A Boolean, set to `false`
 * @returns A number containing the depth of the tested
 */
export function getDepth(tr: Transaction, empty = false) {
  let depth = 0;

  while ((empty ? isEmpty : isEOL)(tr, depth + 1)) {
    depth++;
  }

  return depth;
}

/**
 * Get the previous node distance from the first parent with children.
 *
 * @param tr - The Transaction object
 * @returns number - the depth of the previous node
 */
export function getPrevDepth(tr: Transaction) {
  let depth = 0;
  while (isPrevEmpty(tr, depth + 1)) {
    depth++;

  }

  return depth;
}

/**
 * Get the tree of nodes starting from the current cursor position, and going up to first parent node with children.
 *
 * @param pos - The ResolvedPos object containing position, path, depth and parentOffset
 * @param depth - distance from the current cursor position to the closest parent Node with children
 * @returns NodeType array
 */
export function getTree(pos: ResolvedPos, depth = 0) {
  const result: NodeType[] = [pos.parent.type];
  for (let i = 1; i <= depth; i++) {
    result.push(pos.node(-i).type);
  }
  return result;
}

/**
 * Handle pressing the `enter` key in the editor.
 * This contains an editor state, an optional `dispatch`
 * function that it can use to dispatch a transaction and
 * an `EditorView` instance. It returns a boolean that indicates
 * whether it could perform any action.
 * When no `dispatch` callback is
 * passed, the newLine command should do a 'dry run', determining whether it is
 * applicable, but not actually doing anything.
 *
 * @param state - The EditorState object
 * @param dispatch - A function to be used to dispatch a transaction
 * @returns Boolean
 */
export function enterPressed(state: EditorState, dispatch?: (tr: Transaction) => void) {
  let { $from } = state.selection;
  const { empty } = state.selection;
  // check if the node is empty.
  // if the node is empty, then the depth is 1
  const depth = getDepth(state.tr, true);

  // get the current transaction
  let tr = state.tr;
  // if the cursor selection is not empty, delete the selection
  if (dispatch && !empty) {
    tr = tr.deleteSelection();
    $from = tr.selection.$from;
  }

  // prepare the transaction
  const resultTr: false | Transaction = isEOL(state.tr, depth)       // when the cursor is at the end of the line
    ? $from.parentOffset === 0            // when the cursor is at the beginning of parent node
      ? enterEmpty(tr, !!dispatch, depth) // then enterEmpty is triggered
      : enterEOL(tr, !!dispatch, depth)   // when the cursor is not at the beginning of parent node, the cursor can be at the end text node, then enterEOL is triggered
    : enterSplit(tr, !!dispatch, depth);  // when the cursor is not at the end of the line, then enterSplit is triggered

  // if the transaction is triggered, then dispatch the transaction
  if (dispatch && resultTr !== false) {
    dispatch(resultTr);
    return true;
  }
  // return false if the transaction is not triggered
  return false;
}

/**
 * A chain of commands that are triggered on each "press Enter" key event in the editor.
 * in this instance it's only representing the `enterPressed` command.
 */
export const newLine = chainCommands(enterPressed);

/**
 * Checks the state of any mark against the
 * list of all marks in the editor menu
 * This function will be triggered on any key event in the editor to run the check.
 * Returns a boolean, if there is a mark of this type in the given set, or
 * if a given mark or mark type occurs in the selected text1.
 *
 * @param state - The EditorState object
 * @param mark - The MarkType object
 * @returns Boolean
 */
export function hasMark(state: EditorState, mark: MarkType): boolean {
  return state.selection.empty
    ? !!mark.isInSet(state.storedMarks || state.selection.$from.marks())
    : state.doc.rangeHasMark(state.selection.from, state.selection.to, mark);
}

//Escape hatch for Unit Testing due to a lack of “package-private” accessibility scope in TypeScript
export const _test_private_commands = {
  canCreateIndex,
  canCreate,
  defaultBlocks,
}