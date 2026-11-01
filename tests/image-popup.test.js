const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class FakeElement {
  constructor(tagName = "div", document) {
    this.tagName = tagName.toUpperCase();
    this.document = document;
    this.attributes = {};
    this.children = [];
    this.listeners = {};
    this._className = "";
    this.tabIndex = this.tagName === "BUTTON" ? 0 : -1;
    this.style = {};
    this.classList = {
      add: (name) => this._setClass(name, true),
      remove: (name) => this._setClass(name, false),
      contains: (name) => this._className.split(/\s+/).includes(name),
      toggle: (name, force) => {
        const enabled = force === undefined ? !this.classList.contains(name) : force;
        this._setClass(name, enabled);
        return enabled;
      },
    };
  }

  set className(value) {
    this._className = value;
  }

  get className() {
    return this._className;
  }

  _setClass(name, enabled) {
    const names = new Set(this._className.split(/\s+/).filter(Boolean));
    if (enabled) names.add(name);
    else names.delete(name);
    this._className = [...names].join(" ");
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "tabindex") this.tabIndex = Number(value);
  }

  getAttribute(name) {
    return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null;
  }

  hasAttribute(name) {
    return Object.hasOwn(this.attributes, name);
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  addEventListener(name, callback) {
    (this.listeners[name] ||= []).push(callback);
  }

  dispatch(name, event = {}) {
    for (const callback of this.listeners[name] || []) {
      callback({ target: this, preventDefault() {}, ...event });
    }
  }

  focus() {
    this.document.activeElement = this;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const descendants = this.children.flatMap((child) => [child, ...child.querySelectorAll("*")]);
    if (selector === "*") return descendants;
    if (selector === "img") return descendants.filter((node) => node.tagName === "IMG");
    if (selector === "button") return descendants.filter((node) => node.tagName === "BUTTON");
    if (selector === ".carousel-item") {
      return descendants.filter((node) => node.classList.contains("carousel-item"));
    }
    if (selector === ".carousel-item.active") {
      return descendants.filter((node) => node.classList.contains("carousel-item") && node.classList.contains("active"));
    }
    if (selector.startsWith(".")) {
      const className = selector.slice(1);
      return descendants.filter((node) => node.classList.contains(className));
    }
    if (selector.startsWith("button:not") || selector.startsWith("[href]") || selector.startsWith("input")) {
      return descendants.filter((node) => node.tagName === "BUTTON" || node.hasAttribute("tabindex"));
    }
    return [];
  }
}

function createBrowserFixture() {
  const document = {
    activeElement: null,
    body: new FakeElement("body"),
    createElement(tagName) {
      return new FakeElement(tagName, document);
    },
  };
  document.body.document = document;
  document.body.classList = new FakeElement("body", document).classList;

  const overlay = new FakeElement("section", document);
  const indicators = new FakeElement("div", document);
  indicators.className = "carousel-indicators";
  const inner = new FakeElement("div", document);
  inner.className = "carousel-inner";
  const closeButton = new FakeElement("button", document);
  const carousel = new FakeElement("div", document);
  overlay.appendChild(closeButton);
  overlay.appendChild(indicators);
  overlay.appendChild(inner);

  const images = [0, 1, 2].map((index) => {
    const image = new FakeElement("img", document);
    image.currentSrc = `https://example.test/slide-${index}.webp`;
    image.src = `https://example.test/slide-${index}.jpg`;
    image.alt = `Saree ${index}`;
    image.setAttribute("data-showcase-slide", String(index));
    return image;
  });
  const elements = {
    "image-popup-overlay": overlay,
    closeBtn: closeButton,
    carouselExampleIndicators: carousel,
  };
  const window = { scrollY: 160, scrollTo(x, y) { this.restoredY = y; } };
  document.querySelectorAll = (selector) => selector === ".featured-image-gallery img" ? images : [];
  document.getElementById = (id) => elements[id];
  const source = fs.readFileSync(path.join(__dirname, "..", "scripts", "image-popup.js"), "utf8");
  vm.runInNewContext(source, { document, window });
  return { document, window, overlay, indicators, inner, closeButton, carousel, images };
}

test("gallery keeps hidden slides unloaded and loads the selected WebP on open and navigation", () => {
  const fixture = createBrowserFixture();
  const { images, inner, overlay, carousel } = fixture;
  const slides = inner.querySelectorAll(".carousel-item");

  assert.equal(slides.length, 3);
  assert.ok(slides.every((slide) => !slide.querySelector("img").hasAttribute("src")));

  images[1].dispatch("click");
  assert.equal(overlay.classList.contains("active"), true);
  assert.equal(slides[1].querySelector("img").getAttribute("src"), images[1].currentSrc);
  assert.equal(slides[0].querySelector("img").hasAttribute("src"), false);
  assert.equal(slides[2].querySelector("img").hasAttribute("src"), false);

  carousel.dispatch("slide.bs.carousel", { relatedTarget: slides[2] });
  assert.equal(slides[2].querySelector("img").getAttribute("src"), images[2].currentSrc);
});

test("keyboard opens the dialog, traps focus, and Escape restores focus and scroll", () => {
  const fixture = createBrowserFixture();
  const { document, window, overlay, closeButton, indicators, images } = fixture;
  let prevented = false;

  images[0].dispatch("keydown", { key: " ", preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(document.activeElement, closeButton);
  assert.equal(overlay.getAttribute("aria-hidden"), "false");
  assert.equal(document.body.style.top, "-160px");

  const lastControl = overlay.querySelectorAll("button").at(-1);
  overlay.dispatch("keydown", { key: "Tab", shiftKey: true });
  assert.equal(document.activeElement, lastControl);

  overlay.dispatch("keydown", { key: "Escape" });
  assert.equal(overlay.classList.contains("active"), false);
  assert.equal(overlay.getAttribute("aria-hidden"), "true");
  assert.equal(document.activeElement, images[0]);
  assert.equal(window.restoredY, 160);
});
