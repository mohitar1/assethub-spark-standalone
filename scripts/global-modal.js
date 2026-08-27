/**
 * Global modal utility for configurable modal creation.
 * All CSS class names use the "global-modal-" prefix so they do not clash with
 * other modals (e.g. .modal-content, .modal-header in blocks).
 */
import { handleModalClose } from './modal-utils.js';

export const MODAL_CONTENT_TYPES = {
  TEXT: 'text',
  HTML: 'html',
  SCROLLABLE_TEXT: 'scrollable-text',
  IFRAME: 'iframe',
  IMAGE: 'image',
  VIDEO: 'video',
  NODE: 'node',
};

export const MODAL_BUTTON_VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
};

export const MODAL_BUTTON_ACTIONS = {
  CLOSE: 'close',
  REDIRECT: 'redirect',
  CUSTOM: 'custom',
};

const DEFAULT_MODAL_TYPE = 'info';
const DEFAULT_CLOSE_LABEL = 'Close';

function normalizeType(type) {
  return String(type || DEFAULT_MODAL_TYPE).toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function buildIframeContent(content) {
  const iframe = document.createElement('iframe');
  iframe.className = 'global-modal-media global-modal-media-iframe';
  iframe.src = content.src || '';
  iframe.title = content.title || 'Embedded content';
  iframe.loading = content.loading || 'lazy';
  iframe.referrerPolicy = content.referrerPolicy || 'no-referrer';

  if (content.allow) {
    iframe.setAttribute('allow', content.allow);
  }
  if (content.allowFullscreen) {
    iframe.setAttribute('allowfullscreen', '');
  }

  return iframe;
}

function buildImageContent(content) {
  const image = document.createElement('img');
  image.className = 'global-modal-media global-modal-media-image';
  image.src = content.src || '';
  image.alt = content.alt || '';
  image.loading = content.loading || 'lazy';
  return image;
}

function buildVideoContent(content) {
  const video = document.createElement('video');
  video.className = 'global-modal-media global-modal-media-video';
  video.controls = content.controls !== false;
  video.autoplay = Boolean(content.autoplay);
  video.loop = Boolean(content.loop);
  video.muted = Boolean(content.muted);
  video.playsInline = true;

  if (content.poster) {
    video.poster = content.poster;
  }

  if (content.src) {
    const source = document.createElement('source');
    source.src = content.src;
    if (content.mimeType) {
      source.type = content.mimeType;
    }
    video.appendChild(source);
  }

  return video;
}

function createContentNode(content = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'global-modal-content';

  if (content.scrollable) {
    wrapper.classList.add('global-modal-content-scrollable-text');
  }

  const type = content.type || MODAL_CONTENT_TYPES.TEXT;
  if (type === MODAL_CONTENT_TYPES.HTML) {
    wrapper.innerHTML = content.value || '';
    return wrapper;
  }

  if (type === MODAL_CONTENT_TYPES.SCROLLABLE_TEXT) {
    wrapper.classList.add('global-modal-content-scrollable-text');
    wrapper.textContent = content.value || '';
    return wrapper;
  }

  if (type === MODAL_CONTENT_TYPES.IFRAME) {
    wrapper.appendChild(buildIframeContent(content));
    return wrapper;
  }

  if (type === MODAL_CONTENT_TYPES.IMAGE) {
    wrapper.appendChild(buildImageContent(content));
    return wrapper;
  }

  if (type === MODAL_CONTENT_TYPES.VIDEO) {
    wrapper.appendChild(buildVideoContent(content));
    return wrapper;
  }

  if (type === MODAL_CONTENT_TYPES.NODE && content.node instanceof Node) {
    wrapper.appendChild(content.node);
    return wrapper;
  }

  wrapper.textContent = content.value || '';
  return wrapper;
}

function createActionButton(buttonConfig, controls) {
  const button = document.createElement('button');
  button.type = 'button';
  const action = buttonConfig.action || MODAL_BUTTON_ACTIONS.CLOSE;

  const variant = buttonConfig.variant || MODAL_BUTTON_VARIANTS.PRIMARY;
  button.className = `global-modal-button global-modal-button-${variant}`;

  if (buttonConfig.className) {
    button.classList.add(buttonConfig.className);
  }

  button.textContent = buttonConfig.label || '';

  button.addEventListener('click', async (event) => {
    const hasCustomHandler = typeof buttonConfig.onClick === 'function';

    if (hasCustomHandler) {
      await buttonConfig.onClick({
        event,
        button,
        close: controls.close,
        modal: controls.modal,
      });
    }

    if (action === MODAL_BUTTON_ACTIONS.REDIRECT && buttonConfig.href) {
      if (buttonConfig.target && buttonConfig.target !== '_self') {
        window.open(buttonConfig.href, buttonConfig.target, 'noopener,noreferrer');
      } else {
        window.location.href = buttonConfig.href;
      }
      return;
    }

    if (
      action === MODAL_BUTTON_ACTIONS.CUSTOM
      && !hasCustomHandler
      && buttonConfig.closeOnClick === undefined
    ) {
      controls.close();
      return;
    }

    const shouldClose = buttonConfig.closeOnClick
      ?? action === MODAL_BUTTON_ACTIONS.CLOSE;
    if (shouldClose) {
      controls.close();
    }
  });

  return button;
}

/**
 * Create a global modal instance.
 * @param {Object} config - Modal configuration
 * @returns {Object} Modal controls and element references
 */
export function createGlobalModal(config = {}) {
  const {
    id,
    type = DEFAULT_MODAL_TYPE,
    title = '',
    width,
    maxWidth,
    height,
    content = {},
    buttons = [],
    showCloseButton = true,
    closeButtonLabel = DEFAULT_CLOSE_LABEL,
    closeOnOverlay = true,
    closeOnEscape = true,
    onOpen,
    onClose,
    historyKey = null,
    restoreUrl,
  } = config;

  if (id) {
    const existingModal = document.querySelector(`.global-modal[data-modal-id="${id}"]`);
    existingModal?.remove();
  }

  const modal = document.createElement('div');
  const normalizedType = normalizeType(type);
  modal.className = 'global-modal';
  modal.setAttribute('data-modal-type', normalizedType);
  if (id) {
    modal.setAttribute('data-modal-id', id);
  }

  const overlay = document.createElement('div');
  overlay.className = 'global-modal-overlay';

  const container = document.createElement('div');
  container.className = 'global-modal-container';
  if (width) {
    container.style.setProperty('--global-modal-width', width);
  }
  if (maxWidth) {
    container.style.setProperty('--global-modal-max-width', maxWidth);
  }
  if (height) {
    container.style.setProperty('--global-modal-height', height);
  }

  let controls;

  const hasHeader = title || showCloseButton;
  if (hasHeader) {
    const header = document.createElement('div');
    header.className = 'global-modal-header';

    if (title) {
      const titleElement = document.createElement('h2');
      titleElement.className = 'global-modal-title';
      titleElement.textContent = title;
      header.appendChild(titleElement);
    }

    if (showCloseButton) {
      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'global-modal-close';
      closeButton.setAttribute('aria-label', closeButtonLabel);
      closeButton.innerHTML = '&times;';
      header.appendChild(closeButton);

      closeButton.addEventListener('click', () => {
        controls.close();
      });
    }

    container.appendChild(header);
  }

  const body = document.createElement('div');
  body.className = 'global-modal-body';
  if (content.scrollable) {
    body.classList.add('global-modal-body-scrollable');
  }
  body.appendChild(createContentNode(content));
  container.appendChild(body);

  const footer = document.createElement('div');
  footer.className = 'global-modal-footer';
  container.appendChild(footer);

  modal.appendChild(overlay);
  modal.appendChild(container);

  let isOpen = false;
  let escapeHandler;

  const closeInternal = () => {
    if (!isOpen) {
      return;
    }
    if (escapeHandler) {
      document.removeEventListener('keydown', escapeHandler);
      escapeHandler = null;
    }
    modal.remove();
    isOpen = false;
  };

  controls = {
    modal,
    body,
    buttons: {},
    open() {
      if (isOpen) {
        return;
      }
      document.body.appendChild(modal);
      isOpen = true;

      if (closeOnEscape) {
        escapeHandler = (event) => {
          if (event.key === 'Escape') {
            controls.close();
          }
        };
        document.addEventListener('keydown', escapeHandler);
      }

      if (typeof onOpen === 'function') {
        onOpen({ modal, close: controls.close });
      }
    },
    close() {
      if (!isOpen) {
        return;
      }
      handleModalClose({
        historyKey,
        closeFn: closeInternal,
        restoreUrl,
        onClose: () => {
          if (typeof onClose === 'function') {
            onClose({ modal });
          }
        },
      });
    },
  };

  if (closeOnOverlay) {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        controls.close();
      }
    });
  }

  buttons.forEach((buttonConfig, index) => {
    const key = buttonConfig.key || `button-${index + 1}`;
    const buttonElement = createActionButton(buttonConfig, controls);
    controls.buttons[key] = buttonElement;
    footer.appendChild(buttonElement);
  });

  if (buttons.length === 0) {
    footer.style.display = 'none';
  }

  return controls;
}

/**
 * Create and open a global modal in one call.
 * @param {Object} config - Modal configuration
 * @returns {Object} Modal controls and element references
 */
export function showGlobalModal(config = {}) {
  const modalControls = createGlobalModal(config);
  modalControls.open();
  return modalControls;
}
