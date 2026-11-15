/** What the journal needs from an AI provider, independent of the vendor. */

export interface TranscribeInput {
  audio: Uint8Array;
  mimeType: string;
  /** File name with the right extension; some APIs infer the format from it. */
  filename: string;
  /** Names and technical terms that are likely to come up (improves accuracy). */
  prompt?: string;
}

export interface Transcriber {
  /** Registry id, e.g. "openai". */
  readonly provider: string;
  /** Human-readable provider name, e.g. "OpenAI". */
  readonly label: string;
  readonly model: string;
  transcribe(input: TranscribeInput): Promise<string>;
}

export interface JsonRequest {
  system: string;
  user: string;
  /** Short identifier for the output shape (some APIs require one). */
  schemaName: string;
  /** JSON Schema: every property required, additionalProperties false, no length limits. */
  schema: Record<string, unknown>;
  maxTokens: number;
}

export interface JsonWriter {
  readonly provider: string;
  readonly label: string;
  readonly model: string;
  /** Returns the parsed JSON. The caller still validates it: model output is untrusted. */
  generateJson(request: JsonRequest): Promise<unknown>;
}
