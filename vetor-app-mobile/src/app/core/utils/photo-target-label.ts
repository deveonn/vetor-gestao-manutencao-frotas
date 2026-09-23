import { ChecklistStepState } from '../models/inspection.model';

export function photoTargetLabel(step: ChecklistStepState, subIndex: number): string {
  return step.subItems.length > 1 ? step.subItems[subIndex].label : step.label;
}
