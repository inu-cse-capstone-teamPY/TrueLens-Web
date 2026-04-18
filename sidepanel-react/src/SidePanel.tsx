// SidePanel.tsx
import { useEffect, useMemo, useState } from "react";

type Verdict = "supported" | "refuted" | "uncertain";
type TrustTier = 1 | 2 | 3;

type Evidence = {
    title: string;
    url: string;
    snippet: string;
    domain: string;
    trust_tier: TrustTier;
};

type ScoreBreakdown = {
    existsEvidenceBonus: number; // +10
    tier3: number;              // count
    tier2: number;              // count
    tier1: number;              // count
    tierScore: number;          // tier3*10 + tier2*5 + tier1*1
    verdictAdjust: number;      // supported +10 / refuted -15 / uncertain 0
    confidence: number;         // 0~1
    confidenceScore: number;    // confidence*40
    supportBalanceScore?: number; // (optional) supports/refutes 기반
    total: number;              // final
};

type ClaimReport = {
    claim_id: string;
    claim_text: string;
    normalized_query: string;
    evidence: Evidence[];
    exists_evidence: boolean;
    source_trust_summary: { tier_counts: Record<"1" | "2" | "3", number> };
    model_verdict: Verdict;
    model_confidence: number; // 0~1
    credibility_score: number; // 0~100
    score_breakdown?: ScoreBreakdown; // ✅ 디자인용 (더미에서만 넣음)
};

type FactchainReport = {
    meta: {
        model: string;
        search_provider: string;
        max_results: number;
        elapsed_sec: number;
        hl: string;
        gl: string;
    };
    claims: ClaimReport[];
};

const MOCK_INPUT_TEXT = `최근 수년간 비트코인의 시가총액은 급격히 성장하여 2021년에는 한때 1조 달러를 돌파했다.
비트코인 네트워크의 채굴 난이도와 해시레이트도 사상 최고치를 기록했으며, 대한민국은 비트코인을 법정화폐로 채택했다.
그러나 채굴 과정에서 막대한 전력이 소비되며 환경에 부정적인 영향을 미친다는 지적이 계속되고 있다.
따라서 비트코인의 채굴 방식을 지분 증명(PoS) 방식으로 전환해야 할 필요가 있다.`;

const MOCK_REPORT: FactchainReport = {
    meta: {
        model: "gpt-4o-mini",
        search_provider: "serpapi-google",
        max_results: 6,
        elapsed_sec: 3.2,
        hl: "ko",
        gl: "kr",
    },
    claims: [
        {
            claim_id: "C1",
            claim_text: "비트코인의 시가총액은 2021년에 한때 1조 달러를 돌파했다.",
            normalized_query: "Bitcoin market cap surpassed 1 trillion 2021",
            evidence: [
                {
                    title: "Bitcoin market cap tops $1 trillion as price surges",
                    url: "https://www.reuters.com/example",
                    snippet: "Bitcoin's market capitalization briefly rose above $1 trillion in 2021 amid a price rally.",
                    domain: "reuters.com",
                    trust_tier: 2,
                },
                {
                    title: "Bitcoin reaches new highs, market cap milestones explained",
                    url: "https://www.bbc.com/example",
                    snippet: "Explainer on Bitcoin's market cap milestones including the $1 trillion threshold in 2021.",
                    domain: "bbc.com",
                    trust_tier: 2,
                },
                {
                    title: "Crypto data dashboard: Bitcoin market cap history",
                    url: "https://www.exampledata.com/example",
                    snippet: "Historical chart shows BTC market cap crossing $1T during 2021 peak periods.",
                    domain: "exampledata.com",
                    trust_tier: 1,
                },
            ],
            exists_evidence: true,
            source_trust_summary: { tier_counts: { "1": 1, "2": 2, "3": 0 } },
            model_verdict: "supported",
            model_confidence: 0.82,
            credibility_score: 78.0,
            score_breakdown: {
                existsEvidenceBonus: 10,
                tier3: 0,
                tier2: 2,
                tier1: 1,
                tierScore: 0 * 10 + 2 * 5 + 1 * 1,
                verdictAdjust: 10,
                confidence: 0.82,
                confidenceScore: 0.82 * 40,
                total: 78,
            },
        },
        {
            claim_id: "C2",
            claim_text: "대한민국은 비트코인을 법정화폐로 채택했다.",
            normalized_query: "South Korea adopted Bitcoin as legal tender",
            evidence: [
                {
                    title: "Countries that have adopted Bitcoin as legal tender",
                    url: "https://www.imf.org/example",
                    snippet: "Explains which countries adopted Bitcoin as legal tender and related policy context.",
                    domain: "imf.org",
                    trust_tier: 2,
                },
                {
                    title: "South Korea cryptocurrency regulation overview",
                    url: "https://www.korea.kr/example",
                    snippet: "Korean government portal overview of crypto policy; does not indicate legal tender adoption.",
                    domain: "korea.kr",
                    trust_tier: 1, // (참고) 실제론 정책 포털이지만 tier pattern엔 없을 수 있어 더미로 둠
                },
            ],
            exists_evidence: true,
            source_trust_summary: { tier_counts: { "1": 1, "2": 1, "3": 0 } },
            model_verdict: "refuted",
            model_confidence: 0.90,
            credibility_score: 22.0,
            score_breakdown: {
                existsEvidenceBonus: 10,
                tier3: 0,
                tier2: 1,
                tier1: 1,
                tierScore: 0 * 10 + 1 * 5 + 1 * 1,
                verdictAdjust: -15,
                confidence: 0.9,
                confidenceScore: 0.9 * 40,
                total: 22,
            },
        },
        {
            claim_id: "C3",
            claim_text: "비트코인 네트워크의 해시레이트는 사상 최고치를 기록했다.",
            normalized_query: "Bitcoin hashrate all-time high record",
            evidence: [
                {
                    title: "Bitcoin Hashrate Chart",
                    url: "https://www.blockchain.com/example",
                    snippet: "Chart indicates hashrate reaching new highs at multiple points.",
                    domain: "blockchain.com",
                    trust_tier: 1,
                },
                {
                    title: "Bitcoin’s hashrate hits record high",
                    url: "https://www.cnbc.com/example",
                    snippet: "Coverage of a record high in Bitcoin network hashrate and mining difficulty.",
                    domain: "cnbc.com",
                    trust_tier: 2,
                },
            ],
            exists_evidence: true,
            source_trust_summary: { tier_counts: { "1": 1, "2": 1, "3": 0 } },
            model_verdict: "uncertain",
            model_confidence: 0.55,
            credibility_score: 54.0,
            score_breakdown: {
                existsEvidenceBonus: 10,
                tier3: 0,
                tier2: 1,
                tier1: 1,
                tierScore: 0 * 10 + 1 * 5 + 1 * 1,
                verdictAdjust: 0,
                confidence: 0.55,
                confidenceScore: 0.55 * 40,
                total: 54,
            },
        },
    ],
};


// ─────────────────────────────────────────────────────────────
// 작은 유틸
// ─────────────────────────────────────────────────────────────
function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function verdictLabel(v: Verdict) {
    switch (v) {
        case "supported":
            return { text: "✅ 사실로 판단", tone: "good" as const };
        case "refuted":
            return { text: "❌ 사실 아님", tone: "bad" as const };
        default:
            return { text: "⚠️ 불확실", tone: "warn" as const };
    }
}

function tierDot(tier: TrustTier) {
    if (tier === 3) return { bg: "#16a34a", fg: "#fff", label: "T3" };
    if (tier === 2) return { bg: "#eab308", fg: "#111827", label: "T2" };
    return { bg: "#ef4444", fg: "#fff", label: "T1" };
}

// ─────────────────────────────────────────────────────────────
// 더미 상태(분석/검색/판정/점수/완료)
// ─────────────────────────────────────────────────────────────
function useFakeStatus(totalClaims: number) {
    const [status, setStatus] = useState<string>("대기 중…");

    useEffect(() => {
        const steps = [
            { t: 0, msg: "주장 추출 중…" },
            { t: 900, msg: `근거 검색 중… (C2 / ${totalClaims})` },
            { t: 2000, msg: "근거 판정 중…" },
            { t: 2900, msg: "점수 계산 중…" },
            { t: 3600, msg: "✅ 검증 완료" },
        ];

        const timers = steps.map((s) =>
            window.setTimeout(() => setStatus(s.msg), s.t)
        );

        return () => timers.forEach((id) => window.clearTimeout(id));
    }, [totalClaims]);

    return status;
}

// ─────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────
export default function SidePanel() {
    const [inputText] = useState(MOCK_INPUT_TEXT);
    const [report] = useState(MOCK_REPORT);

    // 토글 상태
    const [openClaims, setOpenClaims] = useState<Record<string, boolean>>({});
    const [openEvidence, setOpenEvidence] = useState<Record<string, boolean>>({});

    const statusText = useFakeStatus(report.claims.length);

    const summary = useMemo(() => {
        const claims = report.claims;
        const counts = { supported: 0, refuted: 0, uncertain: 0 };
        let scoreSum = 0;
        for (const c of claims) {
            counts[c.model_verdict] += 1;
            scoreSum += c.credibility_score;
        }
        const avg = claims.length ? scoreSum / claims.length : 0;
        return { counts, avg: Math.round(avg) };
    }, [report]);

    const styles = useMemo(
        () => ({
            page: {
                height: "100vh",
                width: "100%",
                background: "#0b1220",
                display: "flex",
                justifyContent: "center",
                alignItems: "stretch",
                padding: 12,
                boxSizing: "border-box" as const,
                fontFamily:
                    'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial',
            },
            shell: {
                width: 420, // 사이드패널 폭 느낌
                height: "100%",
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column" as const,
                boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            },
            header: {
                padding: "12px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
            },
            title: { color: "#e5e7eb", fontWeight: 800, letterSpacing: -0.3 },
            badge: {
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                color: "#cbd5e1",
                background: "rgba(255,255,255,0.06)",
            },
            content: {
                display: "grid",
                gridTemplateRows: "1fr 1.35fr",
                gap: 10,
                padding: 12,
                height: "100%",
                boxSizing: "border-box" as const,
            },
            panel: {
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 14,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column" as const,
            },
            panelHeader: {
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
            },
            panelTitle: { color: "#e5e7eb", fontWeight: 800 },
            panelBody: { padding: 12, overflow: "auto" as const },
            mono: {
                whiteSpace: "pre-wrap" as const,
                color: "#cbd5e1",
                lineHeight: 1.55,
                fontSize: 13,
            },
            metaLine: { color: "#cbd5e1", fontSize: 13, lineHeight: 1.6 },
            hr: { height: 1, background: "rgba(255,255,255,0.08)", margin: "10px 0" },
            summaryBox: {
                padding: 10,
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#e5e7eb",
                fontSize: 13,
                lineHeight: 1.6,
            },
            claimList: { display: "flex", flexDirection: "column" as const, gap: 10 },
            claimCard: {
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(15,23,42,0.55)",
                overflow: "hidden",
            },
            claimHeader: {
                padding: 12,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 10,
                alignItems: "start",
                cursor: "pointer",
            },
            claimTitle: { color: "#e5e7eb", fontWeight: 800, lineHeight: 1.25 },
            subRow: { display: "flex", flexWrap: "wrap" as const, gap: 8, marginTop: 8 },
            pill: {
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.05)",
                color: "#cbd5e1",
            },
            scoreBarWrap: {
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 8,
            },
            scoreBar: {
                flex: 1,
                height: 8,
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
            },
            scoreFill: (pct: number) => ({
                width: `${pct}%`,
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg, #ef4444, #eab308, #16a34a)",
            }),
            scoreText: { color: "#e5e7eb", fontWeight: 800, minWidth: 74, textAlign: "right" as const },
            caret: { color: "#94a3b8", fontSize: 14, marginLeft: 6 },
            claimBody: {
                padding: 12,
                borderTop: "1px solid rgba(255,255,255,0.08)",
                color: "#cbd5e1",
                fontSize: 13,
                lineHeight: 1.6,
            },
            sectionTitle: { color: "#e5e7eb", fontWeight: 800, marginTop: 10, marginBottom: 6 },
            small: { color: "#94a3b8", fontSize: 12 },
            link: { color: "#60a5fa", textDecoration: "none" },
            evidencePreview: { display: "flex", flexDirection: "column" as const, gap: 6, marginTop: 8 },
            evidenceRow: {
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: 8,
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
            },
            evTitle: { color: "#e5e7eb", fontWeight: 700 },
            evSnippet: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
            accordionBtn: {
                width: "100%",
                padding: "10px 12px",
                marginTop: 10,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                color: "#e5e7eb",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
            },
            evidenceList: { display: "flex", flexDirection: "column" as const, gap: 10, marginTop: 10 },
            evidenceCard: {
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
            },
            evTop: { display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" },
            tierChip: (tier: TrustTier) => {
                const t = tierDot(tier);
                return {
                    padding: "3px 8px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 900,
                    background: t.bg,
                    color: t.fg,
                };
            },
            scoreBox: {
                marginTop: 10,
                padding: 10,
                borderRadius: 12,
                border: "1px dashed rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.03)",
            },
            scoreLine: { display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, lineHeight: 1.7 },
        }),
        []
    );

    const toggleClaim = (id: string) =>
        setOpenClaims((p) => ({ ...p, [id]: !p[id] }));

    const toggleEvidence = (claimId: string) =>
        setOpenEvidence((p) => ({ ...p, [claimId]: !p[claimId] }));

    return (
        <div style={styles.page}>
            <div style={styles.shell}>
                <div style={styles.header}>
                    <div style={styles.title}>TrueEye · Fact Check</div>
                    <div style={styles.badge}>Dummy UI</div>
                </div>

                <div style={styles.content}>
                    {/* 칸 1: 대상 텍스트 */}
                    <div style={styles.panel}>
                        <div style={styles.panelHeader}>
                            <div style={styles.panelTitle}>대상 텍스트</div>
                            <div style={styles.small}>전체</div>
                        </div>
                        <div style={styles.panelBody}>
                            <div style={styles.mono}>{inputText}</div>
                        </div>
                    </div>

                    {/* 칸 2: 결과 */}
                    <div style={styles.panel}>
                        <div style={styles.panelHeader}>
                            <div style={styles.panelTitle}>검증 결과</div>
                            <div style={styles.small}>{report.meta.search_provider}</div>
                        </div>

                        <div style={styles.panelBody}>
                            {/* 상태/시간/모델 */}
                            <div style={styles.metaLine}>• 분석상태: <b>{statusText}</b></div>
                            <div style={styles.metaLine}>• 답변 시간: <b>{report.meta.elapsed_sec.toFixed(1)}초</b></div>
                            <div style={styles.metaLine}>• 사용 모델: <b>{report.meta.model}</b></div>

                            <div style={styles.hr} />

                            {/* 전체요약 */}
                            <div style={styles.summaryBox}>
                                <div style={{ fontWeight: 900, marginBottom: 6 }}>전체요약</div>
                                <div>주장 <b>{report.claims.length}</b>개</div>
                                <div>
                                    Supported <b>{summary.counts.supported}</b> / Refuted{" "}
                                    <b>{summary.counts.refuted}</b> / Uncertain{" "}
                                    <b>{summary.counts.uncertain}</b>
                                </div>
                                <div>
                                    평균 신뢰점수 <b>{summary.avg}</b>점
                                </div>
                            </div>

                            <div style={{ height: 10 }} />

                            {/* Claim 리스트 */}
                            <div style={styles.claimList}>
                                {report.claims.map((c) => {
                                    const open = !!openClaims[c.claim_id];
                                    const evOpen = !!openEvidence[c.claim_id];
                                    const v = verdictLabel(c.model_verdict);
                                    const pct = clamp(c.credibility_score, 0, 100);

                                    const tc = c.source_trust_summary?.tier_counts ?? { "1": 0, "2": 0, "3": 0 };

                                    return (
                                        <div key={c.claim_id} style={styles.claimCard}>
                                            {/* Claim Header */}
                                            <div style={styles.claimHeader} onClick={() => toggleClaim(c.claim_id)}>
                                                <div>
                                                    <div style={styles.claimTitle}>
                                                        [{c.claim_id}] {c.claim_text}
                                                    </div>

                                                    <div style={styles.subRow}>
                                                        <span style={styles.pill}>{v.text}</span>
                                                        <span style={styles.pill}>
                              확신도 {Math.round(c.model_confidence * 100)}%
                            </span>
                                                        <span style={styles.pill}>
                              출처 🟢{tc["3"]} · 🟡{tc["2"]} · 🔴{tc["1"]}
                            </span>
                                                    </div>

                                                    <div style={styles.scoreBarWrap}>
                                                        <div style={styles.scoreBar}>
                                                            <div style={styles.scoreFill(pct)} />
                                                        </div>
                                                        <div style={styles.scoreText}>{pct.toFixed(0)} / 100</div>
                                                    </div>
                                                </div>

                                                <div style={{ color: "#94a3b8", fontWeight: 900 }}>
                                                    {open ? "접기" : "열기"}
                                                    <span style={styles.caret}>{open ? "▲" : "▼"}</span>
                                                </div>
                                            </div>

                                            {/* Claim Body */}
                                            {open && (
                                                <div style={styles.claimBody}>
                                                    <div style={styles.sectionTitle}>검색어</div>
                                                    <div style={styles.small}>{c.normalized_query}</div>

                                                    <div style={styles.sectionTitle}>주요 근거 미리보기</div>
                                                    <div style={styles.evidencePreview}>
                                                        {c.evidence.slice(0, 3).map((ev, i) => {
                                                            const t = tierDot(ev.trust_tier);
                                                            return (
                                                                <div key={i} style={styles.evidenceRow}>
                                                                    <div
                                                                        style={{
                                                                            width: 34,
                                                                            height: 28,
                                                                            borderRadius: 10,
                                                                            display: "grid",
                                                                            placeItems: "center",
                                                                            background: t.bg,
                                                                            color: t.fg,
                                                                            fontWeight: 900,
                                                                            fontSize: 12,
                                                                        }}
                                                                    >
                                                                        {t.label}
                                                                    </div>
                                                                    <div>
                                                                        <div style={styles.evTitle}>
                                                                            {ev.domain} · {ev.title}
                                                                        </div>
                                                                        <div style={styles.evSnippet}>
                                                                            {ev.snippet.slice(0, 120)}
                                                                            {ev.snippet.length > 120 ? "…" : ""}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* 근거 상세보기 토글 */}
                                                    <button
                                                        type="button"
                                                        style={styles.accordionBtn}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleEvidence(c.claim_id);
                                                        }}
                                                    >
                                                        <span>근거 상세보기 ({c.evidence.length})</span>
                                                        <span style={{ color: "#94a3b8" }}>
                              {evOpen ? "▲" : "▼"}
                            </span>
                                                    </button>

                                                    {evOpen && (
                                                        <>
                                                            <div style={styles.evidenceList}>
                                                                {c.evidence.map((ev, i) => (
                                                                    <div key={i} style={styles.evidenceCard}>
                                                                        <div style={styles.evTop}>
                                                                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                                                <span style={styles.tierChip(ev.trust_tier)}>{tierDot(ev.trust_tier).label}</span>
                                                                                <span style={{ color: "#e5e7eb", fontWeight: 900 }}>
                                          {ev.domain}
                                        </span>
                                                                            </div>
                                                                            <a
                                                                                href={ev.url}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                style={styles.link}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                원문 열기 →
                                                                            </a>
                                                                        </div>

                                                                        <div style={{ marginTop: 6, color: "#e5e7eb", fontWeight: 800 }}>
                                                                            {ev.title}
                                                                        </div>
                                                                        <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 12, lineHeight: 1.6 }}>
                                                                            {ev.snippet}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* 점수 계산 */}
                                                            <div style={styles.scoreBox}>
                                                                <div style={{ color: "#e5e7eb", fontWeight: 900, marginBottom: 6 }}>
                                                                    점수 계산 (디자인용 더미)
                                                                </div>

                                                                {c.score_breakdown ? (
                                                                    <>
                                                                        <div style={styles.scoreLine}>
                                                                            <span>근거 존재</span>
                                                                            <span>+{c.score_breakdown.existsEvidenceBonus}</span>
                                                                        </div>
                                                                        <div style={styles.scoreLine}>
                                                                            <span>출처 티어 점수</span>
                                                                            <span>+{Math.round(c.score_breakdown.tierScore)}</span>
                                                                        </div>
                                                                        <div style={styles.scoreLine}>
                                                                            <span style={styles.small}> └ 티어3 x {c.score_breakdown.tier3}</span>                                                                            <span>+{c.score_breakdown.tier3 * 10}</span>
                                                                        </div>
                                                                        <div style={styles.scoreLine}>
                                                                            <span style={styles.small}> └ 티어3 x {c.score_breakdown.tier3}</span>                                                                            <span>+{c.score_breakdown.tier2 * 5}</span>
                                                                        </div>
                                                                        <div style={styles.scoreLine}>
                                                                            <span style={styles.small}> └ 티어3 x {c.score_breakdown.tier3}</span>                                                                            <span>+{c.score_breakdown.tier1 * 1}</span>
                                                                        </div>

                                                                        <div style={styles.scoreLine}>
                                                                            <span>판정 보정</span>
                                                                            <span>
                                        {c.score_breakdown.verdictAdjust >= 0 ? "+" : ""}
                                                                                {c.score_breakdown.verdictAdjust}
                                      </span>
                                                                        </div>

                                                                        <div style={styles.scoreLine}>
                                                                            <span>확신도 반영</span>
                                                                            <span>+{Math.round(c.score_breakdown.confidenceScore)}</span>
                                                                        </div>

                                                                        <div style={styles.hr} />

                                                                        <div style={styles.scoreLine}>
                                                                            <span style={{ color: "#e5e7eb", fontWeight: 900 }}>총점</span>
                                                                            <span style={{ color: "#e5e7eb", fontWeight: 900 }}>
                                        {Math.round(c.score_breakdown.total)} / 100
                                      </span>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div style={styles.small}>
                                                                        (현재 API 결과에는 breakdown이 없어서, 실제 연동 시 서버에서 score_breakdown을 내려주거나 프론트에서 부분 계산이 필요)
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ height: 8 }} />
                            <div style={styles.small}>
                                * 현재는 더미 데이터로 디자인만 확인하는 화면입니다.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}