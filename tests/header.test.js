const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "../scripts/header.js"),
  "utf8"
);
const markup = fs.readFileSync(
  path.join(__dirname, "../partials/header.html"),
  "utf8"
);

class FakeElement {
  constructor(document, attributes = {}) {
    this.document = document;
    this.attributes = new Map(Object.entries(attributes));
    this.listeners = new Map();
    this.classes = new Set(
      (attributes.class || "").split(/\s+/).filter(Boolean)
    );
    this.classList = {
      add: name => this.classes.add(name),
      remove: name => this.classes.delete(name),
      toggle: (name, force) => {
        const shouldAdd = force === undefined ? !this.classes.has(name) : force;
        if (shouldAdd) this.classes.add(name);
        else this.classes.delete(name);
        return shouldAdd;
      },
      contains: name => this.classes.has(name),
    };
    this.children = [];
    this.href = attributes.href;
  }

  get inert() {
    return this.attributes.has("inert");
  }

  set inert(value) {
    if (value) this.attributes.set("inert", "");
    else this.attributes.delete("inert");
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  focus() {
    this.document.activeElement = this;
  }

  querySelectorAll() {
    return this.children;
  }

  contains(element) {
    return this === element || this.children.includes(element);
  }

  closest(selector) {
    return selector === "a[href]" && this.href ? this : null;
  }

  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) {
      listener({
        target: this,
        preventDefault() {
          this.defaultPrevented = true;
        },
        ...event,
      });
    }
  }
}

function createNavigation() {
  const desktopQuery = {
    matches: false,
    listeners: new Map(),
    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    },
    addListener(listener) {
      this.listeners.set("change", listener);
    },
    resize(matches) {
      this.matches = matches;
      this.listeners.get("change")?.({ matches });
    },
  };
  const document = {
    listeners: new Map(),
    activeElement: null,
    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    },
    getElementById(id) {
      return elements[id];
    },
  };
  const elements = {
    mobileMenuButton: new FakeElement(document, { "aria-expanded": "false" }),
    sidebar: new FakeElement(document, {
      class: "sidebar",
      "aria-hidden": "true",
      inert: "",
    }),
    overlay: new FakeElement(document, { class: "overlay" }),
    closeSidebarButton: new FakeElement(document, {}),
  };
  const logoLink = new FakeElement(document, { href: "index" });
  const contactLink = new FakeElement(document, { href: "#contact" });
  const socialLink = new FakeElement(document, { href: "https://social.example" });
  elements.sidebar.children = [
    logoLink,
    elements.closeSidebarButton,
    contactLink,
    socialLink,
  ];

  vm.runInNewContext(source, {
    document,
    window: { matchMedia: () => desktopQuery },
  });
  document.listeners.get("DOMContentLoaded")();
  return { document, elements, contactLink, desktopQuery };
}

function pressKey(document, key, shiftKey = false) {
  let defaultPrevented = false;
  document.listeners.get("keydown")({
    key,
    shiftKey,
    preventDefault() {
      defaultPrevented = true;
    },
  });
  return defaultPrevented;
}

test("the initially closed sidebar is hidden and removed from keyboard access", () => {
  assert.match(markup, /id="sidebar"[\s\S]*?aria-hidden="true"[\s\S]*?inert/);

  const { elements } = createNavigation();
  assert.equal(elements.sidebar.inert, true);
  assert.equal(elements.sidebar.getAttribute("aria-hidden"), "true");
  assert.equal(elements.sidebar.classList.contains("open"), false);
});

test("opening exposes the sidebar and moves focus into it", () => {
  const { document, elements } = createNavigation();

  elements.mobileMenuButton.dispatch("click");

  assert.equal(elements.sidebar.inert, false);
  assert.equal(elements.sidebar.hasAttribute("inert"), false);
  assert.equal(elements.sidebar.getAttribute("aria-hidden"), "false");
  assert.equal(elements.mobileMenuButton.getAttribute("aria-expanded"), "true");
  assert.equal(elements.sidebar.classList.contains("open"), true);
  assert.equal(document.activeElement, elements.closeSidebarButton);
});

test("Escape closes the menu and restores focus to its trigger", () => {
  const { document, elements } = createNavigation();
  elements.mobileMenuButton.dispatch("click");

  assert.equal(pressKey(document, "Escape"), true);
  assert.equal(elements.sidebar.inert, true);
  assert.equal(elements.sidebar.getAttribute("aria-hidden"), "true");
  assert.equal(elements.mobileMenuButton.getAttribute("aria-expanded"), "false");
  assert.equal(document.activeElement, elements.mobileMenuButton);
});

test("Tab and Shift+Tab wrap focus within the open navigation", () => {
  const { document, elements } = createNavigation();
  elements.mobileMenuButton.dispatch("click");

  elements.sidebar.children[3].focus();
  assert.equal(pressKey(document, "Tab"), true);
  assert.equal(document.activeElement, elements.sidebar.children[0]);
  assert.equal(pressKey(document, "Tab", true), true);
  assert.equal(document.activeElement, elements.sidebar.children[3]);
});

test("resizing to desktop closes the menu without focusing the hidden mobile trigger", () => {
  const { document, elements, desktopQuery } = createNavigation();
  elements.mobileMenuButton.dispatch("click");
  assert.equal(document.activeElement, elements.closeSidebarButton);

  desktopQuery.resize(true);

  assert.equal(elements.sidebar.inert, true);
  assert.equal(elements.sidebar.getAttribute("aria-hidden"), "true");
  assert.equal(elements.sidebar.classList.contains("open"), false);
  assert.equal(elements.overlay.classList.contains("active"), false);
  assert.equal(elements.mobileMenuButton.getAttribute("aria-expanded"), "false");
  assert.equal(document.activeElement, elements.closeSidebarButton);
  assert.equal(pressKey(document, "Escape"), false);
  assert.equal(pressKey(document, "Tab"), false);
});

test("backdrop and Contact Us activation close the menu without cancelling the link", () => {
  const backdropNavigation = createNavigation();
  backdropNavigation.elements.mobileMenuButton.dispatch("click");
  backdropNavigation.elements.overlay.dispatch("click");
  assert.equal(backdropNavigation.elements.sidebar.inert, true);
  assert.equal(
    backdropNavigation.document.activeElement,
    backdropNavigation.elements.mobileMenuButton
  );

  const contactNavigation = createNavigation();
  contactNavigation.elements.mobileMenuButton.dispatch("click");
  let defaultPrevented = false;
  contactNavigation.elements.sidebar.dispatch("click", {
    target: contactNavigation.contactLink,
    preventDefault() {
      defaultPrevented = true;
    },
  });

  assert.equal(contactNavigation.elements.sidebar.inert, true);
  assert.equal(contactNavigation.contactLink.href, "#contact");
  assert.equal(defaultPrevented, false);
  assert.equal(
    contactNavigation.document.activeElement,
    contactNavigation.elements.mobileMenuButton
  );
});
