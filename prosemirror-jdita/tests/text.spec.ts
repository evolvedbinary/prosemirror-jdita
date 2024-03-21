import ChaiPromised from 'chai-as-promised';
import { use } from 'chai';
import { expect, assert } from 'chai';
import { xditaToJson } from 'jdita';
import { document } from '../src/document';

use(ChaiPromised);

const pmjson = {
  type: 'doc',
  attrs: {},
  'content': [{
    type: 'topic',
    attrs: {
      parent: 'doc',
    },
    content: [{
      type: 'title',
      attrs: {
        parent: 'topic',
      },
      content: [{
        type: 'text',
        text: 'Sample Text',
        attrs: {
          parent: 'title',
        },
      }]
    }]
  }]
};
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE topic PUBLIC "-//OASIS//DTD LIGHTWEIGHT DITA Topic//EN" "lw-topic.dtd">
<topic>
  <title>Sample Text</title>
</topic>
`

describe('Nodes', () => {
  it('Text Node', async () => {
    await expect(
      xditaToJson(xml)
        .then(jdita => document(jdita))
        .catch(e => console.log('error:', e))
    ).to.eventually.become(pmjson);
  });
});
