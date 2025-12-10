import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { DiagnosisResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// RAG 시뮬레이션을 위한 실제 가전제품 서비스 매뉴얼 통합 데이터베이스
const MANUAL_CONTEXT = `
[삼성전자 에어컨 (벽걸이/스탠드/시스템) 문제 해결 가이드]
1. 통신 및 센서 에러
- E101 / E201: 실내기-실외기 간 통신 에러. 전원 차단기 내렸다가 3분 후 다시 올려서 리셋 필요. 전선 연결 상태 확인.
- C1 / C4 / C5: 실내기 온도 센서(배관, 흡입) 점검 필요. 센서 저항값 이탈 시 교체.
- E4 / E4xx: 실외기 과부하 보호 제어 또는 냉매 부족 신호. 실외기실 환기 상태 확인 필수 (루버창 개방).

2. 소음 진단
- 뚜둑/틱틱 소리: 냉방 운전 시 플라스틱 케이스가 온도차로 수축/팽창하며 나는 소리 (정상).
- 물 흐르는 소리 (졸졸/쉬익): 배관 내부로 냉매 가스가 순환할 때 나는 소리 (정상).
- 웅~ 하는 저음: 실외기 컴프레서 가동 소리. 진동이 심하면 수평 상태 및 고무발(방진구) 노후화 확인.
- 바람 소리 (휘오오): 필터가 먼지로 막혀 공기 흡입이 원활하지 않을 때 발생. 필터 청소 필요.

3. 성능 문제
- 냉방 약함: 먼지 필터 청소 상태 확인. 실외기실 환기창(갤러리) 개방 여부 확인. 희망온도 18도 설정 후 10분 가동 테스트.
- 냄새 (시큼/걸레 냄새): 열교환기에 배인 냄새. '청정' 또는 '송풍' 모드로 1시간 이상 건조 필요. 시중의 구연산 희석액(물 10:구연산 1)을 열교환기에 뿌리고 20분 후 환기 권장.

[LG전자 에어컨 (휘센) 서비스 매뉴얼]
1. 에러 코드 (CH: Check)
- CH05: 실내-실외기 통신 불량. 전원 코드 재연결 또는 차단기 리셋 필요.
- CH38: 냉매 부족 감지. 배관 누설 점검 및 가스 충전 필요.
- CH61: 실외기 열교환기 온도 과열. 실외기실 환기 불량 또는 팬 모터 고장 의심.
- CH90 / CH91: 시운전 모드 진행 중. 정상적인 설치 과정임.

2. 스마트 진단
- 스마트케어 버튼 5초 이상 누름: 자동 진단 모드 진입. 
- 필터 클린봇 에러: 먼지통 비움 확인 및 장착 상태 점검.

[삼성전자 세탁기 (그랑데/버블샷/통돌이) 매뉴얼]
1. 급수/배수 에러
- 4C / 4E (Water Supply): 급수 안 됨. 수도꼭지 열림 확인. 급수 호스 연결부위 거름망 필터 녹/이물질 청소. 겨울철 결빙 확인.
- 5C / 5E (Drain): 배수 안 됨. 배수 필터(하단 캡) 이물질 막힘 청소. 배수 호스 꺾임 또는 동결 확인.

2. 동작/도어 에러
- dC / dE (Door): 문 열림. 문을 '탁' 소리 나게 닫고 재동작. 옷감이 문 사이에 끼었는지 확인.
- UE / Ub (Unbalanced): 탈수 불균형. 세탁물이 한쪽으로 쏠림. 이불은 단독 세탁 권장. 수평계 확인.
- LC / LE (Leak): 누수 감지. 배수 호스 빠짐 또는 세제통 역류 확인.

3. 소음 진단
- 쿵쿵/덜컹: 탈수 초기에 빨래 뭉침을 풀기 위한 소리거나 수평 불량.
- 갈갈/끼익: 모터나 벨트 문제보다는 동전, 와이어 등 이물질이 통 사이에 끼었을 확률 90%. 고무 패킹 틈새 확인.
- 웅~ (배수 시): 배수 펌프가 물을 퍼낼 때 나는 모터 소리 (정상).

[LG전자 세탁기 (트롬/오브제/워시타워) 매뉴얼]
1. 주요 에러 코드
- IE (Inlet Error): 급수 불량. 수도꼭지, 호스 꺾임, 급수 필터 청소.
- OE (Outlet Error): 배수 불량. 동결 또는 배수 펌프 필터 청소 필요.
- UE (Unbalanced Error): 탈수 불균형. 세탁물 고르게 펴주기.
- CL (Child Lock): 버튼 잠금 기능. 버튼 조작 안 됨. (자물쇠 아이콘 버튼 3초간 눌러 해제)
- tE (Thermistor): 온도 센서 이상 또는 세탁조 과열. 전원 끄고 열 식힌 후 재시도.

2. 유지 보수 가이드
- 통살균: 월 1회 권장. 시중 세탁조 클리너 사용.
- 고무 패킹 청소: 도어 안쪽 고무 패킹에 물 고임 및 물때 제거. 치약 묻힌 헝겊 사용 권장.
- 하단 배수 필터: 왼쪽 하단 커버 열고 잔수 호스로 물 뺀 뒤 필터 돌려 빼서 청소.

[냉장고 공통 (삼성/LG) 증상 가이드]
1. 냉동/냉장 안 됨
- 콤프레셔 소리는 나는데 안 시원함: 냉매 가스 누설 가능성 높음 (AS 필요).
- 콤프레셔 소리가 안 남: 온도 조절기(센서) 고장 또는 기동 콘덴서 불량.

2. 소음/발열
- 딱딱/뚝뚝: 성에 제거(제상) 히터가 작동하면서 내부 얼음이 녹거나 플라스틱이 수축할 때 나는 소리 (정상).
- 옆면이 뜨거움: 방열 파이프가 옆면에 매립되어 있어 열이 나는 것 (정상적인 방열 과정).
- 웅~ (간헐적): 컴프레셔가 온도를 맞추기 위해 고속 회전할 때 발생.

[식기세척기 공통 증상]
- IE/4C: 급수 에러. 밸브 잠김 확인.
- OE/5C: 배수 에러. 싱크대 배수관 연결 부위 막힘 확인.
- HE: 히터 에러. 고온 살균 불량. 전원 끄고 AS 접수.
`;

const SYSTEM_INSTRUCTION = `
당신은 가전제품 수리 전문가 AI "Fix It Now"입니다.
당신의 목표는 가전제품의 고장 소음(오디오), 이미지(사진), 또는 증상 설명(텍스트)을 분석하는 것입니다.

반드시 아래 제공된 [매뉴얼 컨텍스트]를 최우선으로 참고하여 답변하십시오. 이 컨텍스트에 없는 내용이라도 일반적인 수리 지식을 활용해 답변하되, 컨텍스트에 있는 내용은 구체적으로 인용해야 합니다.

[매뉴얼 컨텍스트]
${MANUAL_CONTEXT}

문제를 식별할 때:
1. 가전제품의 종류를 파악하십시오. (제조사 구분이 가능하다면 삼성/LG 등도 명시)
2. 구체적인 기계적 또는 전기적 결함을 진단하십시오. (에러 코드가 있다면 설명 포함)
3. 입력의 명확성에 따라 확률(%)을 할당하십시오.
4. 명확한 단계별 수리 가이드를 제공하십시오.
5. [매뉴얼 컨텍스트]를 참고했다면 "서비스 매뉴얼 참고"라고 명시하십시오.

전문적이고 안심할 수 있는, 안전을 최우선으로 하는 어조를 유지하십시오. 작업을 시작하기 전에 항상 전원을 차단하도록 조언하십시오.
모든 응답(JSON 값 포함)은 반드시 **한국어**로 작성되어야 합니다.
`;

const DIAGNOSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    appliance: { type: Type.STRING, description: "감지된 가전제품 종류 (예: 삼성 무풍 에어컨, LG 트롬 세탁기)" },
    issue: { type: Type.STRING, description: "문제의 기술적 명칭 (예: 에러코드 4C 급수 불량, 배수 필터 막힘)" },
    probability: { type: Type.NUMBER, description: "신뢰도 점수 (0~100)" },
    description: { type: Type.STRING, description: "이 소리나 증상이 발생하는 원인에 대한 사용자 친화적인 설명" },
    manualReference: { type: Type.STRING, description: "참고한 매뉴얼 또는 일반 지식 출처 (예: 삼성 세탁기 4C 에러 가이드)" },
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
