/* ─── src/pages/Loading.jsx ─── */
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import mixpanel from "mixpanel-browser";
import styles from "../styles/loading-style/loading.module.css";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function Loading() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const photoUrl = state?.photoUrl || sessionStorage.getItem("face_photo_url");
  const [progress, setProgress] = useState("관상가가 당신의 관상을 분석중");
  const hasRunRef = useRef(false); // 🔑 StrictMode 가드

  /* Mixpanel */
  useEffect(() => {
    const id =
      localStorage.getItem("mixpanel_distinct_id") ?? crypto.randomUUID();
    localStorage.setItem("mixpanel_distinct_id", id);
    mixpanel.init("e79cc909eb5b5368943eedd49742f5f6", {
      debug: true,
      autotrack: true,
      persistence: "localStorage",
    });
    mixpanel.identify(id);
    mixpanel.track("로딩-화면 진입", { url: location.href });
  }, []);

  /* 분석 파이프라인 */
  useEffect(() => {
    if (!photoUrl) return;
    if (hasRunRef.current) return; // StrictMode 두 번째 호출 차단
    hasRunRef.current = true;

    const runAnalysis = async () => {
      try {
        /* 1) 얼굴 특징 */
        setProgress("관상가가 당신의 관상을 분석중");
        mixpanel.track("분석 시작");

        const blob = await fetch(photoUrl).then((r) => r.blob());
        const form = new FormData();
        form.append("file", blob, "face.jpg");

        const fJson = await (
          await fetch(`${API_BASE}/analyze/features/`, {
            method: "POST",
            body: form,
          })
        ).json();
        if (fJson.error) throw new Error(fJson.error);
        const features = fJson.features.trim();
        if (features === "again")
          throw new Error("얼굴이 인식되지 않았습니다.");

        /* 2) mini(detail1~3) */
        setProgress("관상가가 당신의 관상을 분석중");
        const miniJson = await (
          await fetch(`${API_BASE}/analyze/wealth/mini`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ feature: features }),
          })
        ).json();
        if (miniJson.error) throw new Error(miniJson.error);

        /* 3) summary + score */
        setProgress("관상가가 당신의 관상을 분석중");
        const scoreJson = await (
          await fetch(`${API_BASE}/analyze/wealth/score`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              detail1: miniJson.detail1 ?? "",
              detail2: miniJson.detail2 ?? "",
              detail3: miniJson.detail3 ?? "",
            }),
          })
        ).json();
        if (scoreJson.error) throw new Error(scoreJson.error);

        /* 4) Firestore 저장 */
        setProgress("결과 저장 중");
        const docRef = await addDoc(collection(db, "reports"), {
          createdAt: serverTimestamp(),
          features,
          ...miniJson, // detail1~3
          ...scoreJson, // summary, score
        });

        /* 5) 세션 백업 & 이동 */
        sessionStorage.setItem(
          "wealth_result",
          JSON.stringify({ id: docRef.id, features, ...miniJson, ...scoreJson })
        );

        mixpanel.track("분석 완료", { docId: docRef.id });
        navigate(`/qr/${docRef.id}`);
      } catch (err) {
        console.error(err);
        mixpanel.track("분석 오류", { message: err.message });
        alert(`분석 중 오류가 발생했습니다.\n${err.message}`);
        navigate("/");
      }
    };

    runAnalysis();
  }, [photoUrl, navigate]);

  /* ─ UI ─ */
  return (
    <div className={styles.main_body_wrap}>
      <div className={styles.main_content_wrap}>
        {/* 배너 */}
        <div className={styles.header_img_wrap}>
          <img
            className={styles.header_img}
            src="https://i.ibb.co/tM5WQxdp/banner.png"
            alt="배너"
          />
        </div>

        {/* 타이틀 */}
        <div className={styles.main_title_wrap}>
          <div className={styles.main_title}>재물운 용하당</div>
        </div>

        {/* 분석 중 화면 */}
        <div className={styles.border_wrap}>
          <div className={styles.border}>
            <div className={styles.image_square_frame}>
              <img
                className={styles.image_square}
                src={photoUrl ?? "Rectangle.png"}
                alt="face"
              />
            </div>
            <div className={styles.image_title_wrap}>
              <div className={styles.ai}>
                {progress}
                <span className={styles.loadingDots}></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 장식 */}
      <img
        className={styles.footer_img}
        src="https://i.ibb.co/Z75Lr4y/gggg.png"
        alt=""
      />
    </div>
  );
}
