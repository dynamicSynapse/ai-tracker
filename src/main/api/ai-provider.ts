import { getSetting } from '../db/queries';

export type AIProvider = 'fireworks' | 'openai' | 'google' | 'anthropic';

export async function generateCompletion(systemPrompt: string, userPrompt: string, customModel?: string): Promise<string> {
    const provider = (getSetting('ai_provider') as AIProvider) || 'fireworks';

    switch (provider) {
        case 'fireworks':
            return runOpenAICompatible('https://api.fireworks.ai/inference/v1/chat/completions', 'fireworks_api_key', 'fireworks_model', 'accounts/fireworks/models/llama-v3p3-70b-instruct', systemPrompt, userPrompt, customModel);
        case 'openai':
            return runOpenAICompatible('https://api.openai.com/v1/chat/completions', 'openai_api_key', 'openai_model', 'gpt-4o-mini', systemPrompt, userPrompt, customModel);
        case 'google':
            return runGoogleGemini(systemPrompt, userPrompt, customModel);
        case 'anthropic':
            return runAnthropic(systemPrompt, userPrompt, customModel);
        default:
            throw new Error(`Unknown AI Provider: ${provider}`);
    }
}

async function runOpenAICompatible(url: string, keySetting: string, modelSetting: string, defaultModel: string, systemPrompt: string, userPrompt: string, customModel?: string): Promise<string> {
    const apiKey = getSetting(keySetting);
    if (!apiKey) throw new Error(`Missing API Key for ${keySetting}`);

    const model = customModel || getSetting(modelSetting) || defaultModel;

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`API Error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as any;
    if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from API');
    }

    return data.choices[0].message.content;
}

async function runGoogleGemini(systemPrompt: string, userPrompt: string, customModel?: string): Promise<string> {
    const apiKey = getSetting('google_api_key');
    if (!apiKey) throw new Error('Missing API Key for Google Gemini');

    const model = customModel || getSetting('google_model') || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            contents: [{
                role: 'user',
                parts: [{ text: userPrompt }]
            }]
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Google API Error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as any;
    return data.candidates[0].content.parts[0].text;
}

async function runAnthropic(systemPrompt: string, userPrompt: string, customModel?: string): Promise<string> {
    const apiKey = getSetting('anthropic_api_key');
    if (!apiKey) throw new Error('Missing API Key for Anthropic');

    const model = customModel || getSetting('anthropic_model') || 'claude-3-5-sonnet-20241022';

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userPrompt }
            ]
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Anthropic API Error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as any;
    return data.content[0].text;
}
