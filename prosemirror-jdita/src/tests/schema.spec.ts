import { assert } from 'chai';
import { defaultNodeAttrs, defaultToDom, getChildren, getDomAttr, travel } from '../schema';
import { TextNode, BaseNode, TopicNode, DdNode, nodeGroups } from 'jdita';

/**
 * Unit test for `travel()`
 * on `TextNode`
 *
 * @privateRemarks
 * Do we need tests for other NodeTypes?
 */
describe('Schema', () => {
  it('Text node', () => {
    assert.deepEqual(travel(TextNode as unknown as typeof BaseNode, console.log), { attrs: { parent: { default: '' } }} as any);
  });
});

describe('getChildren', () => {
  it('Should return children for regular node', () => {
    const type = TopicNode.childTypes;
    const children = getChildren(type);
    assert.deepEqual(children, ["title","shortdesc","prolog","body"]);
  });

  it('Should return children for node with group children', () => {
    // DD node children are %list-blocks
    const type = DdNode.childTypes;
    const children = getChildren(type);
    // %list-blocks are p  ul  ol  dl  pre  audio  video  simpletable  fig  note  data
    assert.deepEqual(children, ['p', 'ul', 'ol', 'dl', 'pre', 'audio', 'video', 'simpletable', 'fig', 'note', 'data']);
  });
});

describe('defaultToDom', () => {
  it('should get dom node', () => {
    const toDom = defaultToDom(TopicNode, {});
    // TODO mock up a prosemirror node 
    // console.log(toDom());
    
  });
});

describe('getDomAttr', () => {
  it('Id dom attribute for topic', () => {
    const nodeName = 'topic';
    const attrs = "id";
    const domAttrs = getDomAttr(nodeName, attrs);
    assert.equal(domAttrs, "data-j-id");
  });
});

describe('defaultNodeAttrs', () => {
  it('should return default node attributes', () => {
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