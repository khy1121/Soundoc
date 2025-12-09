import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { DiagnosisResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// RAG 시뮬레이션을 위한 가상 매뉴얼 컨텍스트
const MANUAL_CONTEXT = `
[삼성전자 에어컨 서비스 매뉴얼 발췌]
1. 에러 코드 E1: 실내기 온도 센서 불량. 센서 연결 잭 확인 필요. 저항값 10k옴 확인.
2. 에러 코드 E4 / 냉방 불량: 실외기 팬 동작 확인. 컴프레서 기동 커패시터 점검 필요.
3. 소음 유형 A (웅웅): 컴프레서 동작음. 정상 범주이나 진동 방지 고무 노후화 시 커질 수 있음.
4. 소음 유형 B (끼익끼익): 송풍 팬 베어링 오일 부족 또는 축 마모. 구리스 도포 또는 모터 교체 권장.
5. 소음 유형 C (달그락): 필터가 제대로 장착되지 않아 발생하는 떨림음. 필터 커버 재조립 필요.
6. 냄새 (시큼한 냄새): 열교환기 곰팡이 발생. 자동청소 기능 활성화 또는 전문 세척 필요.

[LG 세탁기 서비스 매뉴얼 발췌]
1. 탈수 시 덜컹거림: 수평 맞춤 불량. 수평계로 확인 후 다리 높이 조절.
2. 배수 안 됨 (OE 에러): 배수 필터 막힘. 하단 서비스 커버 열고 잔수 제거 후 필터 청소.
3. 급수 안 됨 (IE 에러): 수도꼭지 잠김 또는 급수 호스 필터 막힘. 거름망 청소 필요.
4. 문 안 열림: 내부 온도 높음 또는 수위 높음 감지. 강제 개방 금지. 배수 후 5분 대기.
`;

const SYSTEM_INSTRUCTION = `
당신은 가전제품 수리 전문가 AI "Fix It Now"입니다.
당신의 목표는 가전제품의 고장 소음(오디오), 이미지(사진), 또는 증상 설명(텍스트)을 분석하는 것입니다.

반드시 아래 제공된 [매뉴얼 컨텍스트]를 최우선으로 참고하여 답변하십시오. 이 컨텍스트에 없는 내용이라도 일반적인 수리 지식을 활용해 답변하되, 컨텍스트에 있는 내용은 구체적으로 인용해야 합니다.

[매뉴얼 컨텍스트]
${MANUAL_CONTEXT}

문제를 식별할 때:
1. 가전제품의 종류를 파악하십시오.
2. 구체적인 기계적 또는 전기적 결함을 진단하십시오.
3. 입력의 명확성에 따라 확률(%)을 할당하십시오.
4. 명확한 단계별 수리 가이드를 제공하십시오.
5. [매뉴얼 컨텍스트]를 참고했다면 "서비스 매뉴얼 참고"라고 명시하십시오.

전문적이고 안심할 수 있는, 안전을 최우선으로 하는 어조를 유지하십시오. 작업을 시작하기 전에 항상 전원을 차단하도록 조언하십시오.
모든 응답(JSON 값 포함)은 반드시 **한국어**로 작성되어야 합니다.
`;

const DIAGNOSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    appliance: { type: Type.STRING, description: "감지된 가전제품 종류 (예: 세탁기, 에어컨)" },
    issue: { type: Type.STRING, description: "문제의 기술적 명칭 (예: 배수 펌프 고장)" },
    probability: { type: Type.NUMBER, description: "신뢰도 점수 (0~100)" },
    description: { type: Type.STRING, description: "이 소리나 증상이 발생하는 원인에 대한 사용자 친화적인 설명" },
    manualReference: { type: Type.STRING, description: "참고한 매뉴얼 또는 일반 지식 출처" },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.NUMBER },
          instruction: { type: Type.STRING, description: "짧은 행동 지침 제목" },
          detail: { type: Type.STRING, description: "구체적인 행동 설명" },
        },
      },
    },
  },
  required: ["appliance", "issue", "probability", "description", "manualReference", "steps"],
};

export const analyzeProblem = async (
  audioBase64: string | null,
  imageBase64: string | null,
  textDescription: string
): Promise<DiagnosisResult> => {
  try {
    const parts: any[] = [];

    if (audioBase64) {
      parts.push({
        inlineData: {
          mimeType: "audio/mp3",
          data: audioBase64,
        },
      });
      parts.push({ text: "이 오디오 소음을 분석해 주세요." });
    }

    if (imageBase64) {
       parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      });
      parts.push({ text: "이 사진의 상태(에러 코드, 파손 부위 등)를 분석해 주세요." });
    }

    if (textDescription) {
       parts.push({
        text: `추가 증상 설명: ${textDescription}`,
      });
    }

    if (parts.length === 0) {
        throw new Error("No input provided");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: DIAGNOSIS_SCHEMA,
      },
    });

    if (!response.text) {
      throw new Error("No response generated");
    }

    const result = JSON.parse(response.text) as DiagnosisResult;
    result.id = Date.now().toString();
    result.timestamp = Date.now();
    
    if (imageBase64) {
        result.imageUrl = `data:image/jpeg;base64,${imageBase64}`;
    }

    return result;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const getChatResponse = async (history: { role: string; parts: { text: string }[] }[], newMessage: string) => {
  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + " 당신은 이제 사용자가 이전에 진단받은 문제에 대해 돕는 후속 채팅 모드입니다. 한국어로 답변하세요.",
    },
    history: history,
  });

  const response = await chat.sendMessage({ message: newMessage });
  return response.text;
};

export const getChatResponseStream = async (history: { role: string; parts: { text: string }[] }[], newMessage: string) => {
  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + " 당신은 이제 사용자가 이전에 진단받은 문제에 대해 돕는 후속 채팅 모드입니다. 한국어로 답변하세요.",
    },
    history: history,
  });

  const streamResult = await chat.sendMessageStream({ message: newMessage });
  return streamResult;
};

export const findServiceCenters = async (appliance: string, lat: number, lng: number) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find official service centers for ${appliance} near the provided location. Provide a brief summary of the nearest center including name and phone number if available.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      },
    });
    return response.text;
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return "서비스 센터 정보를 불러오는 중 오류가 발생했습니다. (Google Maps Tool Error)";
  }
};