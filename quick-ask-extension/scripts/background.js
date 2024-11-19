// コンテキストメニューの設定
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        const menuItems = [
            { id: 'quick-ask', title: 'Quick Ask' },
            { id: 'translate', title: 'Translate', parentId: 'quick-ask' },
            { id: 'summarize', title: 'Summarize', parentId: 'quick-ask' },
            { id: 'custom1', title: 'Custom 1', parentId: 'quick-ask' },
            { id: 'custom2', title: 'Custom 2', parentId: 'quick-ask' },
            { id: 'custom3', title: 'Custom 3', parentId: 'quick-ask' }
        ];

        menuItems.forEach(item => {
            chrome.contextMenus.create({
                ...item,
                contexts: ['selection']
            });
        });
    });
});

// コマンドハンドラーの追加
chrome.commands.onCommand.addListener(async (command) => {
    try {
        // 現在アクティブなタブを取得
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        // 選択されているテキストを取得
        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection().toString().trim()
        });

        if (!result) {
            throw new Error('Please select text first');
        }

        // 選択テキストがある場合は処理を実行
        await handleRequest(tab, command, result);
    } catch (error) {
        console.error('Command execution failed:', error);
    }
});

// APIリクエスト
async function makeAPIRequest(text, action) {
    const settings = await chrome.storage.sync.get(null);

    // 設定のバリデーション
    const requiredSettings = ['azureEndpoint', 'apiKey', 'deploymentName', 'apiVersion'];
    const missingSettings = requiredSettings.filter(key => !settings[key]);
    if (missingSettings.length > 0) {
        throw new Error(`Missing required settings: ${missingSettings.join(', ')}`);
    }

    // プロンプトの取得
    const promptMap = {
        translate: settings.translationSystemPrompt,
        summarize: settings.summarizationSystemPrompt,
        custom1: settings.customSystemPrompt1,
        custom2: settings.customSystemPrompt2,
        custom3: settings.customSystemPrompt3
    };

    const systemPrompt = promptMap[action]?.replace('{{target_language}}', settings.targetLanguage);
    if (!systemPrompt) {
        throw new Error('Invalid action or missing prompt configuration');
    }

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

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// CSS
async function injectStyles(tab) {
    await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        css: `
            .quick-ask-popup {
                position: fixed;
                top: 50%;
                right: 20px;
                transform: translateY(-50%);
                display: flex;
                gap: 20px;
                padding: 24px;
                /* より暗めの背景色と高い透明度 */
                background: rgba(30, 41, 59, 0.85);
                backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
                z-index: 2147483647;
                width: 90%;
                max-width: 800px;
                max-height: 80vh;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .quick-ask-popup .section {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-width: 0;
            }

            .quick-ask-popup .title {
                font-size: 0.875rem;
                font-weight: 600;
                /* タイトルの色を明るく */
                color: #94a3b8;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .quick-ask-popup .content {
                /* コンテンツ部分の背景を半透明に */
                background: rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                padding: 16px;
                font-size: 0.875rem;
                line-height: 1.6;
                overflow-y: auto;
                max-height: calc(80vh - 120px);
                white-space: pre-wrap;
                word-break: break-word;
                /* テキストを明るく */
                color: #e2e8f0;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .quick-ask-popup .divider {
                width: 1px;
                background: rgba(255, 255, 255, 0.1);
            }

            .quick-ask-popup .copy-button {
                background: #6366f1;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.75rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 12px;
                align-self: flex-end;
                transition: all 0.2s ease-out;
            }

            .quick-ask-popup .copy-button:hover {
                background: #4f46e5;
                transform: translateY(-1px);
            }

            .quick-ask-popup .close-button {
                position: absolute;
                top: 16px;
                right: 16px;
                width: 28px;
                height: 28px;
                padding: 6px;
                border-radius: 6px;
                background: transparent;
                border: none;
                cursor: pointer;
                /* 閉じるボタンの色を明るく */
                color: #94a3b8;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .quick-ask-popup .close-button:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #e2e8f0;
                transform: scale(1.1);
            }

            .quick-ask-popup.loading .content {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 200px;
            }

            .spinner-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 16px;
            }

            .spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255, 255, 255, 0.1);
                border-top: 3px solid #6366f1;
                border-radius: 50%;
                align-items: center;
                animation: spin 1s linear infinite;
            }

            .loading-text {
                color: #94a3b8;
                font-weight: 500;
                font-size: 0.875rem;
                margin-top: 12px;
                text-align: center;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translate(20px, -50%);
                }
                to {
                    opacity: 1;
                    transform: translate(0, -50%);
                }
            }

            .quick-ask-popup .content::-webkit-scrollbar {
                width: 4px;
            }

            .quick-ask-popup .content::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05);
            }

            .quick-ask-popup .content::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 4px;
            }

            .quick-ask-popup .content::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .quick-ask-popup .copy-button .copy-icon {
                width: 14px;
                height: 14px;
                transition: transform 0.2s ease-out;
            }

            .quick-ask-popup .copy-button:active .copy-icon {
                transform: scale(0.9);
            }

            .quick-ask-popup .copy-button span {
                transition: transform 0.2s ease-out;
            }

.quick-ask-popup .copy-button:active span {
    transform: translateX(2px);
}
        `
    });
}

// UIコンポーネントの作成
async function createPopupUI(tab, selectedText, loadingMessage) {
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text, message) => {
            // 既存のポップアップを削除
            const existingPopup = document.getElementById('quick-ask-popup');
            if (existingPopup) existingPopup.remove();

            // 新しいポップアップを作成
            const popup = document.createElement('div');
            popup.id = 'quick-ask-popup';
            popup.className = 'quick-ask-popup';

            // 閉じるボタン
            const closeButton = document.createElement('button');
            closeButton.className = 'close-button';
            closeButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12"/></svg>';
            closeButton.onclick = () => popup.remove();

            // ESCキーで閉じる
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape' && popup.parentNode) {
                    popup.remove();
                    document.removeEventListener('keydown', escHandler);
                }
            });

            // コンテンツ
            const content = document.createElement('div');
            content.style.display = 'flex';
            content.style.gap = '20px';

            // 入力テキスト
            content.innerHTML = `
                <div class="section">
                    <div class="title">Selected Text</div>
                    <div class="content">${text}</div>
                </div>
                <div class="divider"></div>
                <div class="section">
                    <div class="title">Result</div>
                    <div class="content">
                        <div class="spinner-container">
                            <div class="spinner"></div>
                            <div class="loading-text">${message}</div>
                        </div>
                    </div>
                </div>
            `;

            popup.appendChild(closeButton);
            popup.appendChild(content);
            document.body.appendChild(popup);
        },
        args: [selectedText, loadingMessage]
    });
}

// 結果の更新
async function updateResult(tab, result) {
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text) => {
            const resultSection = document.querySelector('#quick-ask-popup .section:last-child');
            if (!resultSection) return;

            resultSection.innerHTML = `
                <div class="title">Result</div>
                <div class="content">${text}</div>
                <button class="copy-button">
                    <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                    <span>Copy</span>
                </button>
            `;

            // コピーボタンのイベントハンドラー
            const copyButton = resultSection.querySelector('.copy-button');
            copyButton.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(text);

                    // ボタンの見た目を変更
                    copyButton.innerHTML = `
                        <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        <span>Copied!</span>
                    `;
                    copyButton.style.background = '#10B981'; // 成功色に変更

                    // 2秒後に元に戻す
                    setTimeout(() => {
                        copyButton.innerHTML = `
                            <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/>
                            </svg>
                            <span>Copy</span>
                        `;
                        copyButton.style.background = '#6366f1'; // 元の色に戻す
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
            });
        },
        args: [result]
    });
}

// エラー表示
async function showError(tab, error) {
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (errorMessage) => {
            const resultSection = document.querySelector('#quick-ask-popup .section:last-child');
            if (!resultSection) return;

            resultSection.innerHTML = `
                <div class="title" style="color: #dc2626;">Error</div>
                <div class="content" style="color: #dc2626;">${errorMessage}</div>
            `;
        },
        args: [error]
    });
}

// リクエスト処理の共通関数
async function handleRequest(tab, action, selectedText) {
    const loadingMessages = {
        translate: 'Translating...',
        summarize: 'Summarizing...',
        custom1: 'Processing with Custom 1...',
        custom2: 'Processing with Custom 2...',
        custom3: 'Processing with Custom 3...'
    };

    try {
        await injectStyles(tab);
        await createPopupUI(tab, selectedText, loadingMessages[action]);
        const result = await makeAPIRequest(selectedText, action);
        await updateResult(tab, result);
    } catch (error) {
        console.error('Error:', error);
        await showError(tab, error.message);
    }
}

// コンテキストメニューハンドラー
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!info.selectionText?.trim()) return;
    await handleRequest(tab, info.menuItemId, info.selectionText);
});
