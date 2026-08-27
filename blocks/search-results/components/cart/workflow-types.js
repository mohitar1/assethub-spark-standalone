/**
 * Cart workflow types and constants (assets-only flow).
 */

export const WorkflowStep = {
  CART: 'cart',
  DOWNLOAD: 'download',
  CLOSE_DOWNLOAD: 'close_download',
};

export const StepStatus = {
  INIT: 'init',
  CURRENT: 'current',
  SUCCESS: 'success',
  FAILURE: 'failure',
};

export function createDefaultStepStatuses() {
  return {
    [WorkflowStep.CART]: StepStatus.INIT,
    [WorkflowStep.DOWNLOAD]: StepStatus.INIT,
    [WorkflowStep.CLOSE_DOWNLOAD]: StepStatus.INIT,
  };
}
