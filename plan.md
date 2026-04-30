# PDF 내보내기 근본 수정 계획

본 계획은 `html2pdf`의 컨테이너 전체 캡처 방식을 폐기하고, `html2canvas` + `jsPDF`를 직접 조합하여 슬라이드를 개별 캡처하는 안정적인 방식으로 전면 교체합니다.

## 1. 접근 방식
*   `html2pdf().from(container).save()` → **폐기** (높이 0 버그 재현됨)
*   `html2canvas(slideElement)` → `jsPDF.addImage()` 방식으로 **슬라이드별 개별 캡처** 후 PDF에 순차적으로 삽입.
*   임시 렌더링 요소는 `body`에 `position: fixed` + `visibility: hidden`이 아닌, **`opacity: 0` + 고정 크기**로 부착하여 브라우저가 레이아웃을 완전히 계산하도록 보장.

---

## 2. 세부 구현 단계

### 단계 1: CSS 수정 (`src/styles/editor.css`)
*   `.print-container`를 `body`에 부착 가능한 형태로 변경.
*   `top: -10000px` 제거 → `position: fixed; left: -9999px; opacity: 0` 사용.
*   내부 `.print-slide`는 정확히 1280x720 고정.

### 단계 2: main.js 전면 수정
*   `html2pdf().set(opt).from(container).save()` 제거.
*   대신 `jsPDF`와 `html2canvas`(html2pdf 번들에 포함)를 직접 사용:
    ```js
    const { jsPDF } = window.jspdf; // html2pdf 번들에 포함
    const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1280, 720] });
    
    for (let i = 0; i < slideElements.length; i++) {
      const canvas = await html2canvas(slideElements[i], { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) doc.addPage([1280, 720], 'landscape');
      doc.addImage(imgData, 'JPEG', 0, 0, 1280, 720);
    }
    doc.save('filename.pdf');
    ```

### 단계 3: 검증
*   슬라이드 7개 이상의 문서에서 테스트.
*   다크/라이트 테마 모두 확인.

---

## 3. 체크리스트 (구현 단계)

- [x] 단계 1: 캡처용 CSS 스타일 수정
- [x] 단계 2: jsPDF + html2canvas 직접 조합으로 슬라이드별 개별 캡처 로직 구현
- [/] 단계 3: 브라우저에서 실제 다운로드 및 내용 확인 테스트