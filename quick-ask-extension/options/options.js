const defaultSettings = {
    api: {
        azureEndpoint: '',
        apiKey: '',
        apiVersion: '2024-08-01-preview',
        deploymentName: ''
    },
    general: {
        targetLanguage: 'Japanese'
    },
    translation: {
        translationSystemPrompt: 'You are a translator. Translate the following text to {{target_language}}. Only respond with the translation, no explanation needed.'
    },
    summarization: {
        summarizationSystemPrompt: 'Your are a summarizer. Summarize the following text in {{target_language}}. Only respond with the summary, no explanation needed.',
    },
    custom1: {
        customSystemPrompt1: 'Tell me a funny joke about the following text in {{target_language}}. Only respond with the joke, no explanation needed.'
    },
    custom2: {
        customSystemPrompt2: 'Tell me a black joke about the following text in {{target_language}}. Only respond with the joke, no explanation needed.'
    },
    custom3: {
        customSystemPrompt3: 'Create a haiku about the following text in {{target_language}}. Only respond with the haiku, no explanation needed.'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Load saved settings or set defaults
    chrome.storage.sync.get(null, (items) => {
        // 最初に全てのデフォルト値をストレージに保存
        const initialSettings = {};
        Object.entries(defaultSettings).forEach(([section, sectionDefaults]) => {
            Object.entries(sectionDefaults).forEach(([key, defaultValue]) => {
                if (!items[key]) {
                    initialSettings[key] = defaultValue;
                }
            });
        });

        if (Object.keys(initialSettings).length > 0) {
            chrome.storage.sync.set(initialSettings);
        }

        // UI要素を更新
        Object.entries(defaultSettings).forEach(([section, sectionDefaults]) => {
            Object.entries(sectionDefaults).forEach(([key, defaultValue]) => {
                let elementId = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                // customSystemPromptXの場合の特別な処理
                if (key.startsWith('customSystemPrompt')) {
                    elementId = `custom-system-prompt-${key.slice(-1)}`;
                }
                const element = document.getElementById(elementId);
                if (element) {
                    element.value = items[key] || defaultValue;
                }
            });
        });
    });

    // Reset section handler
    document.querySelectorAll('.reset-button').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.dataset.section;
            const sectionDefaults = defaultSettings[section];

            if (sectionDefaults) {
                const updateData = {};
                Object.entries(sectionDefaults).forEach(([key, value]) => {
                    let elementId = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                    // customSystemPromptXの場合の特別な処理
                    if (key.startsWith('customSystemPrompt')) {
                        elementId = `custom-system-prompt-${key.slice(-1)}`;
                    }
                    const element = document.getElementById(elementId);

                    if (element) {
                        element.value = value;
                        updateData[key] = value;
                    }
                });

                chrome.storage.sync.set(updateData, () => {
                    showStatus(`${section} settings reset to default!`);
                });
            }
        });
    });

    // Save all settings
    document.querySelector('#save-button').addEventListener('click', () => {
        const settings = {};
        Object.values(defaultSettings).forEach(sectionData => {
            Object.keys(sectionData).forEach(key => {
                const element = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
                if (element) {
                    settings[key] = element.value;
                }
            });
        });

        chrome.storage.sync.set(settings, () => {
            showStatus('Settings saved successfully!');
        });
    });
});

function showStatus(message, isError = false) {
    const existingPopup = document.querySelector('.popup-message');
    if (existingPopup) {
        document.body.removeChild(existingPopup);
    }

    const popup = document.createElement('div');
    popup.className = `popup-message ${isError ? 'error' : 'success'}`;
    popup.textContent = message;
    document.body.appendChild(popup);

    setTimeout(() => {
        popup.classList.add('show');
    }, 10);

    setTimeout(() => {
        popup.classList.remove('show');
        setTimeout(() => {
            if (popup.parentNode) {
                document.body.removeChild(popup);
            }
        }, 300);
    }, 3000);
}
