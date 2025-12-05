const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('module');
const ts = require('typescript');

class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toLowerCase();
    this.children = [];
    this.parent = null;
    this.id = '';
    this.style = {};
    this.textContent = '';
    this.onclick = undefined;
  }

  append(...nodes) {
    for (const node of nodes) {
      node.parent = this;
      this.children.push(node);
    }
  }

  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = null;
  }

  findById(id) {
    if (this.id === id) return this;
    for (const child of this.children) {
      const match = child.findById(id);
      if (match) return match;
    }
    return undefined;
  }

  click() {
    if (typeof this.onclick === 'function') {
      this.onclick({ target: this });
    }
  }
}

class MockDocument {
  constructor() {
    this.body = new MockElement('body');
  }

  createElement(tagName) {
    return new MockElement(tagName);
  }

  getElementById(id) {
    return this.body.findById(id);
  }
}

const loadModalClient = () => {
  const filePath = path.resolve(__dirname, '../src/modalClient.ts');
  const source = fs.readFileSync(filePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: filePath
  });

  const compiledModule = new Module(filePath, module);
  compiledModule.filename = filePath;
  compiledModule.paths = Module._nodeModulePaths(path.dirname(filePath));
  compiledModule._compile(outputText, filePath);
  return compiledModule.exports;
};

const setUpDocument = () => {
  const document = new MockDocument();
  globalThis.document = document;
  return document;
};

const tearDownDocument = () => {
  delete globalThis.document;
};

const collectByTag = (node, tagName) => {
  const matches = [];
  const walk = (current) => {
    if (current.tagName === tagName) matches.push(current);
    for (const child of current.children) {
      walk(child);
    }
  };
  walk(node);
  return matches;
};

test('opens signing modal with visible buttons', async () => {
  const document = setUpDocument();
  const { showSigningModal } = loadModalClient();

  const modalPromise = showSigningModal('hashed-value');

  const overlay = document.getElementById('para-signing-modal');
  assert.ok(overlay, 'modal overlay should be appended to the document');
  assert.strictEqual(overlay.parent, document.body);

  const buttons = collectByTag(overlay, 'button');
  assert.deepEqual(
    buttons.map((button) => button.textContent),
    ['No', 'Yes']
  );

  buttons[0].click();
  await modalPromise;
  tearDownDocument();
});

test('clicking Yes resolves the modal promise with true', async () => {
  const document = setUpDocument();
  const { showSigningModal } = loadModalClient();

  const modalPromise = showSigningModal('another-hash');

  const overlay = document.getElementById('para-signing-modal');
  const yesButton = collectByTag(overlay, 'button').find(
    (button) => button.textContent === 'Yes'
  );
  assert.ok(yesButton, 'Yes button should be rendered');

  yesButton.click();

  const result = await modalPromise;
  assert.strictEqual(result, true);
  assert.strictEqual(document.getElementById('para-signing-modal'), undefined);
  tearDownDocument();
});

test('clicking No resolves the modal promise with false', async () => {
  const document = setUpDocument();
  const { showSigningModal } = loadModalClient();

  const modalPromise = showSigningModal('yet-another-hash');

  const overlay = document.getElementById('para-signing-modal');
  const noButton = collectByTag(overlay, 'button').find(
    (button) => button.textContent === 'No'
  );
  assert.ok(noButton, 'No button should be rendered');

  noButton.click();

  const result = await modalPromise;
  assert.strictEqual(result, false);
  assert.strictEqual(document.getElementById('para-signing-modal'), undefined);
  tearDownDocument();
});
