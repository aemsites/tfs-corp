import { toClassName } from '../../scripts/aem.js';
import { buildSymbol, useSvgForIcon } from '../../scripts/scripts.js';
import { loadNavFragment } from '../header/header.js';
import { fixNestedListsDom } from '../../scripts/utils.js';

const isNotMobile = window.matchMedia('(width >= 770px)');

function toggleNavSection(navDrop, expanded) {
  const navControlButton = navDrop.querySelector(':scope > button');
  navControlButton.setAttribute('aria-expanded', expanded);
}

function toggleAllNavSections(navSectionContainer, expanded = false) {
  navSectionContainer.querySelectorAll('li.collapsible').forEach((navSection) => {
    toggleNavSection(navSection, expanded);
  });
}

function decorateFooterNav(block, footerNavList) {
  fixNestedListsDom(footerNavList);

  // merge sibling links with same href
  // this is due to an html2md issue with <sup> inside of links
  footerNavList.querySelectorAll('a').forEach((a) => {
    const prevElement = a.previousElementSibling;
    if (prevElement && prevElement.tagName === 'A' && prevElement.href === a.href) {
      a.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          prevElement.append(' ');
        }
        prevElement.append(node);
      });
      a.remove();
      if (prevElement.querySelector('.icon-new-window')) {
        prevElement.append(prevElement.querySelector('.icon-new-window'));
      }
    }
  });

  footerNavList.classList.add('nav-list');
  footerNavList.querySelectorAll(':scope > li').forEach((liEl, idx) => {
    const subList = liEl.querySelector(':scope > ul');
    if (subList) {
      liEl.classList.add('collapsible');
      const textNodes = [...liEl.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE);
      const liText = textNodes.map((text) => text.textContent).join('').trim();
      const dropButton = document.createElement('button');
      const sublistId = `sublist-${toClassName(liText)}-${idx}`;
      dropButton.textContent = liText;
      [
        { attr: 'type', value: 'button' },
        { attr: 'aria-expanded', value: 'false' },
        { attr: 'tabIndex', value: '-1' },
        { attr: 'aria-controls', value: sublistId },
      ].forEach(({ attr, value }) => {
        dropButton.setAttribute(attr, value);
      });
      dropButton.append(buildSymbol('chevron'));
      const collapsibleContent = document.createElement('div');
      collapsibleContent.classList.add('collapsible-content');
      collapsibleContent.append(subList);
      liEl.append(collapsibleContent);

      liEl.prepend(dropButton);
      textNodes.forEach((text) => text.remove());
      subList.setAttribute('id', sublistId);
      subList.classList = 'sublist';
      dropButton.addEventListener('click', () => {
        if (!isNotMobile.matches) {
          const expanded = dropButton.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(block, false);
          toggleNavSection(liEl, !expanded);
        }
      });
    }
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const fragment = await loadNavFragment('footer');

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  footer.className = 'footer-content';
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  footer.querySelectorAll('.section > .default-content-wrapper > ul').forEach((ul) => {
    decorateFooterNav(block, ul);
  });

  isNotMobile.addEventListener('change', () => {
    requestAnimationFrame(() => toggleAllNavSections(block, isNotMobile.matches));
  });

  // decorate icons
  const icons = footer.querySelectorAll('.icon');
  icons.forEach(useSvgForIcon);

  const cookieLi = [...footer.querySelectorAll('.sublist > li')].find((li) => {
    const link = li.querySelector('a');
    if (link && link.getAttribute('href') === '#cookie-settings') {
      return true;
    }

    return false;
  });

  if (cookieLi) {
    const cookieAnchor = document.createElement('a');
    cookieAnchor.href = '#';
    cookieAnchor.setAttribute('role', 'button');
    cookieAnchor.classList.add('tfs-analytics', 'cookie-button');
    cookieAnchor.textContent = cookieLi.textContent;
    cookieLi.replaceChildren(cookieAnchor);
    cookieAnchor.addEventListener('click', (event) => {
      event.preventDefault();
      // showConsentPreferences();
    });
  }

  // replace year
  const yearTag = footer.querySelector('.section:last-child p > u');
  if (yearTag && yearTag.textContent === yearTag.textContent.toUpperCase()
    && yearTag.textContent.length === 4) {
    const curYear = document.createTextNode(new Date().getFullYear());
    yearTag.replaceWith(curYear);
  }

  block.append(footer);
  toggleAllNavSections(block, isNotMobile.matches);
}
