/*
 * Table Block
 * Recreate a table
 * https://www.hlx.live/developer/block-collection/table
 */

import { enableAdaptiveTooltip } from '../../scripts/blocks-utils.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { fetchPlaceholders } from '../../scripts/aem.js';

const BLOCK_VARIANTS = {
  default: 'default',
  headingBg: 'heading-bg',
  bodyBg: 'body-bg',
  alternateRowBg: 'alternate-row-bg',
  list: 'list',
  description: 'description',
};

const BLOCK_ORDERED_ATTRIBUTES = [
  BLOCK_VARIANTS.headingBg,
  BLOCK_VARIANTS.bodyBg,
  BLOCK_VARIANTS.alternateRowBg,
  BLOCK_VARIANTS.list,
  BLOCK_VARIANTS.description,
];

const BREAKPOINTS = {
  mobile: '(max-width: 767px)',
};

function isMobileView() {
  return window.matchMedia(BREAKPOINTS.mobile).matches;
}

function isListBlockVariant(block) {
  return block.classList.contains(BLOCK_VARIANTS.list);
}

function isHeadingBgBlockVariant(block) {
  return block.classList.contains(BLOCK_VARIANTS.headingBg);
}

function isBodyBgBlockVariant(block) {
  return block.classList.contains(BLOCK_VARIANTS.bodyBg);
}

function isAlternateRowBgBlockVariant(block) {
  return block.classList.contains(BLOCK_VARIANTS.alternateRowBg);
}

function isBgBlockAttribute(attr) {
  // eslint-disable-next-line max-len
  return attr === BLOCK_VARIANTS.headingBg || attr === BLOCK_VARIANTS.bodyBg || attr === BLOCK_VARIANTS.alternateRowBg;
}

function isDescriptionBlockVariant(block) {
  return block.classList.contains(BLOCK_VARIANTS.description);
}

function isFirstTableInListVariant(block) {
  const tableWrapper = block.parentElement;
  const prevTableBlock = tableWrapper.previousElementSibling?.firstElementChild;
  return !prevTableBlock || !prevTableBlock.classList.contains('table') || !prevTableBlock.classList.contains('list');
}

function getBgColorByVariant(block, variant) {
  let bgColor;
  switch (variant) {
    case BLOCK_VARIANTS.headingBg:
      bgColor = block.getAttribute('data-heading-bg');
      break;
    case BLOCK_VARIANTS.bodyBg:
      bgColor = block.getAttribute('data-body-bg');
      break;
    case BLOCK_VARIANTS.alternateRowBg:
      bgColor = block.getAttribute('data-alternate-row-bg');
      break;
    default:
      bgColor = 'fff';
  }
  return bgColor;
}

function handleTableContentHeight(block) {
  const tableContent = block.querySelector('.table-content');
  if (tableContent?.classList.contains('open')) {
    let totalHeight = 0;
    // Sum up the height of each child element
    Array.from(tableContent.children).forEach((child) => {
      totalHeight += child.offsetHeight;
    });
    tableContent.style.height = `${totalHeight}px`;
  } else {
    tableContent.style.height = '0';
  }
}

function decorateIcons(td, block) {
  if (!isListBlockVariant(block)) return;
  const icons = td.querySelectorAll('.icon');
  icons?.forEach((icon) => {
    const iconName = Array.from(icon.classList)
      .find((c) => c.startsWith('icon-'))
      .substring(5);

    if (iconName.toLowerCase().endsWith('-large')) {
      icon.classList.add('large');
      td.classList.add('icon-large');
    }

    const prevSibling = icon.parentElement.previousElementSibling;
    const nextSibling = icon.parentElement.nextElementSibling;
    if (prevSibling && prevSibling.innerText !== '' && nextSibling && nextSibling?.innerText !== '') {
      const tooltipContent = document.createElement('div');
      tooltipContent.classList.add('tooltip-content');
      tooltipContent.innerHTML = nextSibling.innerHTML;
      icon.prepend(tooltipContent);
      nextSibling.remove();
      icon.classList.add('tooltip');
      if (td.classList.contains('icon-large')) {
        icon.parentElement.remove();
        prevSibling.append(icon);
      }

      enableAdaptiveTooltip(icon);
    }
  });
}

function decorateCellButton(cell) {
  const paras = Array.from(cell.querySelectorAll('p'));
  const buttonProps = paras.length > 1 ? paras.slice(Math.max(-paras.length, -3)) : [];
  if (buttonProps.length > 0) {
    const buttonFlag = buttonProps.find((para) => para.innerText === 'true' || para.innerText === 'false');
    if (!buttonFlag) return;
    const button = buttonFlag.nextElementSibling;
    const buttonStyle = button?.nextElementSibling;
    if (buttonFlag.innerText === 'true') {
      const style = buttonStyle?.innerText;
      if (style) button.querySelector('a')?.classList.add(style);
    } else {
      button?.remove();
    }
    buttonFlag?.remove();
    buttonStyle?.remove();
  }
}

function decorateTableTitle(tableTitle, block, placeholders) {
  if (!tableTitle) return;
  const heading = tableTitle.querySelector('p');
  heading.classList.add('heading');
  const showText = `${placeholders.showdetail}`;
  const hideText = `${placeholders.hidedetail}`;
  const showDetail = document.createElement('p');
  tableTitle.firstElementChild?.append(showDetail);
  showDetail.classList.add('show-detail');
  if (isFirstTableInListVariant(block)) showDetail.innerHTML = hideText;
  else showDetail.innerHTML = showText;
  tableTitle.addEventListener('click', () => {
    const tableContent = tableTitle.nextElementSibling;
    tableTitle.parentElement.classList.toggle('active');
    tableContent.classList.add('collapsable');
    tableContent?.classList.toggle('open');
    handleTableContentHeight(block);
    showDetail.innerHTML = tableTitle.parentElement.classList.contains('active') ? hideText : showText;
  });
}

function decorateTableHeading(table, block) {
  const tr = table.querySelector('thead > tr');
  if (!tr) return;
  const isHeadingBgVariant = isHeadingBgBlockVariant(block);

  if (isHeadingBgVariant) {
    const color = getBgColorByVariant(block, BLOCK_VARIANTS.headingBg);
    if (color) tr.style.backgroundColor = !color.startsWith('#') ? `#${color}` : color;
  }

  if (tr.children?.length > 0) {
    [...tr.children].forEach((th) => {
      th.querySelectorAll('a')?.forEach((link) => link.classList.remove('button'));
      decorateCellButton(th);
      decorateIcons(th, block);
    });
  }
}

function decorateTableBody(table, block) {
  const rows = table.querySelectorAll('tbody > tr');
  const isAlternateRowBgVariant = isAlternateRowBgBlockVariant(block);
  const isListVariant = isListBlockVariant(block);
  const isBodyBgVariant = isBodyBgBlockVariant(block);
  rows.forEach((row, i) => {
    if (isListVariant) {
      [...row.children].forEach((cell) => {
        decorateCellButton(cell);
        decorateIcons(cell, block);
        if (cell.textContent.trim() === '') cell.classList.add('empty');
      });
    }

    if (isAlternateRowBgVariant) {
      const color = getBgColorByVariant(block, BLOCK_VARIANTS.alternateRowBg);
      if (color && i % 2 === 0) {
        row.classList.add('custom-bg');
        row.style.backgroundColor = !color.startsWith('#') ? `#${color}` : color;
      }
    }

    if (isBodyBgVariant) {
      const color = getBgColorByVariant(block, BLOCK_VARIANTS.bodyBg);
      if (color) {
        const tbody = table.querySelector('tbody');
        if (tbody) tbody.style.backgroundColor = !color.startsWith('#') ? `#${color}` : color;
      }
    }
  });
}

function updateActiveHeadingTabInMobile(table, block) {
  const dataActiveTab = parseInt(table.getAttribute('data-active-tab-mob'), 10);
  const activeTab = dataActiveTab + 1;

  const headingTabs = block.querySelectorAll('.heading-tabs-mob button');
  headingTabs.forEach((tab, index) => {
    if (index + 1 === dataActiveTab) tab.classList.add('active');
    else tab.classList.remove('active');
  });

  // Remove the 'active' class from all columns
  table.querySelectorAll('th, td').forEach((cell) => cell.classList.remove('active'));

  // Add the 'active' class to the appropriate columns
  table.querySelectorAll('th:nth-child(1), td:nth-child(1)').forEach((cell) => cell.classList.add('active'));
  table.querySelectorAll(`th:nth-child(${activeTab}), td:nth-child(${activeTab})`).forEach((cell) => cell.classList.add('active'));
}

function createHeadingTabSelectorInMobile(table, block) {
  if (!isListBlockVariant(block)) return;
  const div = document.createElement('div');
  div.classList.add('heading-tabs-mob');
  table.before(div);

  const headingCols = table.querySelectorAll('thead > tr > th');
  headingCols.forEach((col, index) => {
    if (index === 0) return;
    const tabButtonWrapper = document.createElement('div');
    tabButtonWrapper.classList.add('tab-button-wrapper');
    const arrow = document.createElement('div');
    arrow.classList.add('tab-arrow');
    const button = document.createElement('button');
    tabButtonWrapper.append(arrow, button);
    div.append(tabButtonWrapper);
    let buttonTitle = col.classList.contains('icon-large')
      ? col.querySelector('p a:nth-of-type(1)') : col.querySelector('p a:nth-of-type(2)');
    if (!buttonTitle) buttonTitle = col.querySelector('p:nth-of-type(1) strong') || col.querySelector('p:nth-of-type(1)');
    button.innerHTML = buttonTitle?.innerText?.replace(/ policy/i, '');
    button.addEventListener('click', () => {
      table.setAttribute('data-active-tab-mob', index);
      updateActiveHeadingTabInMobile(table, block);
      handleTableContentHeight(block);
    });
  });
}

function decorateTableInMobileView(table, block) {
  if (!isMobileView()) return;
  if (!table) return;
  if (!isListBlockVariant(block)) return;
  if (table.hasAttribute('data-active-tab-mob')) return; // Already decorated
  const headingRow = table.querySelector('thead tr');
  if (!headingRow) return;
  headingRow.classList.add('column-reverse-mob');

  const columns = headingRow.querySelectorAll('th');
  columns.forEach((col) => {
    const subHeadingPara = col.querySelector('p:nth-of-type(2)');
    if (!subHeadingPara) return;
    const prevSiblingIsIcon = subHeadingPara.previousElementSibling?.querySelector('.icon');
    if (!prevSiblingIsIcon) subHeadingPara?.classList.add('combine-hyphen-mob');
  });

  table.setAttribute('data-active-tab-mob', 1);
  updateActiveHeadingTabInMobile(table, block);
}

function decorateTableContent(block) {
  if (!isListBlockVariant(block)) return;
  const tableTitle = block.querySelector('.table-title');
  const tableContent = document.createElement('div');
  tableContent.classList.add('table-content');
  let nextSibling = tableTitle.nextElementSibling;
  while (nextSibling) {
    tableContent.append(nextSibling);
    nextSibling = tableTitle.nextElementSibling;
  }
  tableTitle.after(tableContent);

  if (isFirstTableInListVariant(block)) {
    block.classList.add('active');
    tableContent.classList.add('open');
  } else {
    tableContent.classList.add('collapsable');
  }
}

function buildCell(rowIndex, headerInd) {
  const cell = rowIndex !== headerInd ? document.createElement('td') : document.createElement('th');
  if (!rowIndex) cell.setAttribute('scope', 'col');
  return cell;
}

function setBlockAttributes(block) {
  const [...blockAttributesDivs] = Array.from(block.children)
    .slice(0, BLOCK_ORDERED_ATTRIBUTES.length);
  blockAttributesDivs.forEach((div, index) => {
    if (div.firstElementChild?.innerText === '') div.remove();
    else {
      block.setAttribute(`data-${BLOCK_ORDERED_ATTRIBUTES[index]}`, div.firstElementChild?.innerText);
      if (isBgBlockAttribute(BLOCK_ORDERED_ATTRIBUTES[index])
      || (BLOCK_ORDERED_ATTRIBUTES[index] === 'description' && !block.getAttribute('data-list'))) {
        div.remove();
      }
    }
  });
}

export default async function decorate(block) {
  const placeholders = await fetchPlaceholders();
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const isListVariant = isListBlockVariant(block);
  const isDescriptionVariant = isDescriptionBlockVariant(block);
  const header = !block.classList.contains('no-header');
  if (header) table.append(thead);
  table.append(tbody);

  let tableTitle;
  let tableDescription;
  let headerInd = 0;
  const newBlockChildren = [];
  setBlockAttributes(block);
  [...block.children].forEach((child, i) => {
    // In list item variant, first child is the title unlike default variant
    if (isListVariant && i === 0) {
      child.classList.add('table-title');
      tableTitle = child;
      decorateTableTitle(tableTitle, block, placeholders);
      newBlockChildren.push(tableTitle);
      headerInd = i + 1;
      return;
    }

    if (isDescriptionVariant && ((isListVariant && i === 1) || (i === 0))) {
      child.classList.add('table-description');
      tableDescription = child;
      newBlockChildren.push(tableDescription);
      headerInd = i + 1;
      return;
    }
    const row = document.createElement('tr');
    moveInstrumentation(child, row);
    if (header && i === headerInd) thead.append(row);
    else tbody.append(row);
    [...child.children].forEach((col) => {
      const cell = buildCell(header ? i : i + 1, headerInd);
      cell.innerHTML = col.innerHTML;
      row.append(cell);
    });
  });
  block.innerHTML = '';
  newBlockChildren.push(table);
  block.append(...newBlockChildren);
  decorateTableHeading(table, block);
  createHeadingTabSelectorInMobile(table, block);
  decorateTableBody(table, block);
  decorateTableContent(block);

  // events listeners to handle mobile view
  block.addEventListener('parent-tab-active', () => handleTableContentHeight(block));
  document.addEventListener('load', () => decorateTableInMobileView(table, block), true);
  window.addEventListener('resize', () => {
    if (!isListVariant) return; // remove later if required for other variants as well
    handleTableContentHeight(block);
    if (!isMobileView()) { // remove mobile specific styles
      if (!table.hasAttribute('data-active-tab-mob')) return; // indicates that already removed mobile attributes
      const headingRow = thead.querySelector('tr');
      headingRow.classList.remove('column-reverse-mob');
      const cols = table.querySelectorAll('th, td');
      cols?.forEach((col) => col.classList.remove('active'));
      table.removeAttribute('data-active-tab-mob');
    } else {
      decorateTableInMobileView(table, block);
    }
  });
}
