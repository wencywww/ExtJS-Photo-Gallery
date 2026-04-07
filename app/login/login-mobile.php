    <!DOCTYPE html>
    <html lang="<?= htmlspecialchars($glob['dzzLang'], ENT_QUOTES) ?>">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title><?= htmlspecialchars($DZZ_LOC_STRINGS['common']['GALLERY-TITLE'], ENT_QUOTES) ?></title>
        <link rel="stylesheet" href="../inc/css/mobile/roboto.css">
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

            .form-group label {
                display: block;
                font-size: 13px;
                color: #666;
                margin-bottom: 5px;
                font-weight: 500;
            }

            input {
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

            /* Language combo */
            .lang-combo {
                position: relative;
                width: 100%;
            }

            .lang-combo-display {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 14px;
                border: 1px solid var(--border-color);
                border-radius: 10px;
                background: var(--input-bg);
                font-size: 16px;
                cursor: pointer;
                user-select: none;
                box-sizing: border-box;
            }

            .lang-combo-display:hover {
                border-color: #aaa;
            }

            .lang-combo-display.open {
                border-color: var(--primary-color);
            }

            .lang-combo-arrow {
                margin-left: auto;
                color: #888;
                font-size: 12px;
                transition: transform 0.15s;
            }

            .lang-combo-display.open .lang-combo-arrow {
                transform: rotate(180deg);
            }

            .lang-combo-dropdown {
                display: none;
                position: absolute;
                top: calc(100% + 4px);
                left: 0;
                right: 0;
                background: var(--card-bg);
                border: 1px solid var(--border-color);
                border-radius: 10px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.12);
                z-index: 10;
                overflow: hidden;
            }

            .lang-combo-dropdown.open {
                display: block;
            }

            .lang-combo-opt {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 14px;
                font-size: 15px;
                cursor: pointer;
                color: #333;
            }

            .lang-combo-opt:hover {
                background: #f3eaff;
                color: var(--primary-color);
            }

            .lang-combo-opt.selected {
                font-weight: 500;
                color: var(--primary-color);
            }

            .lang-combo-opt + .lang-combo-opt {
                border-top: 1px solid var(--border-color);
            }

            .lang-flag {
                width: 16px;
                height: 11px;
                display: block;
                flex-shrink: 0;
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
            .app-version {
                margin-top: 16px;
                text-align: center;
                font-size: 12px;
                color: #aaa;
                letter-spacing: 0.03em;
            }
        </style>
    </head>

    <body>

        <div class="login-card">
            <h2><?= htmlspecialchars($DZZ_LOC_STRINGS['loginForm']['loginWinTitle'], ENT_QUOTES) ?></h2>

            <div class="form-group">
                <label for="username"><?= htmlspecialchars($DZZ_LOC_STRINGS['loginForm']['lblUser'], ENT_QUOTES) ?></label>
                <input type="text" id="username" autocomplete="username">
            </div>
            <div class="form-group">
                <label for="password"><?= htmlspecialchars($DZZ_LOC_STRINGS['loginForm']['lblPass'], ENT_QUOTES) ?></label>
                <input type="password" id="password" autocomplete="current-password">
            </div>
<?php
    $langs = [
        'bg' => ['name' => 'Български', 'flag' => 'bg.png'],
        'en' => ['name' => 'English',   'flag' => 'gb.png'],
    ];
    $cur = $glob['dzzLang'];
?>
            <div class="form-group">
                <label><?= htmlspecialchars($DZZ_LOC_STRINGS['loginForm']['lblLanguage'], ENT_QUOTES) ?></label>
                <div class="lang-combo" id="langCombo">
                    <div class="lang-combo-display" id="langDisplay" tabindex="0">
                        <img class="lang-flag" src="../inc/css/pictures/silk-flags/icons/<?= $langs[$cur]['flag'] ?>" alt="<?= $cur ?>">
                        <span id="langDisplayName"><?= htmlspecialchars($langs[$cur]['name'], ENT_QUOTES) ?></span>
                        <span class="lang-combo-arrow">&#9660;</span>
                    </div>
                    <div class="lang-combo-dropdown" id="langDropdown">
<?php foreach ($langs as $val => $info): ?>
                        <div class="lang-combo-opt<?= $val === $cur ? ' selected' : '' ?>" data-val="<?= $val ?>">
                            <img class="lang-flag" src="../inc/css/pictures/silk-flags/icons/<?= $info['flag'] ?>" alt="<?= $val ?>">
                            <?= htmlspecialchars($info['name'], ENT_QUOTES) ?>
                        </div>
<?php endforeach; ?>
                    </div>
                </div>
            </div>

            <button id="loginBtn">
                <span id="btnText"><?= htmlspecialchars($DZZ_LOC_STRINGS['loginForm']['btnLogin'], ENT_QUOTES) ?></span>
                <div class="spinner" id="spinner"></div>
            </button>
            <div class="app-version"><?= htmlspecialchars($DZZ_LOC_STRINGS['commonJS']['appVersionLabel'], ENT_QUOTES) ?> <?= APP_VERSION ?></div>
        </div>

        <div id="modalOverlay">
            <div class="modal">
                <h3 id="mTitle"></h3>
                <p id="mText"></p>
                <button class="modal-btn" onclick="closeModal()"><?= htmlspecialchars($DZZ_LOC_STRINGS['loginForm']['modalOK'], ENT_QUOTES) ?></button>
            </div>
        </div>

        <script>
            const L = {
                btnLogin:     '<?= htmlspecialchars($DZZ_LOC_STRINGS['loginForm']['btnLogin'],     ENT_QUOTES) ?>',
                btnLoading:   '<?= htmlspecialchars($DZZ_LOC_STRINGS['loginForm']['btnLoading'],   ENT_QUOTES) ?>',
                errorTitle:   '<?= htmlspecialchars($DZZ_LOC_STRINGS['common']['ERROR'],           ENT_QUOTES) ?>',
                errorNoServer:'<?= htmlspecialchars($DZZ_LOC_STRINGS['loginForm']['errorNoServer'],ENT_QUOTES) ?>'
            };

            const btn     = document.getElementById('loginBtn');
            const btnText = document.getElementById('btnText');
            const spinner = document.getElementById('spinner');
            let   currentLang = <?= json_encode($glob['dzzLang']) ?>;

            // Language combo
            const langDisplay  = document.getElementById('langDisplay');
            const langDropdown = document.getElementById('langDropdown');

            function closeLangDropdown() {
                langDropdown.style.display = 'none';
                langDisplay.classList.remove('open');
            }

            langDisplay.addEventListener('click', function(e) {
                e.stopPropagation();
                const isOpen = langDropdown.style.display === 'block';
                if (isOpen) {
                    closeLangDropdown();
                } else {
                    langDropdown.style.display = 'block';
                    langDisplay.classList.add('open');
                }
            });

            langDropdown.addEventListener('click', function(e) {
                e.stopPropagation();
                const opt = e.target.closest('.lang-combo-opt');
                if (!opt) return;
                const newLang = opt.dataset.val;
                const changed = newLang !== currentLang;
                currentLang = newLang;
                langDisplay.querySelector('.lang-flag').src = opt.querySelector('.lang-flag').src;
                document.getElementById('langDisplayName').textContent = opt.textContent.trim();
                langDropdown.querySelectorAll('.lang-combo-opt').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                closeLangDropdown();
                document.cookie = 'ext-gallery-UILang=' + currentLang + '; path=/; max-age=31536000';
                if (changed) window.location.reload();
            });

            document.addEventListener('click', closeLangDropdown);

            // Enter key submits
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') btn.click();
            });

            btn.addEventListener('click', async () => {
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value;
                if (!username || !password) return;

                btn.disabled = true;
                btnText.innerText = L.btnLoading;
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
                        document.cookie = 'ext-gallery-UILang=' + currentLang + '; path=/; max-age=31536000';
                        window.location.href = '../dzz/mobile/';
                    } else {
                        showModal(data.Title, data.Text);
                    }
                } catch (error) {
                    showModal(L.errorTitle, L.errorNoServer);
                } finally {
                    btn.disabled = false;
                    btnText.innerText = L.btnLogin;
                    spinner.style.display = 'none';
                }
            });

            function showModal(title, text) {
                const lf = <?= json_encode([
                    'errorTitle'   => $DZZ_LOC_STRINGS['common']['ERROR'],
                    'errorInvalid' => $DZZ_LOC_STRINGS['common']['passwordInvalid']
                ]) ?>;
                document.getElementById('mTitle').innerText = title || lf.errorTitle;
                document.getElementById('mText').innerText  = text  || lf.errorInvalid;
                document.getElementById('modalOverlay').style.display = 'flex';
            }

            function closeModal() {
                document.getElementById('modalOverlay').style.display = 'none';
            }
        </script>

    </body>

    </html>
