import { assert } from 'chai';
import { travel } from '../src/schema';
import { TextNode, BaseNode } from 'jdita';

describe('Schema', () => {
  it('Text node', () => {
    assert.deepEqual(travel(TextNode as unknown as typeof BaseNode, console.log), { attrs: { parent: { default: '' } }} as any);
  });
});
