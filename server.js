require('dotenv').config(); 
const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000;

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,  // .env 파일에서 API 키 로드
});

let academicEmbeddings = [];

function dotProduct(vecA, vecB) {
    return vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
}

async function initializeAcademicData() {
    try {
        console.log("학사 정보 임베딩을 시작합니다...");

        const dataPath = path.join(__dirname, 'data', 'academics.txt');
        const fileContent = fs.readFileSync(dataPath, 'utf-8');

        const chunks = fileContent.split('---')
        .map(c => c.trim())
        .filter(c => c.length > 0 && !c.startsWith('문서'));

        console.log(`총 ${chunks.length}개의 청크를 임베딩합니다...`);

        const embeddingContents = chunks.map(text => ({ 
            role: "user", 
            parts: [{ text: text }] 
        }));

        const embeddingResponse = await ai.models.embedContent({
                model: "text-embedding-004",
                contents: embeddingContents
                //requests: chunks.map(text => ({ content: text }))
        });

        academicEmbeddings = embeddingResponse.embeddings.map((vector, index) => ({
            text: chunks[index],
            embedding: vector
        }));

        console.log("학사 정보 임베딩이 완료되었습니다.");
    } catch (error) {
        console.error("학사 정보 임베딩 중 오류 발생:", error);
    }
}



// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gemini 클라이언트 초기화

app.post('/api/chat', async (req, res) => {
    // history를 받음 (프론트엔드에서 보낸 이전 대화 기록)
    const { message, history } = req.body; 
    
    if (!message || academicEmbeddings.length === 0) {
        return res.status(400).json({ error: "메시지 또는 임베딩 데이터가 없습니다." });
    }

    try {
        // 1. 사용자 질문 임베딩 생성
        const questionEmbeddingResponse = await ai.models.embedContent({
            model: "text-embedding-004",
            contents: [message], 
        });
        const questionVector = questionEmbeddingResponse.embedding.values[0]; // 첫 번째 (유일한) 벡터를 가져옴

        // 2. 가장 관련 있는 문서 청크 검색 
        const similarities = academicEmbeddings.map(doc => ({
            text: doc.text, 
            similarity: dotProduct(questionVector, doc.embedding)
        }));

        similarities.sort((a, b) => b.similarity - a.similarity);
        const relevantDocs = similarities.slice(0, 2);

        const context = relevantDocs.map(doc => `[문서] ${doc.text}`).join('\n---\n');

        // 3. 프롬프트 구성 (System Instruction + RAG Context + 대화 기록)

        const systemInstruction = `당신은 친절하고 전문적인 **[우석대학교] 학사 정보 도우미**입니다. 사용자의 질문에 답변할 때, 반드시 제공된 '참고 문서'를 기반으로 답변해야 합니다. 만약 참고 문서에 답변이 없다면, "관련 정보를 찾을 수 없습니다."라고 응답하세요.`;
        
        // 현재 사용자 질문에 RAG Context를 추가합니다.
        const ragUserPrompt = `사용자 질문: "${message}"\n\n--- 참고 문서 ---\n${context}`;
        
        // 4. Gemini 모델 호출을 위한 contents 배열 구성 (대화 연속성 구현)
        const contents = [
            // 이전 대화 기록 (history) 추가
            ...(history || []), 
            // 현재 사용자 질문 + RAG Context 추가
            { 
                role: "user", 
                parts: [{ text: ragUserPrompt }] 
            }
        ];

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            config: {
                systemInstruction: systemInstruction,
            },
            contents: contents // 👈 history와 현재 질문이 포함된 최종 배열
        });

        // 챗봇 응답에서 텍스트 추출
        const botResponse = response.text;
        res.json({ response: botResponse });

    } catch (error) {
        console.error("❌ Gemini API 호출 중 오류 발생:", error);
        res.status(500).json({ error: "서버에서 오류가 발생했습니다." });
    }
});

// 서버 실행
app.listen(port, () => {
    console.log(`Windows 개발 서버가 http://localhost:${port} 에서 실행 중입니다.`);
    initializeAcademicData();
});