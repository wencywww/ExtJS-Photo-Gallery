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