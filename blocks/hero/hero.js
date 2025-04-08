// prepend the breadcrumb to the block in the decorate function

import { buildBlock, decorateBlock, loadBlock } from '../../scripts/aem.js';

async function loadCrumbs(block) {
  const footerBlock = buildBlock('breadcrumb', '');
  block.prepend(footerBlock);
  decorateBlock(footerBlock);
  return loadBlock(footerBlock);
}

export default async function decorate(block) {
  const buttonsDiv = document.createElement('div');
  buttonsDiv.classList.add('buttons-div');
  const buttons = block.querySelectorAll('.button-container');
  buttons.forEach((button) => {
    buttonsDiv.append(button);
  });
  block.append(buttonsDiv);
  loadCrumbs(block);
}
