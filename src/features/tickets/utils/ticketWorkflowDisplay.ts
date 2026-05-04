/**
 * Parity with SmartHelp web ticket: current workflow step, who is being waited on,
 * and scoping of ServiceAttribute rows by WorkflowTypeID (see 048 SQL).
 */

export type TicketHeaderLike = {
  currentStepName?: string;
  currentStepTypeName?: string;
  currentStepTypeId?: number;
  awaitingUserNames?: string;
  assignedToName?: string;
  isWaitingFor?: string;
  statusName?: string;
};

export function normalizeTicketWorkflowRow(raw: any): { id: string | number; name: string; stepOrder?: number; status?: string } {
  return {
    id: raw?.stepId ?? raw?.id ?? 0,
    name: (raw?.stepName ?? raw?.name ?? '—') as string,
    stepOrder: raw?.stepOrder,
    status: raw?.status,
  };
}

/**
 * Raw `Ticket.isWaitingFor` is comma-separated (login or ADUser ID per web resolver).
 * First value is enough for HR profile images (numeric ID accepted by spMobile_HR_GetProfileImage).
 */
export function firstAwaitingIdentity(isWaitingFor: unknown): string | undefined {
  if (typeof isWaitingFor !== 'string') return undefined;
  const first = isWaitingFor.split(',')[0]?.trim();
  return first || undefined;
}

/**
 * "Waiting for X — StepName (Type)" for hero + history, matching web context.
 */
export function buildStepWaitLine(ticket: TicketHeaderLike): { who: string; step: string; type: string; line: string } {
  const who =
    (ticket.awaitingUserNames && String(ticket.awaitingUserNames).trim()) ||
    (ticket.assignedToName && String(ticket.assignedToName).trim()) ||
    '';
  const step = (ticket.currentStepName && String(ticket.currentStepName).trim()) || '—';
  const type = (ticket.currentStepTypeName && String(ticket.currentStepTypeName).trim()) || '';
  const line = who
    ? type
      ? `Waiting for ${who} — ${step} (${type})`
      : `Waiting for ${who} — ${step}`
    : type
      ? `${step} (${type})`
      : step;
  return { who, step, type, line };
}

export function attributeAppliesToCurrentStep(
  attr: { workflowTypeId?: number | null },
  currentStepTypeId?: number | null
): boolean {
  if (attr.workflowTypeId == null || attr.workflowTypeId === 0) return true;
  if (currentStepTypeId == null || currentStepTypeId === 0) return true;
  return Number(attr.workflowTypeId) === Number(currentStepTypeId);
}
