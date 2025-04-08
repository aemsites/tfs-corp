import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  const navDrops = navSections.querySelectorAll('.nav-drop');
  if (isDesktop.matches) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute('tabindex')) {
        drop.setAttribute('tabindex', 0);
        drop.addEventListener('focus', focusNavSection);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute('tabindex');
      drop.removeEventListener('focus', focusNavSection);
    });
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

export async function loadNavFragment(fragmentName) {
  let navPath = getMetadata(fragmentName);
  let navFragment;
  if (navPath) {
    navFragment = await loadFragment(navPath);
  }

  // all else fails default to us en
  if (!navFragment) {
    navPath = `/us/en/fragments/${fragmentName}`;
    navFragment = await loadFragment(navPath);
  }

  return navFragment;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  // load nav as fragment
  const fragment = await loadNavFragment('nav');

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    // brandLink.closest('.button-container').className = '';
  }

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
      navSection.addEventListener('click', () => {
        if (isDesktop.matches) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
    });
  }
  setupHamburgerMenu(nav);
}

// Function to set up hamburger menu
function setupHamburgerMenu(nav) {
  const hamburgerContainer = nav.querySelector('.nav-hamburger');
  if (!hamburgerContainer) return;

  const hamburgerItems = hamburgerContainer.querySelector('ul');
  const logo = hamburgerContainer.querySelector('span');
  hamburgerContainer.innerHTML = '';

  const hamburgerButton = document.createElement('button');
  hamburgerButton.classList.add('hamburger-icon');
  hamburgerButton.innerHTML = '&#9776;';
  hamburgerButton.setAttribute('aria-expanded', 'false');

  hamburgerItems.style.display = 'none';

  hamburgerButton.addEventListener('click', () => {
    const expanded = hamburgerButton.getAttribute('aria-expanded') === 'true';

    if (expanded) {
      hamburgerItems.querySelectorAll(':scope > li[aria-expanded="true"]').forEach((openMenu) => {
        openMenu.setAttribute('aria-expanded', 'false');
        const submenu = openMenu.querySelector('ul');
        if (submenu) submenu.style.display = 'none';
      });
      hamburgerContainer.classList.remove('submenu-expanded');
    }

    hamburgerItems.style.display = expanded ? 'none' : 'block';
    hamburgerButton.innerHTML = expanded ? '&#9776;' : '&#10005;';
    hamburgerButton.classList.toggle('close-menu', !expanded);
    hamburgerButton.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  });

  hamburgerItems.querySelectorAll(':scope > li').forEach((menuItem) => {
    const submenu = menuItem.querySelector('ul');
    if (submenu) {
      menuItem.classList.add('hamburger-drop');
      submenu.style.display = 'none';
      menuItem.setAttribute('aria-expanded', 'false');

      menuItem.addEventListener('click', (event) => {
        event.stopPropagation();
        const expanded = menuItem.getAttribute('aria-expanded') === 'true';
        hamburgerItems.querySelectorAll(':scope > li[aria-expanded="true"]').forEach((openMenu) => {
          if (openMenu !== menuItem) {
            openMenu.setAttribute('aria-expanded', 'false');
            const openSubmenu = openMenu.querySelector('ul');
            if (openSubmenu) openSubmenu.style.display = 'none';
          }
        });

        submenu.style.display = expanded ? 'none' : 'block';
        menuItem.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        hamburgerContainer.classList.toggle('submenu-expanded', !expanded);
      });
    }
  });

  hamburgerItems.prepend(logo);
  hamburgerContainer.appendChild(hamburgerButton);
  hamburgerContainer.appendChild(hamburgerItems);
}
