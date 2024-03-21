import { BaseNode, getNodeClassType, UnknownNodeError, DocumentNode, nodeGroups, customChildTypesToString } from 'jdita';
import { getDomNode } from './dom';
import { ChildTypes } from 'jdita';
import { NodeSpec, Schema, SchemaSpec, Node, MarkSpec, DOMOutputSpec } from 'prosemirror-model';

/**
 * Set the root node `document` to string "doc"
 *
 * @remarks
 * Will be used in `defaultNodeName()`.
 */
export const NODE_NAMES: Record<string, string> = {
  document: 'doc',
}

/**
 * Provide a map of special nodes to their corresponding DOM node
 */
export const TO_DOM: Record<string, (node: typeof BaseNode, attrs: any)
  => (node: Node) => DOMOutputSpec> = {}

/**
 * Some nodes have special attributes.
 * This is a list of those nodes and their special attributes
 */
export const NODE_ATTRS: Record<string, (attrs: string[]) => any> = {
  video: node => defaultNodeAttrs([...node, 'controls', 'autoplay', 'loop', 'muted', 'poster']),
  audio: node => defaultNodeAttrs([...node, 'controls', 'autoplay', 'loop', 'muted']),
}

/**
 * A map of attributes for special nodes
 */
export const NODE_ATTR_NAMES: Record<string, Record<string, string>> = {
  video: {
    _: '*',
    autoplay: '*',
    controls: '*',
  },
  'media-source': {
    value: 'src',
  },
  xref: {
    keyref: 'href',
  },
  image: {
    _: '*',
    href: 'src',
  },
}
/**
 * Provide a map of special nodes to their corresponding Schema
 */
export const SCHEMAS: Record<string, (node: typeof BaseNode, next: (nodeName: string) => void) => SchemaNode> = {
  'text': (node: typeof BaseNode, next: (nodeName: string) => void): SchemaNode => {
    const result: SchemaNode = {
      attrs: {
        parent: { default: '' }
      },
    };
    return result;
  },
}

/**
 * The LwDITA Schema. Describes parent-child relationships.
 */
export const SCHEMA_CONTENT: Record<string, [content: string, groups: string]> = {
  audio: ['desc? media_source* media_track*', 'simple_blocks fig_blocks list_blocks all_blocks'],
  body: ['list_blocks* section* fn*', ''],
  data: ['(text|data)*', 'common_inline all_inline fn_blocks simple_blocks fig_blocks list_blocks all_blocks'],
  dd: ['list_blocks*', ''],
  desc: ['common_inline*', ''],
  dl: ['dlentry+', 'fn_blocks simple_blocks fig_blocks list_blocks all_blocks'],
  dlentry: ['dt dd', ''],
  dt: ['all_inline*', ''],
  document: ['topic', ''],
  fig: ['title? desc? (fig_blocks|image|xref)*', 'list_blocks all_blocks'],
  fn: ['fn_blocks*', 'simple_blocks all_blocks'],
  image: ['', 'common_inline all_inline'],
  'media-source': ['', ''],
  'media-track': ['', ''],
  li: ['list_blocks*', ''],
  note: ['simple_blocks*', 'simple_blocks list_blocks all_blocks'],
  ol: ['li+', 'fn_blocks simple_blocks fig_blocks list_blocks all_blocks'],
  p: ['all_inline*', 'fn_blocks simple_blocks fig_blocks list_blocks all_blocks'],
  ph: ['all_inline*', 'common_inline all_inline'],
  pre: ['(text|ph|xref|data)*', 'simple_blocks fig_blocks list_blocks all_blocks'],
  prolog: ['data*', ''],
  section: ['title? all_blocks*', ''],
  simpletable: ['sthead? strow+', 'fig_blocks list_blocks all_blocks'],
  shortdesc: ['all_inline*', ''],
  stentry: ['simple_blocks*', ''],
  sthead: ['stentry+', ''],
  strow: ['(stentry*)', ''],
  title: ['common_inline*', ''],
  topic: ['title shortdesc? prolog? body?', ''],
  ul: ['li+', 'fn_blocks simple_blocks fig_blocks list_blocks all_blocks'],
  video: ['desc? media_source* media_track*', 'simple_blocks fig_blocks list_blocks all_blocks'],
  xref: ['common_inline*', 'all_inline'],
}

/**
 * A map of special children for certain media nodes
 */
export const SCHEMA_CHILDREN: Record<string, (type: ChildTypes) => string[]> = {
  video: type => ['media-source', 'media-track', 'desc'],
  audio: type => ['media-source', 'media-track', 'desc'],
}

/**
 * The inline markup elements bold, italic, underline, subscript, superscript
 */
export const IS_MARK = ['b', 'i', 'u', 'sub', 'sup'];

/**
 * A representation of a node in the schema
 */
export interface SchemaNode {
  inline?: boolean;
  content?: string;
  group?: string;
  domNodeName?: string;
  attrs?: Record<string, { default: string }>;
}

/**
 * `SchemaNodes` is a map of nodes in the schema
 */
export interface SchemaNodes {
  [key: string]: SchemaNode;
}

/**
 * Get node children
 *
 * @param type - Type of the Child nodes
 * @returns - The children of the node
 */
export function getChildren(type: ChildTypes): string[] {
  if (Array.isArray(type)) {
    return type.map(subType => getChildren(subType)).reduce((result, children) =>
    result.concat(children.filter(child => result.indexOf(child) < 0)), [] as string[]);
  }
  return (type.isGroup ? nodeGroups[type.name] : [ type.name ]);
}


/**
 * Travel the node and generate the node spec
 *
 * @param node - JDita node
 * @param next - Next travel function
 * @returns SchemaNode
 */
export function schemaTravel(node: typeof BaseNode, next: (nodeName: string) => void): SchemaNode {
  return (SCHEMAS[node.nodeName] || defaultTravel)(node, next);
}

/**
 * Returns a function that generates the dom spec for a node
 *
 * @see {@link https://prosemirror.net/docs/ref/#model.DOMOutputSpec} for more info
 *
 * @param node - JDita node
 * @param attrs - The attributes of the node
 * @returns A function that generates the DOM spec
 */
export function defaultToDom(node: typeof BaseNode, attrs: any): (node: Node) => DOMOutputSpec {
  return function(pmNode: Node) {
    return [getDomNode(node.nodeName, pmNode.attrs?.parent), attrs
      ? Object.keys(attrs).reduce((newAttrs, attr) => {
        if (pmNode.attrs[attr]) {
          const domAttr = getDomAttr(node.nodeName, attr);
          newAttrs[domAttr] = pmNode.attrs[attr];
        }
        return newAttrs;
      }, { 'data-j-type': node.nodeName } as any)
    : {}, 0];
  }
}

/**
 * Returns the dom attribute name
 *
 * @param nodeName - The name of the node
 * @param attr - The name of the attribute
 * @returns The DOM attribute
 */
export function getDomAttr(nodeName: string, attr: string): string {
  return NODE_ATTR_NAMES[nodeName]
    ? NODE_ATTR_NAMES[nodeName]._
      ? NODE_ATTR_NAMES[nodeName][attr]
        ? NODE_ATTR_NAMES[nodeName][attr] === '*' ? 'data-j-' + attr : NODE_ATTR_NAMES[nodeName][attr]
        : attr
      : NODE_ATTR_NAMES[nodeName][attr] ? NODE_ATTR_NAMES[nodeName][attr] : 'data-j-' + attr
    : 'data-j-' + attr;
}

/**
 * Create default node attributes
 *
 * @param attrs - The attributes of the node
 * @returns A map of the attributes with default values
 */
export function defaultNodeAttrs(attrs: string[]): any {
  return attrs.reduce((result, field) => {
    result[field] = { default: '' };
    return result;
  }, {} as Record<string, { default: string }>);
}

/**
 * Travel the node and generate the node spec
 *
 * @remarks
 * NodeSpec is a description of a node type, used when defining a schema.
 * @see {@link https://prosemirror.net/docs/ref/#model.NodeSpec} for more info
 *
 * @param nodeName - The name of the node
 * @param parent - The parent of the node
 * @param next - Next travel function
 * @returns NodeSpec
 */
function defaultTravel(
  node: typeof BaseNode,
  parent: typeof BaseNode,
  next: (nodeName: string, parent: typeof BaseNode) => void): NodeSpec {
  const children = (SCHEMA_CHILDREN[node.nodeName] || getChildren)(node.childTypes);
  const isNode = IS_MARK.indexOf(node.nodeName) < 0;
  const [content, group] = isNode ? SCHEMA_CONTENT[node.nodeName] : [undefined, undefined];
  const attrs = (NODE_ATTRS[node.nodeName] || defaultNodeAttrs)(['parent', ...node.fields]);
  // create the node spec
  const result: NodeSpec = {
    attrs,
    inline: !(typeof group === 'string' && (group.indexOf('block') > -1 || group === '')),
    group,
    parseDom: [{
      tag: '[data-j-type=' + node.nodeName + ']',
      getAttrs(dom: HTMLElement) {
        return attrs
          ? Object.keys(attrs).reduce((newAttrs, attr) => {
            const domAttr = getDomAttr(node.nodeName, attr);
            if (dom.hasAttribute(domAttr)) {
              newAttrs[attr] = dom.getAttribute(domAttr);
            }
            return newAttrs;
          }, {} as any)
          : {}
      },
    }],
    toDOM: (TO_DOM[node.nodeName] || defaultToDom)(node, attrs),
  };
  if (typeof content === 'string') {
    result.content = content;
  }
  result.inline = true;
  children.forEach(child => next(child, node));
  return result;
}

/**
 * Transforms the node `nodeName`
 * by replacing dashes with underscores
 *
 * @remarks
 * defaultNodeName will return all nodeNames retrieved by `schema()`
 * and document()
 *
 * @example
 * `media-track` will be transformed to `media_track`
 *
 * @param nodeName - The name of the node
 * @returns A string with the transformed node name
 */
export function defaultNodeName(nodeName: string): string {
  return NODE_NAMES[nodeName] || nodeName.replace(/-/g, '_');
}

/**
 * Creates a schema for the prosemirror editor
 * based on the jdita nodes
 *
 * @see {@link https://prosemirror.net/docs/ref/#model.SchemaSpec}.
 *
 * @returns The Schema Object, describing a schema, as passed to the Schema constructor
 */
export function schema(): Schema {
  const done: string[] = [];

  // the schema spec are the nodes and marks
  const spec: SchemaSpec = {
    // the node types in this schema
    nodes: {
      text: {
        group: 'common_inline all_inline',
        inline: true,
      },
    },
    // the mark types that exist in this schema
    marks: {},
  }

  // populate the schema spec using the jdita nodes
  function browse(node: string | typeof BaseNode, parent: typeof BaseNode): void {
    // get the node name
    const nodeName = typeof node === 'string' ? node : node.nodeName;

    // if we have already processed this node then there's no need to process it again
    if (done.indexOf(nodeName) > -1) {
      return;
    }
    // add the node to the list of done nodes
    done.push(nodeName);

    // do not process the alt or text nodes
    if (['alt', 'text'].indexOf(node as string) > -1) {
      return;
    }

    try {
      const nodeClass = typeof node === 'string' ? getNodeClassType(node) : node;
      // travel the node class and generate the node spec
      const result = defaultTravel(nodeClass, parent, browse);
      if (result) {
        // set the node spec based on the node type
        if (IS_MARK.indexOf(nodeName) > -1) {
          (spec.marks as Record<string, MarkSpec>)[defaultNodeName(nodeName)] = result as MarkSpec;
        } else {
          (spec.nodes as Record<string, NodeSpec>)[defaultNodeName(nodeName)] = result;
        }
      }
    } catch (e) {
      if (e instanceof UnknownNodeError) {
      } else {
        console.error(node);
        console.error(e);
      }
    }
  }

  // start the process of populating the schema spec using the jdita nodes from the document node
  browse(DocumentNode, DocumentNode);

  (spec.nodes as any).topic.content = 'title shortdesc? prolog? body?';
  (spec.nodes as any).doc.content = 'topic+';

  return new Schema(spec);
}