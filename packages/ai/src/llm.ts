import Groq from 'groq-sdk';
import { loadAiEnv } from '@search-hub/config-env';

const { GROQ_API_KEY } = loadAiEnv();

const client = new Groq({
    apiKey: GROQ_API_KEY,
});

export type GroqModel = 'llama-3.3-70b-versatile' | 'llama-3.1-8b-instant';

const DEFAULT_GROQ_MODEL: GroqModel = 'llama-3.3-70b-versatile';

interface BaseParams {
    model?: GroqModel;
    temperature?: number;
    maxTokens?: number;
    system?: string;
    timeoutMs?: number;
}

export async function chat({
    prompt,
    model = DEFAULT_GROQ_MODEL,
    temperature = 0.2,
    maxTokens = 600,
    system = 'Answer concisely. Cite sources as [1], [2] when provided.',
    timeoutMs = 15000,
    signal,
}: BaseParams & { prompt: string; signal?: AbortSignal }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const combinedSignal = signal
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal;

    try {
        const res = await client.chat.completions.create(
            {
                model,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: prompt },
                ],
                temperature,
                max_tokens: maxTokens,
            },
            { signal: combinedSignal }
        );
        return res.choices[0]?.message?.content ?? '';
    } finally {
        clearTimeout(timer);
    }
}

// Streaming variant as an async generator
export async function* streamChat(params: BaseParams & { prompt: string }) {
    const {
        model = DEFAULT_GROQ_MODEL,
        temperature = 0.2,
        maxTokens = 600,
        system,
    } = params;
    const stream = await client.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: system ?? 'Answer concisely.' },
            { role: 'user', content: params.prompt },
        ],
        temperature,
        max_tokens: maxTokens,
        stream: true,
    });
    for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield delta;
    }
}
