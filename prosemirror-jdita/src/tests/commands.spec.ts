/**
 * Unit tests for command.ts
 */

import { expect } from "chai";
import { schema } from "../schema";
import { canCreate, canCreateIndex, createNode, createNodesTree } from '../commands';

const schemaObject = schema();

describe('Function createNode()', () => {
  it('creates a node', () => {
    const type = schemaObject.nodes.p;

    const node = createNode(type);
    expect(node.type.name).to.equal('p');
  });

  it('creates a node and fills it with content', () => {
    const type = schemaObject.nodes.ul;
    const node = createNode(type, {});
    let li = node.content.firstChild;
    let p = li?.content.firstChild;

    expect(li?.type.name).to.equal('li');
    expect(p?.type.name).to.equal('p');
  });

  it('throws an error on an unknown node type', () => {
    const type = schemaObject.nodes.unknown;
    expect(() => createNode(type)).to.throw();
  });

})

// Pass a NodeType tree
// and test against expected node name
describe('Function createNodesTree()', () => {
  it('creates a node tree', () => {
    const nodeTypes = [schemaObject.nodes.p, schemaObject.nodes.li, schemaObject.nodes.ul];

    const node = createNodesTree(nodeTypes);


    let li = node.content.firstChild;
    let p = li?.content.firstChild;

    expect(li?.type.name).to.equal('li');
    expect(p?.type.name).to.equal('p');

  });
});

// Pass a NodeType
// and test against expected node index number
describe('Function canCreateIndex()', () => {
  it('returns the correct index for allowed node types', () => {
    const knownTypes = [schemaObject.nodes.data, schemaObject.nodes.ul, schemaObject.nodes.li, schemaObject.nodes.p, schemaObject.nodes.section, schemaObject.nodes.stentry, schemaObject.nodes.strow, schemaObject.nodes.simpletable]
    knownTypes.forEach((type) => {
      const index = canCreateIndex(type);
      expect(index).to.equal(knownTypes.indexOf(type));
    });
  });

  it('returns index "-1" for denied node types', () => {
    const index = canCreateIndex(schemaObject.nodes.xref);
    expect(index).to.equal(-1);
  });
});

// Pass a NodeType and test against expected Boolean
describe('Function canCreate()', () => {
  it('returns "true" for allowed types', () => {
    const knownTypes = [schemaObject.nodes.data, schemaObject.nodes.ul, schemaObject.nodes.li, schemaObject.nodes.p, schemaObject.nodes.section, schemaObject.nodes.stentry, schemaObject.nodes.strow, schemaObject.nodes.simpletable]
    knownTypes.forEach((type) => {
      const result = canCreate(type);
      expect(result).to.be.true;
    });
  });

  it('returns "false" for denied node types', () => {
    const result = canCreate(schemaObject.nodes.xref);
    expect(result).to.be.false;
  });
});
