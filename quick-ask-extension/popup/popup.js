document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });

    // Translation
    const translateButton = document.getElementById('translate-button');
    translateButton.addEventListener('click', async () => {
        const input = document.getElementById('translation-input').value;
        const resultDiv = document.getElementById('translation-result');

        try {
            resultDiv.textContent = 'Translating...';
            resultDiv.classList.add('loading');
            const result = await window.translationModule.translate(input);
            resultDiv.classList.remove('loading');
            resultDiv.textContent = result;
        } catch (error) {
            resultDiv.textContent = 'Translation failed. Please try again.';
        }
    });

    // Summarization
    const summarizeButton = document.getElementById('summarize-button');
    summarizeButton.addEventListener('click', async () => {
        const input = document.getElementById('summarization-input').value;
        const resultDiv = document.getElementById('summarization-result');

        try {
            resultDiv.textContent = 'Summarizing...';
            resultDiv.classList.add('loading');
            const result = await window.summarizationModule.summarize(input);
            resultDiv.classList.remove('loading');
            resultDiv.textContent = result;
        } catch (error) {
            resultDiv.textContent = 'Summarization failed. Please try again.';
        }
    });

    // Custom Asking
    const promptButtons = document.querySelectorAll('.prompt-button');
    let currentPrompt = '1'; // デフォルトのプロンプト番号

    promptButtons.forEach(button => {
        button.addEventListener('click', () => {
            promptButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentPrompt = button.dataset.prompt;
        });
    });

    // カスタムプロンプトの実行処理を修正
    document.getElementById('ask-button').addEventListener('click', async () => {
        const input = document.getElementById('custom-input').value;
        const resultDiv = document.getElementById('custom-result');

        try {
            resultDiv.textContent = 'Generating...';
            resultDiv.classList.add('loading');

            // 選択されているプロンプトに基づいて処理を実行
            const result = await window.customAskingModule.askQuestion(input, currentPrompt);

            resultDiv.classList.remove('loading');
            resultDiv.textContent = result;
        } catch (error) {
            resultDiv.classList.remove('loading');
            resultDiv.textContent = 'Generation failed. Please try again.';
        }
    });

    document.querySelectorAll('.copy-button').forEach(button => {
        button.addEventListener('click', async () => {
            const resultId = button.dataset.result;
            const resultText = document.getElementById(resultId).textContent;

            try {
                await navigator.clipboard.writeText(resultText);

                // ボタンの表示を変更
                const originalText = button.innerHTML;
                button.classList.add('copied');
                button.innerHTML = `
                    <svg class="copy-icon" viewBox="0 0 24 24" width="16" height="16">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    Copied!
                `;

                // 3秒後に元に戻す
                setTimeout(() => {
                    button.classList.remove('copied');
                    button.innerHTML = originalText;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy text:', err);
            }
        });
    });
});

// エラー表示用の関数
function showError(message) {
    // 既存のエラーポップアップを削除
    const existingError = document.querySelector('.error-popup');
    if (existingError) {
        document.body.removeChild(existingError);
    }

    // エラーポップアップを作成
    const errorPopup = document.createElement('div');
    errorPopup.className = 'error-popup';
    errorPopup.innerHTML = `
        <svg class="error-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span class="error-message">${message}</span>
    `;

    document.body.appendChild(errorPopup);

    // アニメーションのためにタイミングをずらす
    setTimeout(() => {
        errorPopup.classList.add('show');
    }, 10);

    // 5秒後に消去
    setTimeout(() => {
        errorPopup.classList.remove('show');
        setTimeout(() => {
            if (errorPopup.parentNode) {
                document.body.removeChild(errorPopup);
            }
        }, 300);
    }, 5000);
}

document.getElementById('translate-button').addEventListener('click', async () => {
    const input = document.getElementById('translation-input').value;
    const resultDiv = document.getElementById('translation-result');

    try {
        resultDiv.textContent = 'Translating...';
        resultDiv.classList.add('loading');
        const result = await window.translationModule.translate(input);
        resultDiv.classList.remove('loading');
        resultDiv.textContent = result;
    } catch (error) {
        resultDiv.classList.remove('loading');
        resultDiv.textContent = '';
        showError('Translation failed: ' + (error.message || 'Unknown error occurred'));
    }
});

document.getElementById('summarize-button').addEventListener('click', async () => {
    const input = document.getElementById('summarization-input').value;
    const resultDiv = document.getElementById('summarization-result');

    try {
        resultDiv.textContent = 'Summarizing...';
        resultDiv.classList.add('loading');
        const result = await window.summarizationModule.summarize(input);
        resultDiv.classList.remove('loading');
        resultDiv.textContent = result;
    } catch (error) {
        resultDiv.classList.remove('loading');
        resultDiv.textContent = '';
        showError('Summarization failed: ' + (error.message || 'Unknown error occurred'));
    }
});

document.getElementById('ask-button').addEventListener('click', async () => {
    const input = document.getElementById('custom-input').value;
    const resultDiv = document.getElementById('custom-result');
    const currentPrompt = document.querySelector('.prompt-button.active').dataset.prompt;

    try {
        resultDiv.textContent = 'Generating...';
        resultDiv.classList.add('loading');
        const result = await window.customAskingModule.askQuestion(input, currentPrompt);
        resultDiv.classList.remove('loading');
        resultDiv.textContent = result;
    } catch (error) {
        resultDiv.classList.remove('loading');
        resultDiv.textContent = '';
        showError('Generation failed: ' + (error.message || 'Unknown error occurred'));
    }
});
