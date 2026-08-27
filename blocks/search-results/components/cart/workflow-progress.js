/**
 * Workflow progress component — Cart → Download steps only.
 */

import { WorkflowStep, StepStatus } from './workflow-types.js';

function getStepIcon(step, status) {
  const iconMap = {
    [WorkflowStep.CART]: {
      [StepStatus.INIT]: '/icons/cart-stepper-icon.svg',
      [StepStatus.CURRENT]: '/icons/cart-stepper-icon.svg',
      [StepStatus.SUCCESS]: '/icons/cart-icon-success.svg',
      [StepStatus.FAILURE]: '/icons/cart-icon-failure.svg',
    },
    [WorkflowStep.DOWNLOAD]: {
      [StepStatus.INIT]: '/icons/download-icon.svg',
      [StepStatus.CURRENT]: '/icons/donwload-cart-step-red.svg',
      [StepStatus.SUCCESS]: '/icons/cart-icon-success.svg',
      [StepStatus.FAILURE]: '/icons/cart-icon-failure.svg',
    },
    [WorkflowStep.CLOSE_DOWNLOAD]: {
      [StepStatus.INIT]: '/icons/cart-icon-success.svg',
      [StepStatus.CURRENT]: '/icons/cart-icon-success.svg',
      [StepStatus.SUCCESS]: '/icons/cart-icon-success.svg',
      [StepStatus.FAILURE]: '/icons/cart-icon-failure.svg',
    },
  };

  const iconPath = iconMap[step]?.[status] || iconMap[step]?.[StepStatus.INIT] || '';
  return iconPath ? `<img src="${iconPath}" alt="${step}" />` : '';
}

function getStepClassName(step, isActive, stepStatus) {
  const classes = ['workflow-step'];
  if (isActive) classes.push('active');
  const status = stepStatus?.[step];
  if (status === StepStatus.SUCCESS) classes.push('completed');
  else if (status === StepStatus.FAILURE) classes.push('failed');
  return classes.join(' ');
}

export function renderWorkflowProgress(options) {
  const {
    activeStep = WorkflowStep.CART,
    stepStatus = {},
    t = (key, fallback) => fallback,
  } = options;

  return `
    <div class="workflow-progress">
      <div class="${getStepClassName(WorkflowStep.CART, activeStep === WorkflowStep.CART, stepStatus)}">
        <div class="step-icon">
          ${getStepIcon(WorkflowStep.CART, stepStatus[WorkflowStep.CART] || StepStatus.INIT)}
        </div>
        <span class="step-label">${t('cartWorkflowCart', 'Cart')}</span>
      </div>
      <div class="horizontal-line"></div>
      <div class="${getStepClassName(WorkflowStep.DOWNLOAD, activeStep === WorkflowStep.DOWNLOAD, stepStatus)}">
        <div class="step-icon">
          ${getStepIcon(WorkflowStep.DOWNLOAD, stepStatus[WorkflowStep.DOWNLOAD] || StepStatus.INIT)}
        </div>
        <span class="step-label">${t('cartWorkflowDownload', 'Download')}</span>
      </div>
    </div>
  `;
}

export default renderWorkflowProgress;
