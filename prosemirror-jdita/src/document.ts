import { JDita } from "jdita";
import { IS_MARK, defaultNodeName } from "./schema";

/**
 * Removes undefined attributes from an object
 *
 * @param object  - Generic object
 * @returns object - The object with undefined attributes removed
 */
export function deleteUndefined(object?: any) {
  if (object) {
    for (let key in object) {
      if (typeof object[key] === 'undefined') {
        delete(object[key]);
      }
    }
  }
  return object;
}

/**
 * A map of special nodes that need to be handled differently.
 * Instead of using the defaultTravel function, we use the special node function
 * The following 4 nodes (audio, video, image, text) are
 * treated in a customized way instead of applying the defaultTravel() function:
 */
export const NODES: Record<string, (value: JDita, parent: JDita) => any> = {
  audio: (value, parent) => {
    const attrs: any = deleteUndefined({ ...value.attributes });
    const content: JDita[] = [];
    if (value.children) {
      value.children.forEach(child => {
        if (child.nodeName === 'media-autoplay') {
          attrs.autoplay = 'autoplay';
          return;
        }
        if (child.nodeName === 'media-controls') {
          attrs.controls = 'controls';
          return;
        }
        if (child.nodeName === 'media-loop') {
          attrs.loop = 'loop';
          return;
        }
        if (child.nodeName === 'media-muted') {
          attrs.muted = 'muted';
          return;
        }
        if (['desc', 'media-track', 'media-source'].indexOf(child.nodeName) > -1) {
          content.push(child);
          return;
        }
      });
    }
    const result = { type: value.nodeName, attrs, content: content.map(child => travel(child, value)) };

    if (attrs && Object.keys(attrs).length) {
      result.attrs = attrs;
    }
    return result;
  },
  video: (value, parent) => {
    const attrs: any = deleteUndefined({ ...value.attributes });
    const content: JDita[] = [];
    if (value.children) {
      value.children.forEach(child => {
        if (child.nodeName === 'media-autoplay') {
          attrs.autoplay = 'autoplay';
          return;
        }
        if (child.nodeName === 'media-controls') {
          attrs.controls = 'controls';
          return;
        }
        if (child.nodeName === 'media-loop') {
          attrs.loop = 'loop';
          return;
        }
        if (child.nodeName === 'media-muted') {
          attrs.muted = 'muted';
          return;
        }
        if (child.nodeName === 'video-poster') {
          attrs.poster = child.attributes?.value;
          return;
        }
        if (['desc', 'media-track', 'media-source'].indexOf(child.nodeName) > -1) {
          content.push(child);
          return;
        }
      });
    }
    const result = { type: value.nodeName, attrs, content: content.map(child => travel(child, value)) };
    return result;
  },
  image: (value, parent) => {
    if (value.children
      && value.children[0].nodeName === 'alt'
      && value.children[0]?.children
      && value.children[0].children[0].nodeName == 'text'
      ) {
      const attrs = deleteUndefined({ ...value.attributes, alt: value.children[0].children[0].content });
      const result = { type: 'image', attrs };
      return result;
    }
    return defaultTravel(value, parent);
  },
  text: (value: JDita) => ({ type: 'text', text: value.content, attrs: {} }),
};

/**
 * Transforms the JDita document into a proper ProseMirror document
 *
 * @param value - The JDita node
 * @param parent - The parent JDita node
 * @returns The transformed JDita node
 */
export function defaultTravel(value: JDita, parent: JDita): any {
  // children will become content
  const content = value.children?.map(child => travel(child, value));
  // attributes will become attrs
  const attrs =  value.attributes || {};
  // remove undefined attributes
  deleteUndefined(attrs);
  // node name will become type
  const type = defaultNodeName(value.nodeName);
  let result: any;
  // IS_MARK is the array  `u, s, b, sup, sub`
  if (IS_MARK.indexOf(value.nodeName) > -1) {
    if (content?.length === 1) {
      result = content[0];
      result.marks = [{ type }]
    }
  } else {
    result = {
      type,
      attrs,
    };

    if (content) {
      result.content = content;
    }
  }
  return result;
}

/**
 * Traverses the JDita document and generates a ProseMirror document
 *
 * @param value - The JDita node
 * @param parent - The parent JDita node
 * @returns The transformed JDita node
 */
export function travel(value: JDita, parent: JDita): any {
  // if it's a special node, use the special node function,
  // otherwise use the default travel function
  const result = (NODES[value.nodeName] || defaultTravel)(value, parent);
  // if the node is not a document and has attributes, set the parent attribute
  if (value.nodeName !== 'doc' && result.attrs) {
    result.attrs.parent = parent.nodeName;
  }
  return result;
}

/**
 * Transforms the JDita document
 * into a Schema compliant JDita document
 *
 * @param jdita - the JDita document
 * @returns transformed JDita document
 */
export function document(jdita: JDita): Record<string, any> {
  /**
   * Example input:
  {
    "nodeName": "document",
    "children": [
      {
        "nodeName": "topic",
        "attributes": {
          "id": "intro-product"
        },
        "children": [
          {
            "nodeName": "title",
            "attributes": {},
            "children": [
              {
                "nodeName": "text",
                "content": "Overview"
              }
            ]
          }
        ]
      }
    ]
  }
  */

  /**
   * Example output of the transformation `travel(jdita, jdita)`:
  {
    "type": "doc",
    "attrs": {},
    "content": [
      {
        "type": "topic",
        "attrs": {
          "id": "intro-product",
          "parent": "doc"
        },
        "content": [
          {
            "type": "title",
            "attrs": {
              "parent": "topic"
            },
            "content": [
              {
                "type": "text",
                "text": "Overview",
                "attrs": {
                  "parent": "title"
                }
              }
            ]
          }
        ]
      }
    ]
  }
  */

  if (jdita.nodeName === 'document') {
    jdita.nodeName = 'doc';
    /*
    Parameter `jdita` is representing the root of JDita document.
    We pass in the root node as the first parameter, and since it's the root node,
    it's also the parent node, which is passed as the second parameter.
    This will return the output of the transformation.
    */
    return travel(jdita, jdita);
  }
  throw new Error('jdita must be a document');
}