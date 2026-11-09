import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { detectSurface } from '../lib/surface.js';
import { isDesktopExecutable, resolveDesktopAiBase } from '../lib/desktop.js';
import { ALL_PATCHES } from '../lib/core.js';

test('DSH NEXT is desktop without environment overrides', () => {
  assert.equal(detectSurface({ execPath: 'C:/Programs/DSH NEXT/DSH NEXT.exe', env: {}, resourcesPath: '', argv: [] }), 'desktop');
  assert.equal(isDesktopExecutable('C:/Programs/DSH NEXT/DSH NEXT.exe'), true);
  assert.equal(detectSurface({execPath:'/usr/bin/node',env:{},resourcesPath:'',argv:[]}), 'web');
});

test('patch 40 preserves tools, required contexts and prompt sections', async () => {
  const replacement = ALL_PATCHES.find(p => p.id === 40).replacements[0];
  assert.equal(typeof replacement.pattern, 'string');
  const original = replacement.pattern;
  assert.ok(original.includes('requiredContexts'));
  const body = original.replace(original, replacement.replace);
  const run = vm.runInNewContext(`(async function(contextByName, runtimeContextSuppressed, completeSection, assembly, context, scope, tools, scopeTarget) { ${body} })`);
  const sections = [{name:'dsh-purge:test',text:'injected'}, {name:'agent-instructions',text:'instructions'}];
  const contexts = [{name:'required'},{name:'optional'}];
  const toolList = [{name:'test-tool'}];
  const receiver = {ctx:{waterfall:async()=>({sections,contexts})}};
  for (const suppressed of [false,true]) {
    for (const complete of [undefined,{name:'complete',text:'complete'}]) {
      const result = await run.call(receiver,new Map([['required',{name:'required',required:true}]]),suppressed,complete,{}, {}, {},toolList,()=>({}));
      assert.equal(result.tools,toolList);
      assert.ok(result.sections.some(s=>s.name==='dsh-purge:test'));
      assert.ok(result.sections.some(s=>s.name==='agent-instructions'));
      assert.equal(result.contexts.length,suppressed?1:2);
    }
  }
});
