export interface CompletionMessage {
  id: string;
  text: string;
}

let messageSequence = 0;

export function addCompletionMessage(
  messages: CompletionMessage[],
  text: string,
): CompletionMessage[] {
  messageSequence += 1;
  return [...messages, { id: `completion-${messageSequence}`, text }];
}

export function dismissCompletionMessage(
  messages: CompletionMessage[],
  id: string,
): CompletionMessage[] {
  return messages.filter((message) => message.id !== id);
}

export function completionBadgeCount(messages: CompletionMessage[]) {
  return messages.length;
}
