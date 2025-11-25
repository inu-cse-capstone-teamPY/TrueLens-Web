// background.js

// 마지막으로 선택된 텍스트 저장
let lastSelectedText = "";

// 1. 설치/업데이트 시 컨텍스트 메뉴 생성
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "truth-check",
        title: "이 텍스트 진위 여부 확인하기",
        contexts: ["selection"] // 텍스트 선택 시에만 보이게
    });
});

// 2. 컨텍스트 메뉴 클릭 시 동작
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== "truth-check" || !tab?.id) return;

    const text = (info.selectionText || "").trim();
    if (!text) {
        console.warn("선택된 텍스트가 없습니다.");
        return;
    }

    // 마지막 선택 텍스트 저장
    lastSelectedText = text;

    // 사이드패널(이미 열려 있다면) 내용 갱신
    chrome.runtime.sendMessage({
        type: "SHOW_SELECTION",
        payload: { text }
    });

    // ❌ 여기서는 sidePanel.open() 호출 안 함
    //    (컨텍스트 메뉴는 user gesture로 보장되지 않음)
});

// 3. 메시지 핸들러 (sidepanel에서 마지막 텍스트 가져갈 때 사용)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // sidepanel이 처음 열릴 때 마지막 선택 텍스트 요청
    if (message.type === "GET_LAST_SELECTION") {
        sendResponse({ text: lastSelectedText });
        return true;
    }

    // (필요하면 SELECTION_CHANGED 같은 다른 타입도 여기서 처리)
});
