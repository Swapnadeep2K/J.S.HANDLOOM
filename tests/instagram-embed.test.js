const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class FakeRoot {
  constructor() {
    this.frames = [];
  }

  querySelectorAll(selector) {
    return selector === "iframe" ? this.frames : [];
  }
}

test("titles generated Instagram iframes without replacing the embed or overriding an existing title", () => {
  const root = new FakeRoot();
  const observers = [];
  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }

    observe(target, options) {
      this.target = target;
      this.options = options;
    }
  }
  const source = fs.readFileSync(path.join(__dirname, "..", "scripts", "instagram-embed.js"), "utf8");
  vm.runInNewContext(source, {
    document: { querySelector: (selector) => selector === ".insta-iframe" ? root : null },
    MutationObserver: FakeMutationObserver,
  });

  const generatedFrame = {
    nodeType: 1,
    attributes: {},
    getAttribute(name) { return this.attributes[name] || null; },
    setAttribute(name, value) { this.attributes[name] = value; },
    matches(selector) { return selector === "iframe"; },
    parentElement: root,
  };
  root.frames.push(generatedFrame);
  observers[0].callback([{ addedNodes: [generatedFrame] }]);
  assert.equal(generatedFrame.attributes.title, "Instagram post from J.S.HANDLOOM");
  assert.equal(observers[0].target, root);
  assert.equal(observers[0].options.subtree, true);

  const titledFrame = {
    ...generatedFrame,
    attributes: { title: "Existing embed title" },
  };
  root.frames.push(titledFrame);
  observers[0].callback([{ addedNodes: [titledFrame] }]);
  assert.equal(titledFrame.attributes.title, "Existing embed title");

  const index = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(index, /View this J\.S\.HANDLOOM post on Instagram/);
  assert.doesNotMatch(index, /#c9c8cd/);
  assert.match(index, /<script src="scripts\/instagram-embed\.js"><\/script>/);
});
