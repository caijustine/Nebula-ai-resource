// ─── chat.ts — TypeScript types for the chat feature ─────────────────────────
// TypeScript "interfaces" describe the shape of objects — what fields they have
// and what type each field is. If you accidentally use the wrong field name,
// TypeScript will show a red underline immediately in your editor.

export interface ChatMessage {
  role: 'user' | 'assistant'  // only these two values are allowed
  content: string
}
