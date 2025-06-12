const messageForm = document.querySelector(".prompt__form");
const chatHistoryContainer = document.querySelector(".chats");
const suggestionItems = document.querySelectorAll(".suggests__item");
const themeToggleButton = document.getElementById("themeToggler");
const clearChatButton = document.getElementById("deleteButton");
const newChatBtn = document.getElementById("newChatBtn");
const chatHistoryList = document.getElementById("chatHistoryList");
const homeBtn = document.getElementById("homeBtn");

let isGeneratingResponse = false;
let currentUserMessage = null;

// --- Chat state ---
let chatHistory = JSON.parse(localStorage.getItem("chat-history")) || [];
let currentChat = JSON.parse(localStorage.getItem("current-chat")) || [];

// --- Utility functions ---
function saveChatHistory() {
    localStorage.setItem("chat-history", JSON.stringify(chatHistory));
}
function saveCurrentChat() {
    localStorage.setItem("current-chat", JSON.stringify(currentChat));
}

// --- Render chat history in sidebar ---
function renderChatHistory() {
    chatHistoryList.innerHTML = "";
    chatHistory.forEach((chat, idx) => {
        const li = document.createElement("li");
        li.textContent = chat.title || `Czat ${idx + 1}`;
        li.onclick = () => loadChat(idx);
        chatHistoryList.appendChild(li);
    });
}

// --- Load a chat from history ---
function loadChat(idx) {
    const chat = chatHistory[idx];
    if (!chat) return;
    currentChat = [...chat.messages]; // Use a copy to avoid reference issues
    saveCurrentChat();
    chatInHistory = true; // <-- Add this line!
    renderCurrentChat();
}

// --- Render current chat in main window ---
function renderCurrentChat() {
    chatHistoryContainer.innerHTML = "";
    if (!currentChat || currentChat.length === 0) return; // <-- Add this line
    currentChat.forEach(conversation => {
        // User message
        const userMessageHtml = `
            <div class="message__content">
                <img class="message__avatar" src="assets/profile.png" alt="User avatar">
                <p class="message__text">${conversation.userMessage}</p>
            </div>
        `;
        const outgoingMessageElement = createChatMessageElement(userMessageHtml, "message--outgoing");
        chatHistoryContainer.appendChild(outgoingMessageElement);

        // Bot response
        if (conversation.apiResponse) {
            const responseText = conversation.apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const parsedApiResponse = marked.parse(responseText);
            const responseHtml = `
                <div class="message__content">
                    <img class="message__avatar" src="/gemini.svg" alt="Gemini avatar">
                    <p class="message__text"></p>
                    <div class="message__loading-indicator hide">
                        <div class="message__loading-bar"></div>
                        <div class="message__loading-bar"></div>
                        <div class="message__loading-bar"></div>
                    </div>
                </div>
                <span onClick="copyMessageToClipboard(this)" class="message__icon hide"><i class='bx bx-copy-alt'></i></span>
            `;
            const incomingMessageElement = createChatMessageElement(responseHtml, "message--incoming");
            chatHistoryContainer.appendChild(incomingMessageElement);
            const messageTextElement = incomingMessageElement.querySelector(".message__text");
            showTypingEffect(responseText, parsedApiResponse, messageTextElement, incomingMessageElement, true);
        }
    });
    chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
}

// --- Create a new chat message element ---
function createChatMessageElement(htmlContent, ...cssClasses) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", ...cssClasses);
    messageElement.innerHTML = htmlContent;
    return messageElement;
}

// --- Show typing effect (unchanged) ---
function showTypingEffect(rawText, htmlText, messageElement, incomingMessageElement, skipEffect = false) {
    const copyIconElement = incomingMessageElement.querySelector(".message__icon");
    copyIconElement.classList.add("hide");
    if (skipEffect) {
        messageElement.innerHTML = htmlText;
        hljs.highlightAll();
        addCopyButtonToCodeBlocks();
        copyIconElement.classList.remove("hide");
        isGeneratingResponse = false;
        chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
        return;
    }
    const wordsArray = rawText.split(' ');
    let wordIndex = 0;
    const typingInterval = setInterval(() => {
        messageElement.innerText += (wordIndex === 0 ? '' : ' ') + wordsArray[wordIndex++];
        if (wordIndex === wordsArray.length) {
            clearInterval(typingInterval);
            isGeneratingResponse = false;
            messageElement.innerHTML = htmlText;
            hljs.highlightAll();
            addCopyButtonToCodeBlocks();
            copyIconElement.classList.remove("hide");
            chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
        }
    }, 75);
}

// --- Add copy button to code blocks (unchanged) ---
function addCopyButtonToCodeBlocks() {
    const codeBlocks = document.querySelectorAll('pre');
    codeBlocks.forEach((block) => {
        const codeElement = block.querySelector('code');
        let language = [...codeElement.classList].find(cls => cls.startsWith('language-'))?.replace('language-', '') || 'Text';
        const languageLabel = document.createElement('div');
        languageLabel.innerText = language.charAt(0).toUpperCase() + language.slice(1);
        languageLabel.classList.add('code__language-label');
        block.appendChild(languageLabel);
        const copyButton = document.createElement('button');
        copyButton.innerHTML = `<i class='bx bx-copy'></i>`;
        copyButton.classList.add('code__copy-btn');
        block.appendChild(copyButton);
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(codeElement.innerText).then(() => {
                copyButton.innerHTML = `<i class='bx bx-check'></i>`;
                setTimeout(() => copyButton.innerHTML = `<i class='bx bx-copy'></i>`, 2000);
            }).catch(err => {
                console.error("Copy failed:", err);
                alert("Unable to copy text!");
            });
        });
    });
}

// --- Copy message to clipboard (unchanged) ---
function copyMessageToClipboard(copyButton) {
    const messageContent = copyButton.parentElement.querySelector(".message__text").innerText;
    navigator.clipboard.writeText(messageContent);
    copyButton.innerHTML = `<i class='bx bx-check'></i>`;
    setTimeout(() => copyButton.innerHTML = `<i class='bx bx-copy-alt'></i>`, 1000);
}

// --- Handle sending chat messages ---
let chatInHistory = false; // Add this at the top of your script

function handleOutgoingMessage() {
    currentUserMessage = messageForm.querySelector(".prompt__form-input").value.trim() || currentUserMessage;
    if (!currentUserMessage || isGeneratingResponse) return;
    isGeneratingResponse = true;
    const outgoingMessageHtml = `
        <div class="message__content">
            <img class="message__avatar" src="assets/profile.png" alt="User avatar">
            <p class="message__text"></p>
        </div>
    `;
    const outgoingMessageElement = createChatMessageElement(outgoingMessageHtml, "message--outgoing");
    outgoingMessageElement.querySelector(".message__text").innerText = currentUserMessage;
    chatHistoryContainer.appendChild(outgoingMessageElement);

    // --- Add user message to currentChat ---
    currentChat.push({ userMessage: currentUserMessage });
    saveCurrentChat();

    // --- Add to history only if this is the first message in a new chat ---

    messageForm.reset();
    document.body.classList.add("hide-header");
    setTimeout(() => displayLoadingAnimation(), 500);
}

// --- Show loading animation during API request ---
function displayLoadingAnimation() {
    const loadingHtml = `
        <div class="message__content">
            <img class="message__avatar" src="/gemini.svg" alt="Gemini avatar">
            <p class="message__text"></p>
            <div class="message__loading-indicator">
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
            </div>
        </div>
        <span onClick="copyMessageToClipboard(this)" class="message__icon hide"><i class='bx bx-copy-alt'></i></span>
    `;
    const loadingMessageElement = createChatMessageElement(loadingHtml, "message--incoming", "message--loading");
    chatHistoryContainer.appendChild(loadingMessageElement);
    requestApiResponse(loadingMessageElement);
}

// --- Fetch API response based on user input ---
const GOOGLE_API_KEY = "AIzaSyCRnw9H2PE_HrXyN4yAgL_DuKCVdj6d4kA";
const API_REQUEST_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`;

async function requestApiResponse(incomingMessageElement) {
    const messageTextElement = incomingMessageElement.querySelector(".message__text");
    try {
        const response = await fetch(API_REQUEST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: "Ur name is Aurora AI (He/him) trained by Google, and programmed by Adrian"}] },
                    ...currentChat.flatMap(msg => [
                        { role: "user", parts: [{ text: msg.userMessage }] },
                        msg.apiResponse
                            ? { role: "model", parts: [{ text: msg.apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || "" }] }
                            : null
                    ]).filter(Boolean),
                    { role: "user", parts: [{ text: currentUserMessage }] }
                ]
            }),
        });
        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error.message);
        const responseText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) throw new Error("Invalid API response.");
        const parsedApiResponse = marked.parse(responseText);
        const rawApiResponse = responseText;

        showTypingEffect(rawApiResponse, parsedApiResponse, messageTextElement, incomingMessageElement);

        // --- Save bot response to last user message in currentChat ---
        currentChat[currentChat.length - 1].apiResponse = responseData;
        saveCurrentChat();

        // --- Add or update history for the current chat ---
        if (!chatInHistory) {
            // First exchange: add to history
            chatHistory.unshift({
                title: currentChat[0]?.userMessage?.slice(0, 20) || "Nowy czat",
                messages: [...currentChat]
            });
            chatInHistory = true;
        } else {
            // Ongoing chat: update the latest history entry
            chatHistory[0].messages = [...currentChat];
        }
        saveChatHistory();
        renderChatHistory();

    } catch (error) {
        isGeneratingResponse = false;
        messageTextElement.innerText = error.message;
        messageTextElement.closest(".message").classList.add("message--error");
    } finally {
        incomingMessageElement.classList.remove("message--loading");
    }
}

// --- Theme toggle, clear, suggestions, form submit (unchanged) ---
themeToggleButton.addEventListener('click', () => {
    const isLightTheme = document.body.classList.toggle("light_mode");
    localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
    const newIconClass = isLightTheme ? "bx bx-moon" : "bx bx-sun";
    themeToggleButton.querySelector("i").className = newIconClass;
});

clearChatButton.addEventListener('click', () => {
    if (confirm("Jesteś pewny żeby usunąć wszystkie historie czatów?")) {
        localStorage.removeItem("current-chat");
        localStorage.removeItem("chat-history");
        chatHistory = [];
        currentChat = [];
        currentUserMessage = null; // <-- Reset user message
        chatHistoryContainer.innerHTML = "";
        renderChatHistory();
        location.reload(); // <-- Optional: reload for a full reset
    }
});

suggestionItems.forEach(suggestion => {
    suggestion.addEventListener('click', () => {
        currentUserMessage = suggestion.querySelector(".suggests__item-text").innerText;
        handleOutgoingMessage();
    });
});

messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleOutgoingMessage();
});

// --- On page load ---
const justStartedNewChat = localStorage.getItem("just-started-new-chat") === "true";
if (!justStartedNewChat && currentChat && currentChat.length > 0) {
    renderCurrentChat();
} else if (justStartedNewChat) {
    currentChat = [];
    saveCurrentChat();
}
renderChatHistory();
localStorage.removeItem("just-started-new-chat");

if (homeBtn) {
    homeBtn.addEventListener('click', () => {
        currentChat = [];
        saveCurrentChat();
        localStorage.setItem("just-started-new-chat", "true");
        location.reload();
    });
}

function getCurrentChat() {
    return JSON.parse(localStorage.getItem("current-chat")) || [];
}
function getChatHistory() {
    return JSON.parse(localStorage.getItem("chat-history")) || [];
}

// --- Settings Modal Logic ---
const settingsBtn = document.getElementById("settingsBtn"); // Make sure your button has this ID
const settingsModal = document.getElementById("settingsModal");
const closeSettingsModal = document.getElementById("closeSettingsModal");
const toggleThemeBtn = document.getElementById("toggleThemeBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener("click", () => {
        settingsModal.classList.remove("hide");
    });
}
if (closeSettingsModal) {
    closeSettingsModal.addEventListener("click", () => {
        settingsModal.classList.add("hide");
    });
}
if (toggleThemeBtn) {
    toggleThemeBtn.addEventListener("click", () => {
        themeToggleButton.click();
    });
}
if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", () => {
        clearChatButton.click();
        settingsModal.classList.add("hide");
    });
}

// Optional: close modal when clicking outside content
if (settingsModal) {
    settingsModal.addEventListener("click", (e) => {
        if (e.target === settingsModal) settingsModal.classList.add("hide");
    });
}
