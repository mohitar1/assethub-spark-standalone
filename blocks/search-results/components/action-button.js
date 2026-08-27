/**
 * Action Button Component
 * A reusable button component that supports tooltips, disabled states, and loading states.
 */

/**
 * Creates an action button element
 * @param {Object} options - Configuration options
 * @param {Object} options.config - Button configuration (idle, downloading, disabled states)
 * @param {boolean} options.disabled - Initial disabled state
 * @param {Function} options.onClick - Click handler
 * @param {boolean} options.hasLoadingState - Whether to show loading state during async onClick
 * @returns {HTMLElement} The button container element
 */
export function createActionButton(options) {
  const {
    config,
    disabled = false,
    onClick,
    hasLoadingState = false,
  } = options;

  const container = document.createElement('div');
  container.className = 'action-button-container';

  // Create button
  const button = document.createElement('button');
  button.className = 'action-button';

  container.appendChild(button);

  // State management
  let isLoading = false;
  let isDisabled = disabled;

  // Update UI based on current state
  const updateUI = () => {
    let currentState;

    if (isDisabled && config.disabled) {
      currentState = config.disabled;
      button.disabled = true;
    } else if (isLoading && config.downloading) {
      currentState = config.downloading;
      button.disabled = true;
    } else {
      currentState = config.idle;
      button.disabled = false;
    }

    // Update classes
    button.className = `action-button ${currentState.className || ''}`;

    // Update background image
    if (currentState.backgroundImage) {
      button.style.backgroundImage = `url(${currentState.backgroundImage})`;
    } else {
      button.style.backgroundImage = '';
    }

    // Update tooltip attributes for global tooltip handler
    if (currentState.tooltip) {
      button.setAttribute('data-tooltip', currentState.tooltip);
      button.setAttribute('aria-label', currentState.tooltip);
      button.setAttribute('data-tooltip-position', 'left');
    } else {
      button.removeAttribute('data-tooltip');
      button.removeAttribute('aria-label');
      button.removeAttribute('data-tooltip-position');
    }
  };

  // Event listeners
  button.addEventListener('click', async (e) => {
    e.stopPropagation();

    if (hasLoadingState) {
      isLoading = true;
      updateUI();

      try {
        await onClick(e);
      } finally {
        isLoading = false;
        updateUI();
      }
    } else {
      onClick(e);
    }
  });

  // Initial render
  updateUI();

  // Public API
  container.setDisabled = (value) => {
    isDisabled = value;
    updateUI();
  };

  container.setLoading = (value) => {
    isLoading = value;
    updateUI();
  };

  return container;
}

// Predefined configurations (matching React ActionButtonConfigs.ts)
export const BUTTON_CONFIGS = {
  download: {
    idle: {
      className: 'download',
      backgroundImage: '/icons/download-asset.svg',
      tooltip: 'Download preview',
    },
    downloading: {
      className: 'downloading',
      backgroundImage: '/icons/downloading-asset.svg',
      tooltip: 'Downloading...',
    },
    disabled: {
      className: 'download',
      backgroundImage: '/icons/download-asset.svg',
      tooltip: 'Preview not available',
    },
  },
};
