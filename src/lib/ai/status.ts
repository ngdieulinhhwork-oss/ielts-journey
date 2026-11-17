export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
