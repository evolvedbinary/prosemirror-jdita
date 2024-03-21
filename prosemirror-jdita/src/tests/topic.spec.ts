import ChaiPromised from 'chai-as-promised';
import { use } from 'chai';
import { expect } from 'chai';
import { xditaToJson } from 'jdita';
import { document } from '../document';
import { topic } from './test-utils';

use(ChaiPromised);

const attrs = {
  id: 'topic-id',
  'xmlns:ditaarch': 'http://dita.oasis-open.org/architecture/2005/',
  'ditaarch:DITAArchVersion': '1.3',
  domains: '(topic xdita-c)',
  outputclass: 'topic-outputclass',
  dir: 'topic-dir',
  'xml:lang': 'topic-lang',
  translate: 'topic-translate',
  class: '- topic/topic ',
  parent: 'doc',
};
const pmjson = {
  type: 'doc',
  attrs: {},
  content: [{
    type: 'topic',
    attrs,
  }]
};

describe('document()', () => {
  it('transforms the JDita "topic" node into a Prosemirror node', async () => {
    await expect(
      xditaToJson(topic(attrs))
        .then(jdita => document(jdita))
        .catch(e => console.log('error:', e))
    ).to.eventually.become(pmjson);
  });
});
