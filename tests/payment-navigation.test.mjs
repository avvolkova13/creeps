import test from 'node:test';
import assert from 'node:assert/strict';
import {paymentDestination} from '../src/lib/payment-navigation.ts';
test('successful responses require a usable payment link, not a fabricated paid state',()=>{
 assert.equal(paymentDestination({paymentUrl:'https://payments.example/checkout/123'},'http://127.0.0.1:3100'),'https://payments.example/checkout/123');
 assert.equal(paymentDestination({paymentUrl:'/payments/123'},'http://127.0.0.1:3100'),'http://127.0.0.1:3100/payments/123');
 for(const paymentUrl of ['javascript:alert(1)','http://payments.example','//evil.example','https://user:pass@payments.example','garbage'])assert.throws(()=>paymentDestination({paymentUrl},'https://creeps.example'));
 assert.throws(()=>paymentDestination({ok:true},'https://creeps.example'));
});
