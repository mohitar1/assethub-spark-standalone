/*
 * Accordion Block
 * Recreate an accordion
 * https://www.hlx.live/developer/block-collection/accordion
 */

export default function decorate(block) {
  [...block.children].forEach((row) => {
    // decorate accordion item label
    const label = row.children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);
    // decorate accordion item body
    const body = row.children[1];
    body.className = 'accordion-item-body';
    // decorate accordion item
    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary, body);
    row.replaceWith(details);
  });

  // Wrap accordion in a collapsible dropdown (welcome/login page only)
  if (!document.querySelector('.columns.loginpage')) return;
  const wrapper = block.closest('.accordion-wrapper');
  if (wrapper) {
    const prevSibling = wrapper.previousElementSibling;
    const iconParagraph = prevSibling?.querySelector('p > .icon')?.closest('p');
    if (iconParagraph) {
      const parent = wrapper.parentElement;
      const outerDetails = document.createElement('details');
      outerDetails.className = 'accordion-collapsible';
      const outerSummary = document.createElement('summary');
      outerSummary.className = 'accordion-collapsible-label';
      outerSummary.append(...iconParagraph.childNodes);
      parent.insertBefore(outerDetails, prevSibling);
      prevSibling.remove();
      outerDetails.append(outerSummary, wrapper);
    }
  }
}
