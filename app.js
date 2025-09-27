// public/app.js (예시)
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const chatBox = document.getElementById('chat-box');
const API_URL = 'http://211.37.87.60:5000/'; // 백엔드 서버 주소

// 메시지를 채팅 박스에 추가하는 함수
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    messageDiv.textContent = text;
    chatBox.appendChild(messageDiv);
    // 스크롤을 항상 최하단으로 이동
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 폼 제출 이벤트 핸들러
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userMessage = messageInput.value.trim();
    if (!userMessage) return;

    // 1. 사용자 메시지 표시
    addMessage(userMessage, 'user');
    messageInput.value = ''; // 입력창 비우기

    try {
        // 2. 백엔드 API 호출
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: userMessage }),
        });

        if (!response.ok) {
            throw new Error(`HTTP 오류! 상태: ${response.status}`);
        }

        const data = await response.json();
        const botResponse = data.response;

        // 3. 챗봇 응답 표시
        addMessage(botResponse, 'bot');

    } catch (error) {
        console.error('챗봇 응답을 가져오는 중 오류 발생:', error);
        addMessage('죄송합니다. 챗봇과 통신하는 중 오류가 발생했습니다.', 'bot');
    }
});