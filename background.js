// background.js

// 1. 설치/업데이트 시 컨텍스트 메뉴 생성
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "truth-check",
        title: "이 텍스트 진위 여부 확인하기",
        contexts: ["selection"]   // 텍스트 선택 시에만 보이게
    });
});

// 2. 메뉴 클릭 시 동작
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== "truth-check" || !tab?.id) return;

    // ✅ 2-1. 우클릭 시점의 선택 텍스트는 info.selectionText 로 바로 받을 수 있음
    const text = (info.selectionText || "").trim();
    if (!text) {
        console.warn("선택된 텍스트가 없습니다.");
        return;
    }

    // ✅ 2-2. 우선은 서버 호출 없이, 선택 텍스트만 사이드패널로 전달
    chrome.runtime.sendMessage({
        type: "SHOW_SELECTION",
        payload: { text }
    });

    // ✅ 2-3. 현재 탭 기준으로 사이드 패널 열기
    try {
        await chrome.sidePanel.open({ tabId: tab.id });
    } catch (e) {
        console.error("sidePanel.open 에러:", e);
    }
});

let lastSelectedText = '';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SELECTION_CHANGED') {
    lastSelectedText = message.payload.text;

    // 사이드패널로 전송
    chrome.runtime.sendMessage({
      type: 'SHOW_SELECTION',
      payload: { text: lastSelectedText }
    });
  }

  // 사이드패널이 열릴 때 마지막 선택 텍스트 요청
  if (message.type === 'GET_LAST_SELECTION') {
    sendResponse({ text: lastSelectedText });
  }
});