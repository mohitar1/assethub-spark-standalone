/**
 * Error Page Block
 * Creates a centered error page layout with logo, message, description, and button
 * Table structure in DA.live:
 * Row 0 (header): Error Page (removed by framework before decorate)
 * Row 1: Logo URL
 * Row 2: Error message
 * Row 3: Description
 * Row 4: Button text | Button URL
 */
export default function decorate(block) {
  const rows = [...block.children];

  // AEM removes the block name row, so row 0 is the first content row
  const logoRow = rows[0];
  const messageRow = rows[1];
  const descriptionRow = rows[2];
  const buttonRow = rows[3];

  // Extract logo URL - check for img tag first, then text content
  let logoUrl = '';
  const logoImg = logoRow?.querySelector('img');
  if (logoImg) {
    logoUrl = logoImg.src;
  } else {
    logoUrl = logoRow?.textContent.trim();
  }

  // Get message text
  const message = messageRow?.textContent.trim();

  // Get description HTML (preserves links and formatting)
  let description = descriptionRow?.innerHTML || '';

  // Wrap email addresses in span to prevent awkward line breaks (e.g. "coca-" / "cola")
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  description = description.replace(emailRegex, '<span class="error-page-email">$1</span>');

  // Get button link
  const buttonLink = buttonRow?.querySelector('a');
  let buttonText = 'Go back to homepage';
  let buttonHref = '/';

  if (buttonLink) {
    // If we have an actual <a> tag, use it
    buttonText = buttonLink.textContent;
    buttonHref = buttonLink.href;
  } else {
    // If no <a> tag, try to parse markdown-style link [text](url)
    const buttonRowText = buttonRow?.textContent.trim() || '';
    const markdownLinkMatch = buttonRowText.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (markdownLinkMatch) {
      [, buttonText, buttonHref] = markdownLinkMatch;
    }
  }

  // Build error page structure
  block.innerHTML = `
    <div class="error-page-content">
      ${logoUrl ? `<img src="${logoUrl}" alt="Spark EDS" class="error-logo-image" />` : '<div class="error-logo-text">Spark EDS</div>'}
      <p class="error-message">${message}</p>
      <div class="error-description">${description}</div>
      <div class="button-container">
        <a href="${buttonHref}" class="button error-button-home">${buttonText}</a>
      </div>
    </div>
  `;
}
