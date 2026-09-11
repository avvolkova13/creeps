import test from 'node:test';
import assert from 'node:assert/strict';
import {createTaskQueue} from '../src/lib/async-queue.ts';
test('later cart updates cannot overtake an earlier response',async()=>{
 const queue=createTaskQueue(),events=[];let release;
 const wait=new Promise(resolve=>release=resolve);
 const first=queue.run(async()=>{events.push('start1');await wait;events.push('apply1');});
 const second=queue.run(async()=>{events.push('start2');events.push('apply2');});
 await Promise.resolve();assert.deepEqual(events,['start1']);release();await Promise.all([first,second]);
 assert.deepEqual(events,['start1','apply1','start2','apply2']);
});
test('a failed cart request does not prevent subsequent refresh or logout',async()=>{
 const queue=createTaskQueue();const failed=queue.run(async()=>{throw new Error('offline');});
 const next=queue.run(async()=>42);await assert.rejects(failed,/offline/);assert.equal(await next,42);
});
