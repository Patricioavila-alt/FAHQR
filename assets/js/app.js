'use strict';
/**
 * app.js — QR Promo Farmacias del Ahorro
 * Maneja: captcha, validación, QR generation, modal, descarga de gafete en alta calidad
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ─────────────────────────────────────────
       TOKENS DE MARCA (para Canvas Renderer)
    ───────────────────────────────────────── */
    const BRAND = {
        primary:    '#C8102E',
        secondary:  '#001489',
        white:      '#FFFFFF',
        chipBg:     '#eef2ff',
        chipBorder: '#c7d2fe',
        tagline:    '#333333',
        gray:       '#888888',
        dark:       '#222222',
        clip:       '#b0b8c1',
    };

    /* ─────────────────────────────────────────
       DOM REFS
    ───────────────────────────────────────── */
    const inputNombre       = document.getElementById('inputNombre');
    const inputID           = document.getElementById('inputTestID');
    const inputBaseUrl      = document.getElementById('inputTestBaseUrl');
    const inputCaptcha      = document.getElementById('inputCaptchaTest');
    const textCaptcha       = document.getElementById('textCaptchaTest');
    const btnPreview        = document.getElementById('btnOpenPreview');
    const btnOpenWhatsApp   = document.getElementById('btnOpenWhatsApp');
    const whatsappMsgPreview= document.getElementById('whatsappMsgPreview');

    /* ─────────────────────────────────────────
       MODAL HELPERS
    ───────────────────────────────────────── */
    const modal   = document.getElementById('qrPreviewModal');
    const waModal = document.getElementById('whatsappModal');

    const openModal    = () => { modal.classList.add('is-open');    modal.setAttribute('aria-hidden', 'false'); };
    const closeModal   = () => { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true');  };
    const openWaModal  = () => { waModal.classList.add('is-open');    waModal.setAttribute('aria-hidden', 'false'); };
    const closeWaModal = () => { waModal.classList.remove('is-open'); waModal.setAttribute('aria-hidden', 'true');  };

    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    document.getElementById('btnCloseWaModal').addEventListener('click', closeWaModal);
    waModal.addEventListener('click', e => { if (e.target === waModal) closeWaModal(); });

    /* ─────────────────────────────────────────
       MATH CAPTCHA
    ───────────────────────────────────────── */
    let captchaAnswer = 0;

    const generateCaptcha = () => {
        const n1 = Math.floor(Math.random() * 10) + 1;
        const n2 = Math.floor(Math.random() * 10) + 1;
        const op = Math.random() > 0.5 ? '+' : '-';
        if (op === '-' && n1 < n2) {
            textCaptcha.innerText = `${n2} - ${n1}`;
            captchaAnswer = n2 - n1;
        } else {
            textCaptcha.innerText = `${n1} ${op} ${n2}`;
            captchaAnswer = op === '+' ? n1 + n2 : n1 - n2;
        }
    };
    generateCaptcha();

    /* ─────────────────────────────────────────
       FORM VALIDATION
    ───────────────────────────────────────── */
    const validateUI = () => {
        const id     = inputID.value.trim();
        const nombre = inputNombre.value.trim();
        const valid  = nombre.length >= 2 && id.length >= 3
                       && parseInt(inputCaptcha.value, 10) === captchaAnswer;

        btnPreview.disabled      = !valid;
        btnOpenWhatsApp.disabled = !valid;

        whatsappMsgPreview.innerHTML = id
            ? `"Quiero conocer el Catálogo extendido, soy referido de <strong>${id}</strong> quien me dio un cupón"`
            : `"Quiero conocer el Catálogo extendido, soy referido de <strong>[tu ID]</strong> quien me dio un cupón"`;
    };

    inputNombre.addEventListener('input', validateUI);
    inputID.addEventListener('input', validateUI);
    inputCaptcha.addEventListener('input', validateUI);

    /* ─────────────────────────────────────────
       URL BUILDER
    ───────────────────────────────────────── */
    const buildUrl = (base, params) => {
        try {
            const p = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => {
                if (v && String(v).trim()) p.append(k, String(v).trim());
            });
            const qs = p.toString();
            if (!qs) return base.trim();
            return `${base.trim()}${base.includes('?') ? '&' : '?'}${qs}`;
        } catch { return base; }
    };

    /* ─────────────────────────────────────────
       QR INSTANCES (lazy init on window.load)
    ───────────────────────────────────────── */
    let qrPreviewInstance = null;

    const qrBaseSettings = {
        type: 'canvas', data: 'fahorro://', margin: 10,
        qrOptions: { mode: 'Byte', errorCorrectionLevel: 'M' },
        backgroundOptions:   { color: '#FFFFFF' },
        dotsOptions:         { color: '#2C3C8F', type: 'square' },
        cornersSquareOptions:{ color: '#E3182D', type: 'square' },
        cornersDotOptions:   { color: '#E3182D', type: 'square' },
    };

    window.addEventListener('load', () => {
        if (typeof QRCodeStyling === 'undefined') {
            console.error('QRCodeStyling no disponible.');
            return;
        }
        qrPreviewInstance = new QRCodeStyling({ ...qrBaseSettings, width: 250, height: 250 });
        qrPreviewInstance.append(document.getElementById('qrDomContainer'));
    });

    /* ─────────────────────────────────────────
       DEEPLINK QR (vista de app — oculto)
    ───────────────────────────────────────── */
    btnPreview.addEventListener('click', () => {
        if (!qrPreviewInstance || !inputID.value.trim()) return;
        const url = buildUrl(inputBaseUrl.value, { cupon: 'Cupon50%', multifuncionalID: inputID.value });
        qrPreviewInstance.update({ data: url });
        document.getElementById('textUrlFeedback').innerText = `ID: ${inputID.value.trim()}`;
        openModal();
    });

    document.getElementById('btnDownloadSingle').addEventListener('click', () => {
        if (!qrPreviewInstance) return;
        const id = (inputID.value || 'Promo').replace(/[^a-zA-Z0-9]/g, '');
        try { qrPreviewInstance.download({ name: `${id}_Fahorro_QR`, extension: 'png' }); }
        catch (e) { alert('No se pudo exportar.'); console.error(e); }
    });

    /* ─────────────────────────────────────────
       WHATSAPP QR — GENERA EN GAFETE
    ───────────────────────────────────────── */
    const WA_PHONE = '528007112222';
    let currentWaUrl = ''; // guardamos la URL para el renderer del canvas

    btnOpenWhatsApp.addEventListener('click', () => {
        const id     = inputID.value.trim();
        const nombre = inputNombre.value.trim();
        if (!id)     return alert('Por favor, ingresa un MultifuncionalID válido.');
        if (!nombre) return alert('Por favor, ingresa el Nombre del promotor.');

        const msg = `Quiero conocer el Catálogo extendido, soy referido de ${id} quien me dio un cupón`;
        currentWaUrl = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(msg)}`;

        // Actualizar chips del gafete visual
        document.getElementById('badgeNameFront').textContent = nombre;
        document.getElementById('badgeIdFront').textContent   = `ID: ${id}`;

        const target = document.getElementById('qrBadgeCanvas');
        target.innerHTML = '';

        if (typeof QRCodeStyling !== 'undefined') {
            // Usamos type:'canvas' solo para mostrar en el modal (visual)
            const qrBadge = new QRCodeStyling({
                width: 155, height: 155, type: 'canvas', data: currentWaUrl, margin: 4,
                qrOptions: { mode: 'Byte', errorCorrectionLevel: 'M' },
                backgroundOptions:   { color: '#FFFFFF' },
                dotsOptions:         { color: '#000000', type: 'square' },
                cornersSquareOptions:{ color: '#000000', type: 'square' },
                cornersDotOptions:   { color: '#000000', type: 'square' },
            });
            qrBadge.append(target);
        }
        openWaModal();
    });

    /**
     * Genera un QR en un canvas propio usando QRCode.js (sin carga externa).
     * No produce tainted canvas porque todo el dibujo es local.
     */
    const buildQrCanvas = (url, size) => new Promise((resolve, reject) => {
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;visibility:hidden;';
        document.body.appendChild(container);
        try {
            // QRCode.js genera un <canvas> internamente sin recursos externos
            const qr = new QRCode(container, {
                text: url, width: size, height: size,
                colorDark: '#000000', colorLight: '#FFFFFF',
                correctLevel: QRCode.CorrectLevel.M,
            });
            // El canvas se genera de forma síncrona (o con un tick)
            setTimeout(() => {
                const qrCanvas = container.querySelector('canvas');
                if (qrCanvas) {
                    resolve(qrCanvas);
                } else {
                    reject(new Error('No se generó el canvas QR'));
                }
                document.body.removeChild(container);
            }, 100);
        } catch (e) {
            document.body.removeChild(container);
            reject(e);
        }
    });

    /* ═════════════════════════════════════════
       BADGE CANVAS RENDERER
       Genera imagen de alta calidad sin librerías externas.
       Funciona en file:// sin problemas de CORS.
    ═════════════════════════════════════════ */

    /**
     * Logo embebido como data URL — evita que el canvas quede "tainted"
     * al cargar desde file:// (política de seguridad del navegador).
     */
    const LOGO_DATA_URL = 'data:image/svg+xml;base64,' + btoa(`<svg width="141" height="56" viewBox="0 0 141 56" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M32.5088 0.26709C38.8607 -0.613457 44.5709 0.700438 48.6094 3.95166C58.6388 12.0392 58.2248 25.7759 47.5 40.7183C41.8301 48.616 32.8036 54.211 23.3359 55.6606C21.8248 55.8909 20.3663 55.9985 18.9756 55.9985C14.8036 55.9985 11.2199 54.9696 8.6123 53.0054C-2.39326 44.674 -2.88805 30.0839 7.3418 15.8325C13.2792 7.55541 22.9074 1.59478 32.5088 0.26709Z" fill="white"/><path d="M35.5366 42.4252L36.811 50.6263C32.6701 53.1832 28.0576 54.9375 23.3354 55.6605C21.8244 55.8908 20.3658 55.9984 18.9751 55.9984C15.2348 55.9983 11.9677 55.1709 9.45264 53.5844L14.6753 42.4252H35.5366ZM1.77979 44.5336C-1.80736 36.4054 0.0197533 26.0322 7.34131 15.8324C11.221 10.4239 16.6771 6.00516 22.6714 3.22107L1.77979 44.5336ZM39.0103 0.151733C42.719 0.570877 46.0101 1.85946 48.6089 3.95154C58.433 11.8735 58.2357 25.2149 48.144 39.8011L39.0103 0.151733ZM35.0444 32.9965H18.9038L30.2036 9.77673L35.0444 32.9965Z" fill="#CE0E2D"/><path d="M66.5825 20.1152H68.8888V14.9804H71.7448V12.568H68.8888V10.4117H71.9862V7.99927H66.5825V20.1152Z" fill="#001689"/><path d="M81.4941 12.4332V11.0585H79.5632V20.1286H81.6282V14.5221C81.6282 14.1582 81.7086 13.9156 81.8561 13.7944C81.9634 13.7 82.1779 13.6461 82.4729 13.6461C82.7142 13.6461 82.9154 13.6731 83.0897 13.727V10.8159C82.2986 10.8024 81.7622 11.355 81.4941 12.4332Z" fill="#001689"/><path d="M90.4508 10.8025C89.8206 10.8025 89.311 11.2068 88.9356 12.002H88.9222C88.8015 11.6246 88.6004 11.3281 88.3054 11.1125C88.0238 10.8968 87.702 10.8025 87.3668 10.816C86.6696 10.8699 86.1466 11.3146 85.8114 12.1232H85.7846V11.0586H83.8538V20.1286H85.9321V13.6462C85.9321 13.1475 86.1466 12.9049 86.5623 12.9049C86.8036 12.9049 86.9645 13.1475 87.045 13.6462V20.1286H89.1233V13.6462C89.1233 13.161 89.311 12.9184 89.6999 12.9049C90.0753 12.878 90.2496 13.1206 90.2496 13.6462V20.1286H92.328V12.7028C92.328 12.1098 92.1537 11.6515 91.7782 11.3146C91.4028 10.9777 90.9603 10.8025 90.4508 10.8025Z" fill="#001689"/><path d="M103.296 17.7567C103.216 18.2958 103.028 18.5518 102.693 18.5518C102.25 18.5518 102.022 18.2149 102.022 17.5006V13.7675C102.022 13.0262 102.223 12.6623 102.666 12.6623C102.947 12.6623 103.135 12.851 103.229 13.2284C103.283 13.6866 103.309 14.037 103.309 14.2661L103.323 14.4278H105.267C105.321 13.1745 105.133 12.258 104.704 11.692C104.261 11.1125 103.537 10.816 102.518 10.8025C100.802 10.8025 99.9438 11.8268 99.9438 13.9157V17.5949C99.9438 19.4683 100.802 20.4117 102.518 20.4117C102.706 20.4117 102.934 20.3982 103.216 20.3712C104.261 20.2499 104.905 19.6569 105.173 18.6057C105.294 18.1475 105.347 17.4197 105.347 16.4494H103.336C103.336 17.1772 103.323 17.6084 103.296 17.7567Z" fill="#001689"/><path d="M108.698 11.045H106.62V20.1151H108.698V11.045Z" fill="#001689"/><path d="M108.698 7.99927H106.62V10.1826H108.698V7.99927Z" fill="#001689"/><path d="M120.176 14.8995C119.747 14.6704 119.305 14.4278 118.876 14.1852C118.447 13.9292 118.232 13.6327 118.232 13.2688C118.232 12.7567 118.46 12.5006 118.916 12.5006C119.211 12.5006 119.399 12.6354 119.493 12.8914C119.519 12.9993 119.56 13.2957 119.6 13.754H121.544C121.571 12.7971 121.33 12.0559 120.793 11.5168C120.324 11.0451 119.68 10.8025 118.876 10.8025C118.085 10.8025 117.455 11.0316 116.972 11.4629C116.435 11.9615 116.167 12.6758 116.167 13.5922C116.167 14.2257 116.342 14.8052 116.704 15.2904C116.972 15.6677 117.374 16.0181 117.951 16.355C118.42 16.6246 118.889 16.8941 119.359 17.1367C119.546 17.3119 119.64 17.541 119.64 17.8375C119.64 18.4036 119.399 18.7001 118.903 18.7001C118.38 18.7001 118.138 18.2418 118.165 17.3254H116.167C116.1 19.3739 116.999 20.3982 118.876 20.3982C119.694 20.3982 120.351 20.1691 120.833 19.7243C121.37 19.2122 121.638 18.471 121.638 17.5141C121.638 16.8537 121.491 16.3011 121.209 15.8699C121.008 15.5329 120.659 15.2095 120.176 14.8995Z" fill="#001689"/><path d="M128.946 11.8807H128.919C128.53 11.1664 128.021 10.8025 127.404 10.8025C126.774 10.8025 126.318 11.1529 125.996 11.8268C125.755 12.3793 125.621 13.0667 125.621 13.9157V17.0424C125.621 19.2526 126.237 20.3712 127.458 20.4117C128.141 20.4251 128.691 19.9804 129.08 19.064V20.1152H131.011V7.99927H128.933V11.8807H128.946ZM128.946 16.7324C128.946 17.7702 128.731 18.2958 128.302 18.2958C127.913 18.2958 127.712 17.8106 127.712 16.8402V14.5087C127.712 14.037 127.726 13.7001 127.779 13.4979C127.873 13.1206 128.074 12.9049 128.369 12.9049C128.772 12.8915 128.973 13.471 128.973 14.603V16.7324H128.946Z" fill="#001689"/><path d="M134.887 10.8025C133.023 10.8294 132.085 11.8672 132.085 13.9157V17.5949C132.085 18.5788 132.366 19.3065 132.929 19.8052C133.426 20.223 134.083 20.4251 134.887 20.4251C136.805 20.3982 137.703 19.2526 137.596 17.0019H135.544C135.49 17.6219 135.464 17.9723 135.437 18.0801C135.343 18.417 135.128 18.5922 134.793 18.5653C134.364 18.5383 134.163 18.2149 134.163 17.6084V16.0181H137.689V13.417C137.689 12.5006 137.408 11.8133 136.831 11.3685C136.349 10.9912 135.705 10.8025 134.887 10.8025ZM135.611 14.3065H134.163V13.7135C134.163 12.9049 134.404 12.5006 134.901 12.5006C135.128 12.5006 135.316 12.6084 135.45 12.8375C135.558 12.9993 135.611 13.2014 135.611 13.417V14.3065Z" fill="#001689"/><path d="M141 7.99927H138.922V20.1152H141V7.99927Z" fill="#001689"/><path d="M96.0137 10.8025C94.0561 10.8025 93.1174 11.8402 93.2113 13.9292H95.2896C95.3165 13.417 95.3567 13.0936 95.4237 12.9319C95.531 12.6489 95.7589 12.5141 96.0807 12.5141C96.2819 12.5141 96.4428 12.6084 96.5634 12.7971C96.6841 12.9723 96.7378 13.2014 96.7378 13.4575C96.7378 13.9561 96.4294 14.347 95.7857 14.5896C94.8337 14.9804 94.2438 15.2634 94.0561 15.4251C93.4393 15.9642 93.1309 16.8133 93.1309 17.9858C93.1309 18.7135 93.2918 19.2931 93.6404 19.7513C93.9756 20.196 94.4583 20.4251 95.0349 20.4251C95.6919 20.4251 96.2819 20.0478 96.8182 19.32L96.8048 20.1286H98.7893V13.5114C98.7759 12.541 98.5747 11.8537 98.1725 11.4494C97.7434 11.0181 97.0193 10.8025 96.0137 10.8025ZM96.7244 17.1502C96.7244 18.0666 96.4696 18.5249 95.9601 18.5249C95.4505 18.5249 95.1824 18.2014 95.1824 17.5545C95.1824 17.0693 95.3433 16.6785 95.6651 16.382C96.0942 16.0855 96.4562 15.8699 96.7244 15.7216V17.1502Z" fill="#001689"/><path d="M75.6604 10.8025C73.7028 10.8025 72.7776 11.8402 72.8714 13.9292H74.9498C74.9632 13.417 75.0034 13.0936 75.0704 12.9319C75.1777 12.6489 75.3922 12.5141 75.7275 12.5141C75.9286 12.5141 76.0761 12.6084 76.2102 12.7971C76.3308 12.9723 76.3845 13.2014 76.3845 13.4575C76.3845 13.9561 76.0761 14.347 75.4325 14.5896C74.4805 14.9804 73.9039 15.2634 73.7028 15.4251C73.086 15.9642 72.7642 16.8133 72.7642 17.9858C72.7642 18.7135 72.9251 19.2931 73.2737 19.7513C73.6223 20.196 74.0782 20.4251 74.6682 20.4251C75.3118 20.4251 75.9018 20.0478 76.4515 19.32L76.4381 20.1286H78.436V13.5114C78.4226 12.541 78.208 11.8537 77.8058 11.4494C77.4035 11.0181 76.6795 10.8025 75.6604 10.8025ZM76.3845 17.1502C76.3845 18.0666 76.1297 18.5249 75.6202 18.5249C75.0973 18.5249 74.8425 18.2014 74.8425 17.5545C74.8425 17.0693 75.0034 16.6785 75.3252 16.382C75.7543 16.0855 76.1029 15.8699 76.3711 15.7216V17.1502H76.3845Z" fill="#001689"/><path d="M112.588 10.8025C110.644 10.8025 109.705 11.8402 109.785 13.9292H111.864C111.877 13.417 111.931 13.0936 111.984 12.9319C112.092 12.6489 112.32 12.5141 112.642 12.5141C112.843 12.5141 113.004 12.6084 113.124 12.7971C113.245 12.9723 113.299 13.2014 113.299 13.4575C113.299 13.9561 112.977 14.347 112.347 14.5896C111.395 14.9804 110.818 15.2634 110.603 15.4251C109.987 15.9642 109.678 16.8133 109.678 17.9858C109.678 18.7135 109.853 19.2931 110.188 19.7513C110.536 20.196 111.006 20.4251 111.582 20.4251C112.226 20.4251 112.829 20.0478 113.379 19.32V20.1286H115.363V13.5114C115.35 12.541 115.149 11.8537 114.733 11.4494C114.331 11.0181 113.594 10.8025 112.588 10.8025ZM113.312 17.1502C113.312 18.0666 113.044 18.5249 112.548 18.5249C112.025 18.5249 111.77 18.2014 111.77 17.5545C111.77 17.0693 111.931 16.6785 112.266 16.382C112.695 16.0855 113.044 15.8699 113.325 15.7216V17.1502H113.312Z" fill="#001689"/><path d="M72.7781 26.0448H69.5065H67.294L55.9236 47.8372H61.4077L63.8078 43.2416H69.5065V47.8372H74.9906L74.4676 26.0448H72.7781ZM69.5199 39.1715H65.9398L69.5199 32.2982V39.1715Z" fill="#001689"/><path d="M87.3794 32.4737C85.9581 32.4737 85.1401 32.6893 83.6116 33.1206L84.4831 26.0182H79.3342L76.5989 47.8511H81.7478L82.9679 37.8106C83.1154 36.6651 83.4909 36.0991 84.3624 36.0991C85.2206 36.0991 85.3413 36.5573 85.2206 37.5007L83.9468 47.8646L89.1493 47.9993L90.7851 36.3282C90.9192 35.2635 90.6913 34.374 90.1013 33.6867C89.5113 32.9724 88.4923 32.4737 87.3794 32.4737Z" fill="#001689"/><path d="M116.33 32.4737C114.895 32.4737 114.077 32.6894 112.562 33.1206L112.642 32.4468H107.48L105.549 47.8376H110.698L111.61 40.2635C111.757 39.1045 112.428 37.3524 115.86 37.6085L116.558 32.5007C116.477 32.4872 116.397 32.4737 116.33 32.4737Z" fill="#001689"/><path d="M100.105 32.2445H99.3545C96.0292 32.2445 92.7977 34.9804 92.1943 38.3362L91.5507 41.8941C90.9339 45.2499 93.1732 47.9857 96.5119 47.9857H97.2628C100.588 47.9857 103.82 45.2499 104.423 41.8941L105.067 38.3362C105.657 34.9804 103.431 32.2445 100.105 32.2445ZM99.8372 40.1151C99.5154 41.7593 99.1534 42.8779 98.7645 43.4709C98.3757 44.0774 97.9198 44.3469 97.4237 44.2795C96.9275 44.2256 96.6192 43.8618 96.4717 43.1609C96.3242 42.4736 96.3912 41.4089 96.6862 39.9264C96.9812 38.4305 97.3432 37.3793 97.7455 36.7728C98.1477 36.1663 98.5902 35.8833 99.0595 35.9507C99.5422 36.0046 99.864 36.382 100.012 37.0558C100.186 37.7162 100.119 38.7405 99.8372 40.1151Z" fill="#001689"/><path d="M127.002 32.4737C125.568 32.4737 124.75 32.6894 123.235 33.1206L123.315 32.4468H118.153L116.235 47.8376H121.384L122.283 40.2635C122.43 39.1045 123.101 37.3524 126.533 37.6085L127.23 32.5007C127.15 32.4872 127.083 32.4737 127.002 32.4737Z" fill="#001689"/><path d="M135.624 32.2445H134.887C131.548 32.2445 128.33 34.9804 127.727 38.3362L127.083 41.8941C126.48 45.2499 128.706 47.9857 132.031 47.9857H132.782C136.107 47.9857 139.339 45.2499 139.942 41.8941L140.586 38.3362C141.189 34.9804 138.963 32.2445 135.624 32.2445ZM135.37 40.1151C135.048 41.7593 134.672 42.8779 134.283 43.4709C133.881 44.0774 133.439 44.3469 132.943 44.2795C132.46 44.2256 132.152 43.8618 131.991 43.1609C131.843 42.4736 131.91 41.4089 132.205 39.9264C132.514 38.4305 132.849 37.3793 133.264 36.7728C133.667 36.1663 134.109 35.8833 134.578 35.9507C135.061 36.0046 135.383 36.382 135.544 37.0558C135.705 37.7162 135.651 38.7405 135.37 40.1151Z" fill="#001689"/></svg>`);

    /** Carga una imagen desde una data URL como promesa */
    const loadLogoImg = () => new Promise((resolve) => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = LOGO_DATA_URL;
    });

    /** Dibuja un rectángulo redondeado y lo deja como path activo */
    const rrect = (ctx, x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y,     x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x,     y + h, r);
        ctx.arcTo(x,     y + h, x,     y,     r);
        ctx.arcTo(x,     y,     x + w, y,     r);
        ctx.closePath();
    };

    /** Dibuja una esquina estilo visor QR (forma de L) */
    const drawCornerL = (ctx, ax, ay, bx, by, cx, cy) => {
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(cx, cy);
        ctx.stroke();
    };

    /** Dibuja el footer rojo con la curva blanca en esquina inferior-derecha */
    const drawFooter = (ctx, bw, H, W, s) => {
        const footerH = 38 * s;
        const footerY = H - bw - footerH;
        ctx.fillStyle = BRAND.primary;
        ctx.fillRect(bw, footerY, W - 2 * bw, footerH);

        // Curva blanca
        const curveW = 60 * s, curveR = 60 * s;
        const fx = W - bw - curveW, fy = footerY;
        ctx.fillStyle = BRAND.white;
        ctx.beginPath();
        ctx.moveTo(fx + curveR, fy);
        ctx.lineTo(W - bw, fy);
        ctx.lineTo(W - bw, fy + footerH);
        ctx.lineTo(fx, fy + footerH);
        ctx.lineTo(fx, fy + curveR);
        ctx.quadraticCurveTo(fx, fy, fx + curveR, fy);
        ctx.closePath();
        ctx.fill();
    };

    /** Dibuja el clip/ojillo superior del gafete */
    const drawClip = (ctx, W, s) => {
        const clipW = 36 * s, clipH = 14 * s;
        ctx.fillStyle = BRAND.clip;
        rrect(ctx, (W - clipW) / 2, 0, clipW, clipH, 8 * s);
        ctx.fill();
    };

    /** Escribe texto con salto de línea automático (word-wrap) */
    const fillWrappedText = (ctx, text, x, y, maxW, lineH) => {
        const words = text.split(' ');
        let line = '', lineY = y;
        words.forEach(word => {
            const test = line ? line + ' ' + word : word;
            if (ctx.measureText(test).width > maxW && line) {
                ctx.fillText(line, x, lineY);
                line  = word;
                lineY += lineH;
            } else { line = test; }
        });
        ctx.fillText(line, x, lineY);
        return lineY; // retorna la Y final usada
    };

    /* ── RENDER CARA FRONTAL ── */
    async function renderFront(ctx, W, H, s, vendorId, vendorName) {
        const bw = 5 * s, rc = 22 * s;

        // Fondo con borde rojo
        ctx.fillStyle = BRAND.primary;
        rrect(ctx, 0, 0, W, H, rc); ctx.fill();
        // Clip redondeado: todo el contenido queda dentro del badge
        ctx.save();
        rrect(ctx, bw, bw, W - 2 * bw, H - 2 * bw, rc - bw);
        ctx.clip();
        ctx.fillStyle = BRAND.white;
        ctx.fillRect(0, 0, W, H);

        // Logo desde data URL embebida (sin carga externa, sin tainted canvas)
        const logo  = await loadLogoImg();
        const logoW = 160 * s;
        const logoH = logo ? logoW * (logo.naturalHeight / logo.naturalWidth) : 48 * s;
        const logoX = (W - logoW) / 2;
        const logoY = bw + 28 * s;
        if (logo) ctx.drawImage(logo, logoX, logoY, logoW, logoH);

        // Tagline
        const tagY = logoY + logoH + 6 * s;
        ctx.fillStyle  = BRAND.tagline;
        ctx.textAlign  = 'center';
        ctx.font       = `500 ${11.5 * s}px Manrope, sans-serif`;
        ctx.fillText('Te queremos... bien\u00AE', W / 2, tagY + 11.5 * s);

        // Línea separadora roja
        const lineY = tagY + 14 * s + 12 * s;
        ctx.fillStyle = BRAND.primary;
        ctx.fillRect(bw, lineY, W - 2 * bw, 3 * s);

        // ── Body ──
        let y = lineY + 3 * s + 12 * s;

        // ── Chip NOMBRE (azul sólido, texto blanco) ──
        const nameFontSz = 11.5 * s;
        ctx.font = `700 ${nameFontSz}px Manrope, sans-serif`;
        const nameTxt  = vendorName || '';
        const namePadX = 14 * s, nameChipH = 26 * s;
        const nameChipW = Math.min(ctx.measureText(nameTxt).width + namePadX * 2, (W - 2 * bw) * 0.96);
        const nameChipX = (W - nameChipW) / 2;

        ctx.fillStyle = BRAND.secondary;           // azul sólido
        rrect(ctx, nameChipX, y, nameChipW, nameChipH, nameChipH / 2); ctx.fill();

        ctx.fillStyle    = BRAND.white;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        // truncate si es muy largo
        let displayName = nameTxt;
        while (ctx.measureText(displayName).width > nameChipW - namePadX * 2 && displayName.length > 0) {
            displayName = displayName.slice(0, -1);
        }
        if (displayName !== nameTxt) displayName += '…';
        ctx.fillText(displayName, W / 2, y + nameChipH / 2);
        ctx.textBaseline = 'alphabetic';

        y += nameChipH + 5 * s;

        // ── Chip ID (azul claro con borde) ──
        const chipFontSz = 11.5 * s;
        ctx.font = `700 ${chipFontSz}px Manrope, sans-serif`;
        const chipTxt  = `ID: ${vendorId}`;
        const chipPadX = 14 * s, chipH = 26 * s;
        const chipW    = ctx.measureText(chipTxt).width + chipPadX * 2;
        const chipX    = (W - chipW) / 2;

        ctx.fillStyle = BRAND.chipBg;
        rrect(ctx, chipX, y, chipW, chipH, chipH / 2); ctx.fill();
        ctx.strokeStyle = BRAND.chipBorder; ctx.lineWidth = 1.5 * s;
        rrect(ctx, chipX, y, chipW, chipH, chipH / 2); ctx.stroke();

        ctx.fillStyle    = BRAND.secondary;
        ctx.textBaseline = 'middle';
        ctx.fillText(chipTxt, W / 2, y + chipH / 2);
        ctx.textBaseline = 'alphabetic';

        y += chipH + 6 * s;

        // Marco visor QR (4 esquinas estilo L)
        const frameSize = 174 * s, frameX = (W - frameSize) / 2, frameY = y;
        const armLen = 24 * s;
        ctx.strokeStyle = BRAND.secondary;
        ctx.lineWidth   = 4 * s;
        ctx.lineCap     = 'square';
        drawCornerL(ctx, frameX + armLen, frameY,            frameX,            frameY,            frameX,            frameY + armLen);
        drawCornerL(ctx, frameX + frameSize - armLen, frameY, frameX + frameSize, frameY,            frameX + frameSize, frameY + armLen);
        drawCornerL(ctx, frameX,            frameY + frameSize - armLen, frameX,            frameY + frameSize, frameX + armLen,            frameY + frameSize);
        drawCornerL(ctx, frameX + frameSize, frameY + frameSize - armLen, frameX + frameSize, frameY + frameSize, frameX + frameSize - armLen, frameY + frameSize);

        // QR generado en canvas propio (sin recursos externos → sin tainted canvas)
        try {
            const qrSize   = 155 * s;
            const qrCanvas = await buildQrCanvas(currentWaUrl, Math.round(qrSize));
            ctx.drawImage(qrCanvas,
                frameX + (frameSize - qrSize) / 2,
                frameY + (frameSize - qrSize) / 2,
                qrSize, qrSize);
        } catch (e) { console.warn('QR no disponible para exportar:', e); }

        y = frameY + frameSize + 6 * s;

        // Textos promocionales
        ctx.textAlign = 'center';

        ctx.fillStyle = BRAND.secondary;
        ctx.font = `700 ${12.5 * s}px Manrope, sans-serif`;
        ctx.fillText('\u00A1Escanea y descubre m\u00E1s!', W / 2, y + 13 * s);   y += 18 * s;

        ctx.font = `800 ${32 * s}px Manrope, sans-serif`;
        ctx.fillText('20% OFF', W / 2, y + 30 * s);                              y += 38 * s;

        ctx.fillStyle = BRAND.tagline;
        ctx.font = `600 ${11.5 * s}px Manrope, sans-serif`;
        ctx.fillText('en Cat\u00E1logo Extendido.*', W / 2, y + 13 * s);         y += 18 * s;

        ctx.fillStyle = BRAND.gray;
        ctx.font = `400 ${10 * s}px Manrope, sans-serif`;
        ctx.fillText('Aplican T&C.', W / 2, y + 12 * s);

        drawFooter(ctx, bw, H, W, s);
        ctx.restore();                 // fin del clip redondeado
        drawClip(ctx, W, s);           // ojillo siempre encima
    }

    /* ── RENDER CARA TRASERA ── */
    async function renderBack(ctx, W, H, s) {
        const bw = 5 * s, rc = 22 * s;

        ctx.fillStyle = BRAND.primary;
        rrect(ctx, 0, 0, W, H, rc); ctx.fill();
        // Clip redondeado: todo el contenido queda dentro del badge
        ctx.save();
        rrect(ctx, bw, bw, W - 2 * bw, H - 2 * bw, rc - bw);
        ctx.clip();
        ctx.fillStyle = BRAND.white;
        ctx.fillRect(0, 0, W, H);

        // Header rojo
        const hPadT = 28 * s, lineH = 14.4 * s;
        const headerH = hPadT + lineH * 2 + 4 * s + 14 * s;
        ctx.fillStyle = BRAND.primary;
        ctx.fillRect(bw, bw, W - 2 * bw, headerH);

        ctx.fillStyle    = BRAND.white;
        ctx.textAlign    = 'center';
        ctx.font         = `800 ${14.4 * s}px Manrope, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText('RECORDATORIOS',    W / 2, bw + hPadT + lineH * 0.5);
        ctx.fillText('PARA EL VENDEDOR', W / 2, bw + hPadT + lineH * 1.5 + 4 * s);
        ctx.textBaseline = 'alphabetic';

        // Bullet list
        const items = [
            'Invitar a escanear el QR para conocer el Cat\u00E1logo Extendido.',
            'Mencionar el 20% de descuento (tope $1000).',
            'Compra m\u00EDnima de $500 en productos del Cat\u00E1logo Extendido.',
            'V\u00E1lido 2 semanas.',
            '\u00A1Aumenta tus ventas!',
        ];

        const padX     = 16 * s;
        const fontSize  = 11.5 * s;
        const itemLineH = fontSize * 1.45;
        const bulletR   = 3 * s;
        const textX     = bw + padX + 12 * s;
        const maxTextW  = W - 2 * bw - padX - 12 * s - bw;
        let y = bw + headerH + 16 * s;

        ctx.font      = `600 ${fontSize}px Manrope, sans-serif`;
        ctx.textAlign = 'left';        // ← forzar izquierda (el header lo dejó en 'center')
        ctx.textBaseline = 'alphabetic';

        items.forEach(text => {
            // Bullet point rojo
            ctx.fillStyle = BRAND.primary;
            ctx.beginPath();
            ctx.arc(bw + padX - 2 * s, y + bulletR + 1 * s, bulletR, 0, Math.PI * 2);
            ctx.fill();

            // Texto alineado a la izquierda con word-wrap
            ctx.fillStyle = BRAND.dark;
            ctx.textAlign = 'left';    // ← reforzar en cada iteración
            const lastY = fillWrappedText(ctx, text, textX, y + fontSize, maxTextW, itemLineH);
            y = lastY + 10 * s;
        });

        drawFooter(ctx, bw, H, W, s);
        ctx.restore(); // fin del clip
        drawClip(ctx, W, s); // ojillo encima de todo
    }

    /* ── DOWNLOAD BADGE ──
       Escala 4× del tamaño visual actual → alta resolución para impresión agrupada
    ───────────────────────────────────────── */
    async function downloadBadge(face) {
        const btn = face === 'front'
            ? document.getElementById('btnDownloadFront')
            : document.getElementById('btnDownloadBack');
        btn.textContent = 'Generando...';
        btn.classList.add('btn-loading');

        try {
            await document.fonts.ready;

            const el    = document.getElementById(face === 'front' ? 'badgeFront' : 'badgeBack');
            const W_px  = el.getBoundingClientRect().width;

            // Altura natural del contenido — sin el flex-stretch del wrapper
            let H_px;
            if (face === 'front') {
                const topH    = el.querySelector('.badge-front-top').offsetHeight;
                const bodyH   = el.querySelector('.badge-body').offsetHeight;
                const footerH = el.querySelector('.badge-front-footer').offsetHeight;
                H_px = topH + bodyH + footerH + 10; // 5px borde top + 5px borde bottom
            } else {
                const topH    = el.querySelector('.badge-back-header').offsetHeight;
                const bodyH   = el.querySelector('.badge-back-body').offsetHeight;
                const footerH = el.querySelector('.badge-back-footer').offsetHeight;
                H_px = topH + bodyH + footerH + 10;
            }

            const SCALE  = 4;
            const canvas    = document.createElement('canvas');
            canvas.width    = Math.round(W_px  * SCALE);
            canvas.height   = Math.round(H_px  * SCALE);
            const ctx       = canvas.getContext('2d');
            const vendorId   = inputID.value.trim() || 'ID';
            const vendorName = inputNombre ? inputNombre.value.trim() : '';

            if (face === 'front') {
                await renderFront(ctx, canvas.width, canvas.height, SCALE, vendorId, vendorName);
            } else {
                await renderBack(ctx, canvas.width, canvas.height, SCALE);
            }

            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a   = document.createElement('a');
                const id  = vendorId.replace(/[^a-zA-Z0-9]/g, '');
                a.href     = url;
                a.download = `${id}_Gafete_${face === 'front' ? 'Frente' : 'Reverso'}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 'image/png');

        } catch (err) {
            console.error('Error al generar imagen:', err);
            alert('No se pudo generar la imagen. Intenta de nuevo.');
        } finally {
            btn.textContent = face === 'front' ? '\u2b07 Descargar Frente' : '\u2b07 Descargar Reverso';
            btn.classList.remove('btn-loading');
        }
    }

    document.getElementById('btnDownloadFront').addEventListener('click', () => downloadBadge('front'));
    document.getElementById('btnDownloadBack').addEventListener('click',  () => downloadBadge('back'));

}); // end DOMContentLoaded
