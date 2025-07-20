/* ─── src/pages/Qr.jsx ─── */
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import mixpanel from 'mixpanel-browser';
import QRCodeStyling from 'qr-code-styling';
import styles from '../styles/qr-style/qr.module.css';

export default function Qr() {
  const { id: docId } = useParams();
  const navigate      = useNavigate();
  const qrRef         = useRef(null);
  const qrInstance    = useRef(null);

  const [score1,   setScore  ] = useState(null);
  const [score2, setSummary] = useState('');

  /* ✨ 모달 on/off */
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!docId) { navigate('/'); return; }

    /* ─ Firestore: 점수·요약 ─ */
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'reports', docId));
        if (snap.exists()) {
          const d = snap.data();
          setScore  (d.score1  ?? null);
          setSummary((d.score2 ?? '').replace(/["“”]/g, ''));
        }
      } catch (e) { console.error(e); }
    })();

    /* ─ Mixpanel ─ */
    const mpId = localStorage.getItem('mixpanel_distinct_id') ?? crypto.randomUUID();
    localStorage.setItem('mixpanel_distinct_id', mpId);
    mixpanel.init('e79cc909eb5b5368943eedd49742f5f6',
                  { debug:true, autotrack:true, persistence:'localStorage' });
    mixpanel.identify(mpId);
    mixpanel.track('QR 화면 진입', { docId });

    /* ─ QR 코드 ─ */
    const url = `${window.location.origin}/result/${docId}`;
    if (!qrInstance.current) {
      qrInstance.current = new QRCodeStyling({
        width:220, height:220, data:url,
        image:'https://i.ibb.co/3KWp6vT/dsvvvvv.png',
        margin:4,
        dotsOptions:{ type:'square', color:'#202020' },
        backgroundOptions:{ color:'transparent' },
      });
    } else qrInstance.current.update({ data:url });

    if (qrRef.current) {
      qrRef.current.innerHTML = '';
      qrInstance.current.append(qrRef.current);
    }

    /* 60초 뒤 자동 홈 이동 */
    const to = setTimeout(() => navigate('/'), 60_000);
    return () => clearTimeout(to);
  }, [docId, navigate]);

  /* ─ 처음으로 돌아가기 버튼 ─ */
  const handleBackClick = () => setShowModal(true);

  const handleConfirm   = () => navigate('/');
  const handleCancel    = () => setShowModal(false);

  return (
    <div className={styles.main_body_wrap}>
      <div className={styles.main_content_wrap}>
        {/* ... (배너 / 타이틀 / QR 등 기존 내용 그대로) */}
        <div className={styles.header_img_wrap}>
          <img className={styles.header_img} src="https://i.ibb.co/tM5WQxdp/banner.png" alt="배너"/>
        </div>

        <div className={styles.main_title_wrap}>
          <div className={styles.main_title}>재물운 용하당</div>
          <div className={styles.sub_title}>당신의 재물운은?</div>
          <div className={styles.sub_title2}>
            (아래 QR을 스캔하면 상세한 결과와 함께<br/>다운로드 받을 수 있습니다.)
          </div>
        </div>

        <div className={styles.qr_wrap}>
          <div ref={qrRef} className={styles.qr}/>
        </div>

        {score1!==null && (
          <>
            <div className={styles.score_wrap}>
              <div className={styles.score}>당신의 점수 : {score1} / 100</div>
            </div>
            <div className={styles.summary_wrap}>
              <div className={styles.summary}>{score2}</div>
            </div>
          </>
        )}

        {/* 처음으로 돌아가기 */}
        <div className={styles.back_btn_wrap}>
          <button className={styles.back_btn} onClick={handleBackClick}>
            처음으로 돌아가기
          </button>
        </div>
      </div>

      <img className={styles.footer_img}
           src="https://i.ibb.co/ZzHHs5Xx/gggggaag.png" alt=""/>

      {/* ───────── 커스텀 모달 ───────── */}
      {showModal && (
        <div className={styles.modal_overlay}>
          <div className={styles.modal_box}>
            <p className={styles.modal_msg}>
              확인 버튼 클릭 시<br/>QR코드는 재출력 불가합니다.
            </p>
            <div className={styles.modal_btns}>
              <button className={styles.modal_cancel} onClick={handleCancel}>취소</button>
              <button className={styles.modal_confirm} onClick={handleConfirm}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
