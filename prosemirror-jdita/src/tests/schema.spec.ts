import { assert, expect } from 'chai';
import { defaultNodeAttrs, defaultNodeName, defaultToDom, getChildren, getDomAttr, schema, schemaTravel } from '../schema';
import { TextNode, BaseNode, TopicNode, DdNode } from 'jdita';
import { DOMOutputSpec, Schema } from 'prosemirror-model';
import { createNode } from '../commands';

/**
 * Unit tests for `schema.ts`
 */

describe('Function schemaTravel()', () => {
  it('returns correct attributes for a TextNode', () => {
    assert.deepEqual(schemaTravel(TextNode as unknown as typeof BaseNode, console.log), { attrs: { parent: { default: '' } }} as any);
  });
});

describe('Function getChildren()', () => {
  it('makes sure that the node type gets the correct children according to the schema', () => {
    const type = TopicNode.childTypes;
    const children = getChildren(type);
    assert.deepEqual(children, ["title","shortdesc","prolog","body"]);
  });

  it('makes sure that the node type gets the correct group node children according to the schema', () => {
    // DD node children are %list-blocks
    const type = DdNode.childTypes;
    const children = getChildren(type);
    // %list-blocks are p  ul  ol  dl  pre  audio  video  simpletable  fig  note  data
    assert.deepEqual(children, ['p', 'ul', 'ol', 'dl', 'pre', 'audio', 'video', 'simpletable', 'fig', 'note', 'data']);
  });
});

describe('Function defaultToDom()', () => {
  it('returns a function that generates the dom spec for a node', () => {
    const attrs = {};
    const toDom = defaultToDom(BaseNode, attrs);

    const type = schema().nodes.li;
    const node = createNode(type, {});
    const result = toDom(node as any);
    const expected = [
      'jdita-node-node',
      {
        'data-j-type': 'node',
      },
      0,
    ];
    assert.deepEqual(result, expected as unknown as DOMOutputSpec);
  });
});

describe('Function getDomAttr()', () => {
  it('returns the dom attribute "Id" for nodeName "topic"', () => {
    const nodeName = 'topic';
    const attrs = "id";
    const domAttrs = getDomAttr(nodeName, attrs);
    assert.equal(domAttrs, "data-j-id");
  });
});

describe('Function defaultNodeAttrs()', () => {
  it('creates default node attributes', () => {
    const attrs = ['attr1', 'attr2', 'attr3'];
    const result = defaultNodeAttrs(attrs);
    const expected = {
      attr1: { default: '' },
      attr2: { default: '' },
      attr3: { default: '' },
    };
    assert.deepEqual(result, expected);
  });
});

describe('Function defaultNodeName()', () => {
  it('preserves the nodeName "topic" without any tranformation as it is', () => {
    const nodeName = 'topic';
    const result = defaultNodeName(nodeName);
    const expected = 'topic';
    assert.equal(result, expected);
  });

  it('replaces hyphens occurring in a nodeName into an underscore', () => {
    const nodeName = 'media-autoplay';
    const result = defaultNodeName(nodeName);
    const expected = 'media_autoplay';
    assert.equal(result, expected);
  });
});

describe('Function schema()', () => {
  let result: Schema;
  before(() => {
    result = schema();
  });

  it('is the correct instance of class "Schema"', () => {
    assert.instanceOf(result, Schema);
  });

  it('contains the "marks" property', () => {
    expect(result).to.have.property('marks');
  });


  it('contains "nodes" property', () => {
    expect(result).to.have.property('nodes');
  });

  it('contains all JDita nodes', () => {
    const nodes = result.spec.nodes as any; //orderedMap does not have content property so we had to cast it to any
    // nodeNames are strings in the content array
    const nodeNames = nodes.content.filter((node: any) => typeof node === 'string')
    const expectedNodes = [
      'text',         'image',       'data',
      'xref',         'ph',          'title',
      'shortdesc',    'prolog',      'p',
      'ol',           'dt',          'pre',
      'media_source', 'media_track', 'desc',
      'audio',        'video',       'fn',
      'note',         'stentry',     'sthead',
      'strow',        'simpletable', 'fig',
      'dd',           'dlentry',     'dl',
      'li',           'ul',          'section',
      'body',         'topic',       'doc'
    ];
    expect(nodeNames).to.have.members(expectedNodes);
  });

  it('returns node specs with schema-compliant children', () => {
    const nodes = result.spec.nodes as any;
    const nodesObject = {} as any;
    for(let i=0; i<nodes.content.length; i+=2) {
      nodesObject[nodes.content[i]] = nodes.content[i+1];
    }

    // topic node
    expect(nodesObject['topic'].content).to.equal('title shortdesc? prolog? body?');

    // dd node
    expect(nodesObject['dd'].content).to.equal('list_blocks*');

    // title node
    expect(nodesObject['title'].content).to.equal('common_inline*');
  });

  it('returns a node spec with a schema-compliant inline property', () => {
    const nodes = result.spec.nodes as any;
    const nodesObject = {} as any;
    for(let i=0; i<nodes.content.length; i+=2) {
      nodesObject[nodes.content[i]] = nodes.content[i+1];
    }

    // topic node
    expect(nodesObject['topic'].inline).to.equal(true);

    // dd node
    expect(nodesObject['dd'].inline).to.equal(true);

    // title node
    expect(nodesObject['title'].inline).to.equal(true);

    // text node
    expect(nodesObject['text'].inline).to.equal(true);
  });

  it('returns a node spec with a schema-compliant node attribute', () => {
    const nodes = result.spec.nodes as any;
    const nodesObject = {} as any;
    for(let i=0; i<nodes.content.length; i+=2) {
      nodesObject[nodes.content[i]] = nodes.content[i+1];
    }

    // topic node
    expect(nodesObject['topic'].attrs).to.have.keys(
      'id',
      'domains',
      'outputclass',
      'translate',
      'dir',
      'parent',
      'class',
      'xml:lang',
      'xmlns:ditaarch',
      'ditaarch:DITAArchVersion'
    );

    // body node
    expect(nodesObject['body'].attrs).to.have.keys(
      'parent',
      'dir',
      'xml:lang',
      'translate',
      'outputclass',
      'class'
    );

    // title node
    expect(nodesObject['title'].attrs).to.have.keys(
      'parent',
      'dir',
      'xml:lang',
      'translate',
      'outputclass',
      'class'
    );
  });

  it('contains all expected marks', () => {
    const marks = result.spec.marks as any;
    const specMarks = marks.content.filter((node: any) => typeof node === 'string')
    const expectedMarks = [ 'sup', 'sub', 'u', 'i', 'b' ];
    expect(specMarks).to.have.members(expectedMarks);
  });

});