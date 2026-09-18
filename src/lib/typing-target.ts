/** Whether the element takes typed text: a field, a select or an editable region. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || target.matches('input, textarea, select');
}
