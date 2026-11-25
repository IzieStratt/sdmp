import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyFrontend, finishFrontend, scanFrontend } from '../src/frontend.mjs';

const js = 'Ab12(e,t,n){"use strict";function Foo(){}Foo.displayName="FooModal";let a=(0,x.Ay)("Send logs");a.meta={name:"sendLogs",key:"createThunkSendLogs",description:"Send call logs \\"now\\""};let b=(0,x.Ay)();b.meta={name:"canDo",key:"createSelectorCanDo"};let c=1;c.meta={name:"odd",key:"somethingElse"};n.d(t,{},{})},Cd34(e,t,n){"use strict";var z=1;z.displayName="FooModal";z.displayName="ab"}';

test('frontend: components and redux entries are found per module, kinds come from the key', () => {
  const r = finishFrontend(scanFrontend(js));
  assert.deepEqual(r.componentNames, ['FooModal']);
  assert.equal(r.components.FooModal.length, 2); // defined in two modules
  assert.match(r.components.FooModal[0], /^(Ab12|Cd34):[0-9a-f]{8}$/);
  assert.deepEqual(r.reduxNames, ['selector:canDo', 'thunk:sendLogs']);
  assert.equal(r.redux['thunk:sendLogs'].description, 'Send call logs "now"');
  assert.equal(r.redux['selector:canDo'].description, undefined);
});

test('frontend: merging chunks keeps one entry per name', () => {
  const into = emptyFrontend();
  scanFrontend(js, into); scanFrontend(js, into);
  assert.equal(finishFrontend(into).componentNames.length, 1);
});

test('frontend: bare .meta={name} entries take their kind from the previous redux.json, new names are "unknown"', () => {
  const bare = 'Ab12(e,t,n){"use strict";a.meta={name:"sendLogs"};b.meta={name:"brandNew"};c.meta={name:"canDo",key:"createSelectorCanDo"};}';
  const previous = { 'thunk:sendLogs': { key: 'createThunkSendLogs', description: 'Send logs', modules: ['x:00000000'] } };
  const r = finishFrontend(scanFrontend(bare), previous);
  assert.deepEqual(r.reduxNames, ['selector:canDo', 'thunk:sendLogs', 'unknown:brandNew']);
  assert.equal(r.redux['thunk:sendLogs'].key, 'createThunkSendLogs');
  assert.equal(r.redux['thunk:sendLogs'].description, 'Send logs');
  assert.match(r.redux['thunk:sendLogs'].modules[0], /^Ab12:/);
  assert.equal('key' in r.redux['unknown:brandNew'], false);
});

test('frontend: a component declared as X.displayName="X" is found next to a thunk without a key', () => {
  const r = finishFrontend(scanFrontend('Ab12(e,t,n){"use strict";let BroadcastPreamble=()=>1;BroadcastPreamble.displayName="BroadcastPreamble";a.meta={name:"x1"}}'));
  assert.deepEqual(r.componentNames, ['BroadcastPreamble']);
});
