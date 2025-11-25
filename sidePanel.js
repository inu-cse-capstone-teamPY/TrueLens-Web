// sidePanel.js
// sidePanel.js
const statusEl = document.getElementById("status");
const textEl = document.getElementById("selectedText");
const resultEl = document.getElementById("result");

// 초기 상태 설정
function initializeSidePanel() {
    chrome.runtime.sendMessage(
        { type: 'GET_LAST_SELECTION' },
        (response) => {
            if (response && response.text) {
                showSelection(response.text);
            } else {
                showEmptyState();
            }
        }
    );
}

function showEmptyState() {
    statusEl.textContent = "선택된 텍스트 없음";
    textEl.textContent = "웹 페이지에서 텍스트를 드래그하여 선택하세요.";
    resultEl.innerHTML = `<em>아직 분석 결과가 없습니다.</em>`;
}

function showSelection(text) {
    statusEl.textContent = "선택한 텍스트:";
    textEl.textContent = text;
    resultEl.innerHTML = `<em>아직 분석되지 않았습니다. (추후 API 연동 예정)</em>`;
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SHOW_SELECTION") {
        showSelection(message.payload.text);
    }

    else if (message.type === "TRUTH_RESULT") {
        const { text, result } = message.payload;
        statusEl.textContent = "분석 완료 결과:";
        textEl.textContent = text;
        resultEl.innerHTML = `
      <p><b>판단:</b> ${result.verdict}</p>
      <p><b>신뢰도:</b> ${(result.confidence * 100).toFixed(1)}%</p>
      <p><b>설명:</b> ${result.reason || "설명 없음"}</p>
    `;
    }

    else if (message.type === "TRUTH_ERROR") {
        statusEl.textContent = "오류 발생";
        resultEl.textContent = message.payload.message;
    }
});

// 사이드패널이 로드될 때 초기화
initializeSidePanel();
