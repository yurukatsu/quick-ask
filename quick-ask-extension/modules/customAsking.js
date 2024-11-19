class CustomAskingModule {
    async askQuestion(text, promptNumber) {
        try {
            const settings = await new Promise(resolve => {
                chrome.storage.sync.get(null, resolve);
            });

            const promptKey = `customSystemPrompt${promptNumber}`;
            const systemPrompt = settings[promptKey].replace('{{target_language}}', settings.targetLanguage);

            const endpoint = `${settings.azureEndpoint}/openai/deployments/${settings.deploymentName}/chat/completions?api-version=${settings.apiVersion}`;

            const response = await fetch(endpoint, {
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
            });

            if (!response.ok) throw new Error('API request failed');
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Custom asking error:', error);
            throw error;
        }
    }
}

window.customAskingModule = new CustomAskingModule();
