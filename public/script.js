const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const loadingIndicator = document.getElementById('loading');
const messageButtons = document.querySelectorAll('.message-button'); // 메시지 내 버튼

// 백엔드 API 엔드포인트 (현재 서버와 같은 호스트, 3000번 포트)
const API_URL = '/api/chat';

// 메시지를 채팅 박스에 표시하는 함수 (수정 없음)
function displayMessage(content, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', `${sender}-message`);
    msgDiv.textContent = content;
    chatBox.appendChild(msgDiv);
    // 스크롤을 항상 맨 아래로 이동
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 메시지를 전송하는 비동기 함수 (수정 없음 - 버튼/입력 모두 처리)
async function sendMessage(messageToSend) {
    // 1. messageToSend 인자가 있는지 확인
    const message = messageToSend ? messageToSend.() : userInput.value.();

    if (message === '') return; // 빈 메시지는 전송하지 않음

    // 2. 사용자 메시지 표시 및 입력창 초기화
    displayMessage(message, 'user');
    userInput.value = '';

    // 로딩 표시기 활성화
    loadingIndicator.style.display = 'block';
    sendButton.disabled = true;
    userInput.disabled = true; 

    try {
        // 3. Node.js 백엔드 API로 메시지 전송
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message }),
        });

        // 4. 응답 처리
        if (!response.ok) {
            throw new Error(`HTTP 오류! 상태 코드: ${response.status}`);
        }

        const data = await response.json();

        // 5. 챗봇 응답 표시
        const botResponse = data.response;
        displayMessage(botResponse, 'bot');

    } catch (error) {
        console.error('채팅 요청 중 오류 발생:', error);
        displayMessage('죄송합니다. 서버와 통신하는 데 문제가 발생했습니다.', 'bot');
    } finally {
        // 6. 로딩 표시기 비활성화 및 버튼/입력창 활성화
        loadingIndicator.style.display = 'none';
        sendButton.disabled = false;
        userInput.disabled = false; 
        userInput.focus(); 
    }
}

// 전송 버튼 클릭 이벤트 리스너
sendButton.addEventListener('click', () => sendMessage());

// Enter 키 누름 이벤트 리스너
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// [삭제됨] 하단 추천 버튼 클릭 이벤트 리스너
// suggestionButtons.forEach(button => { ... });

// [남아있음] 메시지 버블 내 버튼 클릭 이벤트 리스너
messageButtons.forEach(button => {
    button.addEventListener('click', () => {
        // 버튼의 텍스트를 인자로 넘겨 sendMessage 호출
        sendMessage(button.textContent);
    });
});

// 페이지 로드 시 입력창에 포커스
userInput.focus();