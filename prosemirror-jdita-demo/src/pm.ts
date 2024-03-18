import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, DOMParser } from "prosemirror-model";
// import { schema } from "../package/src/schema";
import jsonDocLoader from "./doc";

/**
 * TODO: Documentation
 */
const starSchema = new Schema({
  nodes: {
    text: {
      group: "inline",
    },
    star: {
      inline: true,
      group: "inline",
      toDOM() { return ["star", "🟊"] },
      parseDOM: [{tag: "star"}]
    },
    paragraph: {
      group: "block",
      content: "inline*",
      toDOM() { return ["p", 0] },
      parseDOM: [{tag: "p"}]
    },
    boring_paragraph: {
      group: "block",
      content: "text*",
      marks: "",
      toDOM() { return ["p", {class: "boring"}, 0] },
      parseDOM: [{tag: "p.boring", priority: 60}]
    },
    doc: {
      content: "block+"
    }
  },
  marks: {
    shouting: {
      toDOM() { return ["shouting", 0] },
      parseDOM: [{tag: "shouting"}]
    },
    link: {
      attrs: {href: {}},
      toDOM(node: any) { return ["a", {href: node.attrs.href}, 0] },
      parseDOM: [{tag: "a", getAttrs(dom: any) { return {href: dom.href} }}],
      inclusive: false
    }
  }
})

/**
 * TODO: Documentation
 */
const editor = document.querySelector("#editor") as HTMLElement;

/**
 * TODO: Documentation
 */
const doc = DOMParser.fromSchema(starSchema).parse(editor);

/**
 * TODO: Documentation
 */
editor.innerHTML = '';

/**
 * TODO: Documentation
 */
jsonDocLoader.then(jsonDoc => {
  const domEl = document.querySelector("#editor");
  if (domEl) {
    // const doc = Node.fromJSON(s, jsonDoc);
    const state = EditorState.create({
      // doc,
      doc,
      // plugins
    })
    console.log(doc);
    console.log(state);
    new EditorView(domEl, {
      state,
    });
  }
});