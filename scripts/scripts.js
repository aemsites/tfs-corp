import {
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  toClassName,
} from './aem.js';
import {
  getTimeoutSignal,
  FETCH_TIMEOUTS,
} from './utils.js';

const iconLoadingPromises = {};
async function loadIconSvg(icon, doc = document) {
  if (!icon) return;

  let svgSprite = doc.getElementById('svg-sprite');
  if (!svgSprite) {
    const div = document.createElement('div');
    div.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" id="svg-sprite" style="display: none"></svg>';
    svgSprite = div.firstElementChild;
    doc.body.append(svgSprite);
  }

  const { iconName } = icon.dataset;
  if (!iconLoadingPromises[iconName]) {
    iconLoadingPromises[iconName] = (async () => {
      const resp = await fetch(icon.src, {
        signal: getTimeoutSignal(FETCH_TIMEOUTS.default),
      });
      const temp = document.createElement('div');
      temp.innerHTML = await resp.text();
      const svg = temp.querySelector('svg');

      const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
      symbol.id = `icons-sprite-${iconName}`;
      symbol.setAttribute('viewBox', svg.getAttribute('viewBox'));
      while (svg.firstElementChild) symbol.append(svg.firstElementChild);
      svgSprite.append(symbol);
    })();
  }
  await iconLoadingPromises[iconName];

  const temp = document.createElement('div');
  temp.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><use href="#icons-sprite-${iconName}"/></svg>`;
  icon.replaceWith(temp.firstElementChild);
}

/**
 * Observes an icon span and loads the SVG when it becomes visible
 * @param {Element} iconSpan the span element for the given icon
 */
export async function useSvgForIcon(iconSpan) {
  const img = iconSpan.querySelector('img');
  if (img && img.loading === 'eager') {
    await loadIconSvg(img);
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadIconSvg(entry.target.querySelector('img'));
          observer.disconnect();
        }
      });
    }, {
      rootMargin: '250px',
    });
    observer.observe(iconSpan);
  }
}

/**
 * build a symbol element
 * @param {String} name the symbol name
 * @returns {Element} the symbol
 */
export function buildSymbol(name) {
  const icon = document.createElement('i');
  icon.className = `symbol symbol-${toClassName(name)}`;
  return icon;
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
