class SummarizationModule {
    async summarize(text) {
        try {
            const settings = await new Promise(resolve => {
                chrome.storage.sync.get(null, resolve);
            });

            let systemPrompt = settings.summarizationSystemPrompt;
            systemPrompt = systemPrompt.replace(
                '{{target_language}}',
                settings.targetLanguage
            );

            const response = await fetch(
                `${settings.azureEndpoint}/openai/deployments/${settings.deploymentName}/chat/completions?api-version=${settings.apiVersion}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': settings.apiKey
                    },
                    body: JSON.stringify({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: text }
                        ]
                    })
                }
            );

            if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Summarization error:', error);
            throw error;
        }
    }
}

window.summarizationModule = new SummarizationModule();
