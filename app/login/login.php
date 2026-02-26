<?php
require("../inc/globals/globals.inc.php");

function isMobile()
{
    // 1. Sec-CH-UA-Mobile: modern Android Chrome sends '?1' (most reliable)
    if (isset($_SERVER['HTTP_SEC_CH_UA_MOBILE'])) {
        return $_SERVER['HTTP_SEC_CH_UA_MOBILE'] === '?1';
    }
    // 2. Legacy WAP profile header (older feature phones / some Android browsers)
    if (isset($_SERVER['HTTP_X_WAP_PROFILE'])) {
        return true;
    }
    // 3. UA string fallback — covers iOS Safari, older Android, etc.
    //    Note: iPadOS 13+ reports desktop Safari UA, so tablets may land here as desktop.
    //    A JS-side redirect (?mobile=1) below catches that case.
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
    return (bool) preg_match('/(android|iphone|ipad|ipod|mobile|blackberry|windows phone)/i', $ua);
}
// Allow explicit override via query param (JS redirect for edge-case devices)
if (isset($_GET['mobile'])) {
    $isMobile = (bool)$_GET['mobile'];
} else {
    $isMobile = isMobile();
}

if ($isMobile):
?>
    <!DOCTYPE html>
    <html lang="<?= htmlspecialchars($glob['dzzLang'], ENT_QUOTES) ?>">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title><?= htmlspecialchars($DZZ_LOC_STRINGS['common']['GALLERY-TITLE'], ENT_QUOTES) ?></title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet">
        <style>
            :root {
                --primary-color: #6200ee;
                --bg-page: #f0f2f5;
                --card-bg: #ffffff;
                --input-bg: #ffffff;
                --border-color: #ddd;
            }

            body,
            html {
                height: 100%;
                margin: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: 'Roboto', sans-serif;
                background-color: var(--bg-page);
            }

            .login-card {
                background-color: var(--card-bg);
                width: 90%;
                max-width: 360px;
                padding: 40px 30px;
                border-radius: 16px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
            }

            h2 {
                margin: 0 0 25px 0;
                font-weight: 500;
                font-size: 22px;
                text-align: center;
                color: #222;
            }

            .form-group {
                width: 100%;
                margin-bottom: 15px;
            }

            input,
            select {
                width: 100%;
                padding: 14px;
                border: 1px solid var(--border-color);
                border-radius: 10px;
                font-size: 16px;
                box-sizing: border-box;
                background-color: var(--input-bg);
                -webkit-appearance: none;
                appearance: none;
            }

            input:focus {
                outline: none;
                border-color: var(--primary-color);
            }

            #loginBtn {
                width: 100%;
                padding: 15px;
                background-color: var(--primary-color);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                display: flex;
                justify-content: center;
                align-items: center;
                margin-top: 10px;
            }

            .spinner {
                display: none;
                width: 18px;
                height: 18px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top-color: #fff;
                animation: spin 0.8s linear infinite;
                margin-left: 10px;
            }

            @keyframes spin {
                to {
                    transform: rotate(360deg);
                }
            }

            #modalOverlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }

            .modal {
                background: white;
                padding: 24px;
                border-radius: 16px;
                width: 80%;
                max-width: 280px;
                text-align: center;
                box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
            }

            .modal h3 {
                margin-top: 0;
                font-size: 18px;
                color: #d32f2f;
            }

            .modal p {
                color: #555;
                font-size: 14px;
                margin-bottom: 20px;
            }

            .modal-btn {
                background: none;
                border: none;
                color: var(--primary-color);
                font-weight: bold;
                font-size: 16px;
                cursor: pointer;
            }
        </style>
    </head>

    <body>

        <div class="login-card">
            <h2>Вход</h2>

            <div class="form-group">
                <input type="text" id="username" placeholder="Потребител" autocomplete="username">
            </div>
            <div class="form-group">
                <input type="password" id="password" placeholder="Парола" autocomplete="current-password">
            </div>
            <div class="form-group">
                <select id="language">
                    <option value="bg">Български</option>
                    <option value="en">English</option>
                </select>
            </div>

            <button id="loginBtn">
                <span id="btnText">ВХОД</span>
                <div class="spinner" id="spinner"></div>
            </button>
        </div>

        <div id="modalOverlay">
            <div class="modal">
                <h3 id="mTitle"></h3>
                <p id="mText"></p>
                <button class="modal-btn" onclick="closeModal()">ОК</button>
            </div>
        </div>

        <script>
            const btn = document.getElementById('loginBtn');
            const btnText = document.getElementById('btnText');
            const spinner = document.getElementById('spinner');
            const langSel = document.getElementById('language');

            // Pre-select current language (set server-side via cookie)
            langSel.value = <?= json_encode($glob['dzzLang']) ?>;

            // Language change: update cookie (no reload needed for login page)
            langSel.addEventListener('change', function() {
                document.cookie = 'ext-gallery-UILang=' + this.value + '; path=/; max-age=31536000';
            });

            // Enter key submits
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') btn.click();
            });

            btn.addEventListener('click', async () => {
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value;
                if (!username || !password) return;

                btn.disabled = true;
                btnText.innerText = 'ЗАРЕЖДАНЕ';
                spinner.style.display = 'block';

                try {
                    const body = new URLSearchParams({
                        userName: username,
                        userPassword: password
                    });
                    const response = await fetch('php/doAction.php', {
                        method: 'POST',
                        body: body
                    });
                    const data = await response.json();

                    if (data.success) {
                        // Persist chosen language before navigating to the app
                        document.cookie = 'ext-gallery-UILang=' + langSel.value + '; path=/; max-age=31536000';
                        window.location.href = '../dzz-mobile/';
                    } else {
                        showModal(data.Title, data.Text);
                    }
                } catch (error) {
                    showModal('Грешка', 'Няма връзка със сървъра.');
                } finally {
                    btn.disabled = false;
                    btnText.innerText = 'ВХОД';
                    spinner.style.display = 'none';
                }
            });

            function showModal(title, text) {
                document.getElementById('mTitle').innerText = title || 'Грешка';
                document.getElementById('mText').innerText = text || 'Невалидни данни.';
                document.getElementById('modalOverlay').style.display = 'flex';
            }

            function closeModal() {
                document.getElementById('modalOverlay').style.display = 'none';
            }
        </script>

    </body>

    </html>
<?php else: ?>
    <!DOCTYPE html>
    <html>

    <head>
        <title><?= $DZZ_LOC_STRINGS['common']['GALLERY-TITLE'] ?></title>

        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">

        <!-- JS fallback: redirect touch-primary devices that PHP missed (e.g. iPad) -->
        <script>
            if (window.matchMedia('(pointer: coarse)').matches && screen.width <= 1024) {
                window.location.replace('Login.php?mobile=1');
            }
        </script>

        <!-- Font awesome -->
        <link rel="stylesheet" type="text/css" href="<?= $glob['paths']['font-awesomeCSS']; ?>" />

        <!-- ExtJS initialization stuff -->
        <link rel="stylesheet" type="text/css" href="<?= $glob['paths']['extThemeCSS'] ?>" />
        <script type="text/javascript" src="<?= $glob['paths']['extAllJS'] ?>"></script>
        <script type="text/javascript" src="<?= $glob['paths']['extThemeJS'] ?>"></script>

        <!-- ExtJS localization support -->
        <script type="text/javascript" src="<?= $glob['paths']['extLocaleJS'] ?>"></script>

        <!-- initialize the current language (app-specific) strings -->
        <script type="text/javascript" src="<?= $glob['paths']['appRootPrefix'] ?>/locale/js/initLang.js"></script>

        <!-- app specific css -->
        <link rel="stylesheet" type="text/css" href="<?= $glob['paths']['appRootPrefix'] ?>/inc/css/dzzCustom.css" />

        <!-- Common JS Stuff -->
        <script type="text/javascript"
            src="<?= $glob['paths']['appRootPrefix'] ?>/inc/js/common/commonFunctions.js"></script>

        <!-- Common ExtJS overrides -->
        <script type="text/javascript"
            src="<?= $glob['paths']['appRootPrefix'] ?>/inc/js/common/commonOverrides.js"></script>

        <!-- Include the main JavaScript file -->
        <script type="text/javascript" src="<?= $glob['paths']['appRootPrefix'] ?>/login/js/Main.js"></script>

    </head>

    <body>
    </body>

    </html>
<?php endif; ?>