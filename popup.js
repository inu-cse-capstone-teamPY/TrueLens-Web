// popup.js

// 진위여부 확인 로그
document.getElementById("logButton")?.addEventListener("click", () => {
    console.log("[TruthEye] 로그 버튼 클릭");
    // TODO: 나중에 로그 화면으로 네비게이션
});

// 버그 신고
document.getElementById("bugButton")?.addEventListener("click", () => {
    console.log("[TruthEye] 버그 신고 버튼 클릭");
    // TODO: 깃허브 이슈 / 구글폼 열기 등
});

// 환경설정
document.getElementById("settingsButton")?.addEventListener("click", () => {
    console.log("[TruthEye] 환경설정 버튼 클릭");
    // TODO: 옵션 페이지 열기 등
});

// ✅ 사이드패널 열기
document.getElementById("sideButton")?.addEventListener("click", async () => {
    console.log("[TruthEye] 사이드패널 열기 버튼 클릭");

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });
        if (!tab?.id) return;

        // ✅ popup 클릭(진짜 user gesture) 안에서 직접 open 호출
        await chrome.sidePanel.open({ tabId: tab.id });
        console.log("Side panel opened from popup.");
    } catch (err) {
        console.error("Failed to open side panel from popup:", err);
    }
});
