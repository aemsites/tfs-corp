import {
  fetchPlaceholders, toCamelCase, getMetadata,
} from './aem.js';

export const FETCH_TIMEOUTS = {
  default: 5000,
  target: 2000,
};

export function getTimeoutSignal(timeout) {
  if (AbortSignal && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeout);
  }

  const aborter = new AbortController();
  setTimeout(() => aborter.abort('operation timed out'), timeout);
  return aborter.signal;
}

export function parseLocaleUrl(path) {
  const pathParts = path.split('/');
  const realPathParts = pathParts[1] === 'content' ? pathParts.slice(0, 1).concat(pathParts.slice(3)) : pathParts;

  if (realPathParts.length > 3 && realPathParts[1].length === 2 && realPathParts[2].length === 2) {
    return {
      lang: realPathParts[2],
      country: realPathParts[1],
      page: realPathParts.slice(3).join('/'),
    };
  }

  return {
    page: realPathParts.slice(1).join('/'),
  };
}

let pathInfo;
export function getPathInfo() {
  if (!pathInfo) {
    pathInfo = parseLocaleUrl(window.location.pathname);
    if (!pathInfo.lang || !pathInfo.country) {
      const usp = new URLSearchParams(window.location.search);
      const loc = usp.get('loc') || getMetadata('ups-locale');

      if (loc) {
        const locParts = loc.toLocaleLowerCase().split('_');
        pathInfo.lang = locParts[0].length === 2 ? locParts[0] : 'en';
        pathInfo.country = locParts[1].length === 2 ? locParts[1] : 'us';
      } else {
        pathInfo.lang = 'en';
        pathInfo.country = 'us';
      }
    }

    pathInfo = {
      ...pathInfo,
      localeRoot: `/${pathInfo.country}/${pathInfo.lang}/`,
      locale: `${pathInfo.lang}_${pathInfo.country.toUpperCase()}`,
    };
  }

  return pathInfo;
}

export function isPreview() {
  return ['localhost', 'hlx.page', 'aem.page', 'adobeaemcloud.com'].some((domain) => window.location.hostname.includes(domain));
}

export function inUniversalEditor() {
  if (window.self !== window.top && window.location.hostname.includes('adobeaemcloud.com')) {
    return true;
  }

  if (window.location.hostname.includes('adobeaemcloud.com') && document.body.closest('html').className.includes('adobe-ue')) return true;

  return false;
}

export function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  if (match) return match[2];
  return '';
}

export function setCookie(name, value, days, path = '/', domain = window.location.hostname, secure = false) {
  let cookie = `${name}=${value}`;
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    cookie += `; expires=${date.toUTCString()}`;
  }
  cookie += `; path=${path}`;
  cookie += `; domain=${domain}`;
  if (secure) cookie += '; secure';
  document.cookie = cookie;
}

export async function fetchLocalePlaceholders() {
  let localePath;
  if (/^\/[a-z]{2}\/[a-z]{2}\//.test(window.location.pathname)) {
    localePath = window.location.pathname.substring(0, 6);
  } else {
    localePath = '/us/en';
  }

  return fetchPlaceholders(localePath);
}

export function getPlaceholderString(keyText, placeholders) {
  const key = toCamelCase(keyText);
  if (key in placeholders && placeholders[key]) return placeholders[key];

  return keyText;
}

export async function replacePlaceholders(element) {
  const placeholders = await fetchLocalePlaceholders();
  element.querySelectorAll('[data-placeholder]').forEach((el) => {
    el.textContent = getPlaceholderString(el.textContent, placeholders);
  });

  element.querySelectorAll('[data-placeholder-attr]').forEach((el) => {
    const attrNames = el.getAttribute('data-placeholder-attr').split(',').filter((attr) => attr.trim() !== '');
    attrNames.forEach((attrName) => {
      const keyText = el.getAttribute(attrName);
      getPlaceholderString(keyText, placeholders);
    });
  });
}

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

export function clearInstrumentation(element, deep = false) {
  [...element.attributes].forEach((attr) => {
    if (attr.nodeName.startsWith('data-aue-') || attr.nodeName.startsWith('data-richtext-')) {
      element.removeAttribute(attr.nodeName);
    }
  });

  if (deep) {
    [...element.children].forEach((child) => clearInstrumentation(child, true));
  }
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

// Purpose of this function is to copy all attributes from source element to target element.
export function moveAllAttributes(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName),
  );
}

export function fixNestedListsDom(ul) {
  // deal with <p> tags that come out of nested lists in AEM but not doc-based authoring
  // see https://github.com/adobe/helix-html2md/issues/529

  ul.querySelectorAll('li').forEach((li) => {
    const p = li.querySelector('p:first-child');
    if (p) {
      p.querySelectorAll('a.button').forEach((a) => {
        // undecorate buttons
        a.classList.remove('button', 'outline', 'accent');
        const buttonChevron = a.querySelector('i.symbol');
        if (buttonChevron) buttonChevron.remove();
      });
      const children = p.childNodes;
      children.forEach((child) => {
        p.before(child);
      });
      p.remove();
    }
  });
}

export function mergeSiblingButtons(container) {
  const mergeTarget = container.querySelector('.button-wrapper + .button-wrapper');
  while (container.querySelector('.button-wrapper + .button-wrapper')) {
    const previous = mergeTarget.previousElementSibling;
    previous.append(...mergeTarget.children);
    mergeTarget.remove();
  }
}

export function toggleModalOverlay(force) {
  document.body.classList.toggle('modal-overlay', force);
}

/**
 * Superscript trademark symbols in text.
 * @param {string} content text to modify
 * @returns {string} modified text
 */
export function superscriptTrademarks(content) {
  const trademarkSymbols = {
    '™': '<sup>™</sup>',
    '®': '<sup>®</sup>',
  };
  return content.replace(/™|®/g, (match) => trademarkSymbols[match]);
}

export function debounce(func, delay) {
  let timeout;
  // eslint-disable-next-line func-names
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

export function isExternalLink(url) {
  const knownDomains = [
    'www.thermofisher.com',
    'hlx.page', 'hlx.live', 'aem.page', 'aem.live',
    'adobeaemcloud.com',
    window.location.hostname,
  ];
  let isExternal = false;
  if (url.pathname.endsWith('.pdf') || url.pathname.endsWith('.xlsx')) {
    isExternal = true;
  } else if (!url.hostname.includes('localhost') && !knownDomains.some((host) => url.hostname.includes(host))) {
    isExternal = true;
  } else if (url.hostname === window.location.hostname || url.hostname === 'www.thermofisher.com') {
    isExternal = url.pathname !== window.location.pathname;
  }
  return isExternal;
}

export function getPathPartOrMeta(pathIndex, metaName) {
  if (metaName) {
    const meta = getMetadata(metaName);
    if (meta) return meta;
  }

  const realPath = window.location.pathname.startsWith('/content/')
    ? `/${window.location.pathname.split('/').slice(3).join('/')}` : window.location.pathname;

  const parts = realPath.split('/');
  return parts.length > pathIndex ? parts[pathIndex] : '';
}

export function getPagePath(url) {
  return url ? new URL(url).pathname.replace(/\/content\/(tfs-corp)|\.page|\.html/g, '') : '';
}

export function getAddressFirstLine(addr) {
  if (addr && typeof addr !== 'string') {
    throw new TypeError('Expected a string as input');
  }

  const address = addr.includes('\n') ? addr.split('\n')[0] : addr;
  return address;
}
