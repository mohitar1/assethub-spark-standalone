export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const link = row.querySelector('a');
    if (!link) return;

    link.classList.remove('button', 'primary', 'secondary');
    const wrapper = link.closest('.button-container');
    if (wrapper) wrapper.classList.remove('button-container');

    const span = document.createElement('span');
    span.className = 'button-list-label';
    span.textContent = link.textContent;

    const chevron = document.createElement('span');
    chevron.className = 'button-list-chevron';
    chevron.setAttribute('aria-hidden', 'true');

    link.textContent = '';
    link.append(span, chevron);

    const li = document.createElement('li');
    li.append(link);
    ul.append(li);
  });

  block.textContent = '';
  block.append(ul);
}
