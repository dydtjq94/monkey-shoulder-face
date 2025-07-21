/* ─── src/pages/Result.jsx ─── */
import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import mixpanel from "mixpanel-browser";
import html2pdf from "html2pdf.js"; // ★ 추가 (npm i html2pdf.js)
import styles from "../styles/result-style/result.module.css";

/* ─ markdown → HTML ─ (생략 없이 그대로) ─ */
const escapeHTML = (s = "") =>
  s.replace(
    /[&<>"'`]/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "`": "&#96;",
      }[m])
  );
const simpleMD = (src = "") =>
  src
    .replace(
      /```([\s\S]*?)```/g,
      (_, c) => `<pre><code>${escapeHTML(c)}</code></pre>`
    )
    .replace(/`([^`]+?)`/g, (_, c) => `<code>${escapeHTML(c)}</code>`)
    .replace(/^###### (.*$)/gim, "<h6>$1</h6>")
    .replace(/^##### (.*$)/gim, "<h5>$1</h5>")
    .replace(/^#### (.*$)/gim, "<h4>$1</h4>")
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/___(.+?)___/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/!\[([^\]]*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
    .replace(
      /\[([^\]]+?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    )
    .replace(/^\s*(\*\s*\*\s*\*|-{3,}|_{3,})\s*$/gm, "<hr>")
    .replace(/^>\s+(.*)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^\s*[*+-]\s+(.+)$/gm, "<ul><li>$1</li></ul>")
    .replace(/(<\/ul>\s*)<ul>/g, "")
    .replace(/^\s*\d+\.\s+(.+)$/gm, "<ol><li>$1</li></ol>")
    .replace(/(<\/ol>\s*)<ol>/g, "");

export default function Result() {
  const { id: docId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [html, setHtml] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const resultRef = useRef(null); // ★ PDF 대상 영역 ref

  useEffect(() => {
    /* Mixpanel */
    const mpId =
      localStorage.getItem("mixpanel_distinct_id") ?? crypto.randomUUID();
    localStorage.setItem("mixpanel_distinct_id", mpId);
    mixpanel.init("e79cc909eb5b5368943eedd49742f5f6", {
      debug: true,
      autotrack: true,
      persistence: "localStorage",
    });
    mixpanel.identify(mpId);
    mixpanel.track("결과 화면 진입", { url: location.href });

    /* 5초 뒤 Firestore fetch */
    const timer = setTimeout(async () => {
      try {
        if (!docId) throw new Error("QR을 통해서만 접근 가능합니다.");
        const snap = await getDoc(doc(db, "reports", docId));
        if (!snap.exists()) throw new Error("데이터가 존재하지 않습니다.");

        const data = snap.data();
        const md = Object.keys(data)
          .filter((k) => k.startsWith("detail"))
          .sort((a, b) => +a.slice(6) - +b.slice(6))
          .map((k) => data[k])
          .join("\n\n---\n\n");

        setHtml(simpleMD(md));
      } catch (e) {
        alert(e.message);
        navigate("/");
      } finally {
        setLoading(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [docId, navigate]);
  /* ▶︎ PDF 래퍼용 ref */
  const pdfRef = useRef(null);

  /* ▶︎ 다운로드 핸들러 */
  const handleDownload = () => {
    if (!pdfRef.current) return;

    const pxToMm = 0.264583;

    const rect = pdfRef.current.getBoundingClientRect();
    const widthMM = rect.width * pxToMm;
    const heightMM = rect.height * pxToMm;

    const opt = {
      margin: 0,
      filename: "wealth_report.pdf",
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f15b37", // 배경색 유지
      },
      jsPDF: {
        unit: "mm",
        format: [widthMM, heightMM + 0.3], // ✔ 정확한 사이즈 지정
        orientation: "portrait",
      },
    };

    html2pdf().set(opt).from(pdfRef.current).save();

    showToast("운세 보고서가 저장되었습니다!");
    mixpanel.track("결과 PDF 다운로드");
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(""); // 2.5초 뒤 숨김
    }, 3500);
  };

  if (loading)
    return (
      <div className={styles.main_body_wrap}>
        <div className={styles.main_content_wrap}>
          <div className={styles.loading_centered}>
            <div className={styles.loading}>결과를 불러오는 중…</div>
          </div>
        </div>
      </div>
    );

  return (
    <div className={styles.main_body_wrap}>
      {toastMessage && <div className={styles.toast}>{toastMessage}</div>}

      <div className={styles.main_content_wrap}>
        {/* ▼▼▼ ① ‘pdfRef’ 래퍼 시작 */}
        <div ref={pdfRef} className={styles.pdf_page}>
          {/* 배너 */}

          <div className={styles.header_img_wrap}>
            <img
              className={styles.header_img}
              src="https://i.ibb.co/tM5WQxdp/banner.png"
              alt="배너"
            />
          </div>

          {/* 제목 */}
          <div className={styles.main_title_wrap}>
            <div className={styles.main_title}>재물운 용하당</div>
          </div>

          {/* 결과 HTML */}
          <div
            className={styles.main_result_wrap}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
        {/* ▲▲▲ ① 래퍼 끝 */}

        {/* 다운로드 버튼 */}
        <div className={styles.result_download_wrap}>
          <div className={styles.result_download}>
            <button
              type="button"
              className={styles.result_download_btn}
              onClick={handleDownload}
            >
              운세 다운로드
            </button>
          </div>
          <div className={styles.result_download_sub}>
            ✻ 분석 결과는 7일 이내에만 다운로드 가능하며, 이후에는 저장할 수
            없습니다.
          </div>
        </div>
      </div>

      <img
        className={styles.footer_img}
        src="https://i.ibb.co/qMv0qYkM/vvvvvv.png"
        alt=""
      />
    </div>
  );
}
