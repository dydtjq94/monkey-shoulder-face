import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import mixpanel from "mixpanel-browser";
import styles from "../styles/home-style/home.module.css";

export default function Home() {
  /* ───────── 0. 비밀번호 게이트 ───────── */
  // 로컬스토리지에 auth_ok 플래그가 있으면 바로 통과
  const [isVerified, setIsVerified] = useState(() => {
    return !!localStorage.getItem("auth_ok");
  });
  const [password, setPassword] = useState("");

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === "0101") {
      // 인증 통과 → 플래그 저장
      localStorage.setItem("auth_ok", "true");
      setIsVerified(true);
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  /* ───────── 1. Mixpanel 초기화 ───────── */
  useEffect(() => {
    if (!isVerified) return; // 비밀번호 통과 후에만 추적

    let distinctId = localStorage.getItem("mixpanel_distinct_id");
    if (!distinctId) {
      distinctId = crypto.randomUUID();
      localStorage.setItem("mixpanel_distinct_id", distinctId);
    }

    mixpanel.init("e79cc909eb5b5368943eedd49742f5f6", {
      debug: true,
      autotrack: true,
      persistence: "localStorage",
    });
    mixpanel.identify(distinctId);
    mixpanel.track("실제 데이터 - 메인 페이지 방문-리액트", {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  }, [isVerified]);

  /* ───────── 2. 사진 업로드 → /loading ───────── */
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleStartClick = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file); // 브라우저 임시 URL
    sessionStorage.setItem("face_photo_url", url); // 새로고침 대비
    mixpanel.track("실제 데이터 - 사진 업로드", { filename: file.name });

    navigate("/loading", { state: { photoUrl: url } }); // 사진 URL 넘겨 이동
  };

  /* ───────── 3. 비밀번호 입력 뷰 ───────── */
  if (!isVerified) {
    return (
      <div className={styles.password_wrap}>
        <form onSubmit={handlePasswordSubmit} className={styles.password_form}>
          <h2 className={styles.password_title}>비밀번호 입력</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력해주세요."
            className={styles.password_input}
            autoFocus
          />
          <button type="submit" className={styles.password_button}>
            확인
          </button>
        </form>
      </div>
    );
  }

  /* ───────── 4. 메인 JSX ───────── */
  return (
    <div className={styles.main_body_wrap}>
      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* 뒤쪽 별 장식 */}
      <div className={styles.star_img_wrap}>
        <img src="/star.svg" alt="" className={styles.star_img} />
      </div>
      <div className={styles.star_img_wrap2}>
        <img src="/star.svg" alt="" className={styles.star_img2} />
      </div>
      <div className={styles.star_img_wrap3}>
        <img src="/star.svg" alt="" className={styles.star_img3} />
      </div>

      {/* 메인 콘텐츠 */}
      <div className={styles.main_content_wrap}>
        <div className={styles.header_img_wrap}>
          <img
            className={styles.header_img}
            src="https://i.ibb.co/tM5WQxdp/banner.png"
            alt="배너"
          />
        </div>

        <div className={styles.main_title_wrap}>
          <div className={styles.header_img_wrap2}>
            <img
              className={styles.header_img2}
              src="/assets/short_title.png"
              alt="배너"
            />
          </div>
          <div className={styles.main_subtitle}>
            관상으로 보는 나의 재물운
            <br />
            당신의 돈길은 어디로 향하고 있을까?
          </div>
        </div>

        {/* ▼ 2. ⭐️ 시작(촬영) 버튼 */}
        <div className={styles.button_img_wrap}>
          <button
            type="button"
            className={styles.btn_img_wrap}
            onClick={handleStartClick}
          >
            <img
              src="https://i.ibb.co/dwWSR2Lp/click.png"
              alt="시작 버튼"
              className={styles.btn_img}
            />
          </button>
        </div>

        <p className={styles.nostore}>
          *본 프로그램은 얼굴 사진 촬영을 통해 관상 분석을 진행하며,
          <br />
          참여 시 해당 내용에 동의한 것으로 간주됩니다.
        </p>
      </div>

      {/* 하단 고정 이미지 */}
      <img
        className={styles.footer_img}
        src="https://i.ibb.co/zhxM4jhS/vdvdv.png"
        alt=""
      />
    </div>
  );
}
