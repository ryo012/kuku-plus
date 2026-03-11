// グローバル変数
let currentQuestion = 1;
let targetQuestions = 5;
let score = 0;
let studentId = "";
let currentProblem = null;
let historyLog = []; // 解いた問題の履歴を記録

// 音声再生（オプション）
let isSoundEnabled = false;

// UI初期化
document.addEventListener('DOMContentLoaded', () => {
    initNumpad();
});

// テンキーの生成
function initNumpad() {
    const numpad = document.querySelector('.numpad');
    const nums = [7, 8, 9, 4, 5, 6, 1, 2, 3, 0];
    nums.forEach(n => {
        const btn = document.createElement('button');
        btn.className = 'num-btn';
        btn.textContent = n;
        btn.onclick = () => inputNum(n);
        numpad.appendChild(btn);
    });
}

// 画面遷移
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// 結果画面のリセット（再度プレイする時のため）
function resetResultScreen() {
    const jar = document.getElementById('jar-container');
    if (jar) jar.classList.remove('show');

    const popup = document.getElementById('multiplier-popup');
    if (popup) popup.classList.remove('show');

    const jarGlass = document.getElementById('jar-glass');
    if (jarGlass) jarGlass.innerHTML = ''; // ビンの中の星を空にする

    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) homeBtn.classList.remove('show');

    const msg = document.getElementById('screen-result-msg');
    if (msg) msg.style.opacity = 0;

    const earnedTokens = document.getElementById('earned-tokens');
    if (earnedTokens) earnedTokens.textContent = '0';

    // 降っている最中の星があれば消す
    document.getElementById('screen-result').querySelectorAll('.star').forEach(s => s.remove());
}

// ゲーム開始
function startGame(count) {
    const idInput = document.getElementById('student-id').value;
    if (!idInput) {
        alert("出席番号を入力してください！");
        return;
    }

    // 結果画面の演出状態をリセット
    resetResultScreen();

    studentId = idInput;
    targetQuestions = count;
    currentQuestion = 1;
    score = 0;
    historyLog = [];

    document.getElementById('current-score').textContent = score;
    showScreen('screen-game');
    generateQuestion();
}

// 問題生成: A × B + C
function generateQuestion() {
    clearInput();
    document.getElementById('question-count').textContent = `${currentQuestion}問目`;

    let A, B, C;
    A = Math.floor(Math.random() * 8) + 2; // 2〜9
    B = Math.floor(Math.random() * 8) + 2; // 2〜9

    // 実際の繰り上がり発生に近づけるため、1〜(A-1)の範囲にする（九九の繰り上がりは最大でもかける数-1のため）
    let maxCarry = A - 1;
    if (maxCarry < 1) maxCarry = 1;
    C = Math.floor(Math.random() * maxCarry) + 1; // 1〜maxCarry

    currentProblem = {
        A: A,
        B: B,
        C: C,
        ans: (A * B) + C
    };

    document.getElementById('q-a').textContent = A;
    document.getElementById('q-b').textContent = B;
    document.getElementById('q-c').textContent = C;

    document.getElementById('ok-btn').classList.remove('glow');
}

// 数字入力
function inputNum(num) {
    const el = document.getElementById('user-input');
    const box = document.getElementById('answer-box');

    if (el.textContent.length < 3) { // 最大3桁（念のため）
        el.textContent += num;
        box.classList.add('filled');
        checkAutoSubmit();
    }
}

function clearInput() {
    document.getElementById('user-input').textContent = "";
    const box = document.getElementById('answer-box');
    box.classList.remove('filled');
    box.classList.remove('error');
    document.getElementById('ok-btn').classList.remove('glow');
}

// 自動判定ロジック（答えの桁数に達したら自動で判定を走らせる、またはOKの光を出す）
function checkAutoSubmit() {
    if (!currentProblem) return;
    const userVal = document.getElementById('user-input').textContent;
    const ansStr = currentProblem.ans.toString();

    if (userVal.length === ansStr.length) {
        // 設定桁数に達したらOKボタンを光らせるか、即座に判定する
        document.getElementById('ok-btn').classList.add('glow');
        // 今回は自動ではなく、OKを押させる（確実性重視）
        // checkAnswer(); 
    } else {
        document.getElementById('ok-btn').classList.remove('glow');
    }
}

// 答え合わせ
function checkAnswer() {
    if (!currentProblem) return;
    const userVal = document.getElementById('user-input').textContent;
    if (!userVal) return;

    const box = document.getElementById('answer-box');

    if (parseInt(userVal) === currentProblem.ans) {
        // 正解
        score++;
        document.getElementById('current-score').textContent = score;

        // 履歴記録
        historyLog.push(`${currentProblem.A}×${currentProblem.B}+${currentProblem.C}=${userVal}(o)`);

        // はなまる演出
        box.style.backgroundColor = '#C8E6C9';
        const randomId = 'hanamaru-' + (Math.floor(Math.random() * 5) + 1);
        const hanamaruEl = document.getElementById(randomId);
        if (hanamaruEl) hanamaruEl.classList.add('show');

        setTimeout(() => {
            if (hanamaruEl) hanamaruEl.classList.remove('show');
            box.style.backgroundColor = '';
            nextQuestion();
        }, 800);
    } else {
        // 不正解
        historyLog.push(`${currentProblem.A}×${currentProblem.B}+${currentProblem.C}=${userVal}(x)`);

        box.classList.add('error');
        setTimeout(() => box.classList.remove('error'), 400);
        document.getElementById('user-input').textContent = "";
        box.classList.remove('filled');
        document.getElementById('ok-btn').classList.remove('glow');
    }
}

// 次の問題へ
function nextQuestion() {
    currentQuestion++;
    if (currentQuestion > targetQuestions) {
        finishGame();
    } else {
        generateQuestion();
    }
}

// ゲーム終了、結果画面へ
function finishGame() {
    showScreen('screen-result');
    document.getElementById('result-text').textContent = `${targetQuestions}問中 ${score}問 正解！`;

    let baseTokens = score;
    document.getElementById('earned-tokens').textContent = baseTokens;

    if (baseTokens > 0) {
        // GASへ送信する実際のトークン数
        let totalTokens = baseTokens * 3;

        // すぐにGASへデータ送信（確実性を担保）
        sendDataToGAS(totalTokens);

        // 1. ビンを下からスライドイン
        setTimeout(() => {
            const jar = document.getElementById('jar-container');
            if (jar) jar.classList.add('show');

            // 2. 「× 3」のポップアップを表示
            setTimeout(() => {
                const popup = document.getElementById('multiplier-popup');
                if (popup) popup.classList.add('show');

                // 3. トークン数を3倍に変更（表示も確実に行う）
                setTimeout(() => {
                    document.getElementById('earned-tokens').textContent = totalTokens;

                    // 4. 星の放出アニメーション（端末負荷を考慮して数を制限）
                    // ※ 見た目上の星の数であり、実際のトークン数とは切り離す
                    const dispCount = Math.min(totalTokens, 20);
                    createFallingStars(dispCount, totalTokens);
                }, 800);
            }, 800);
        }, 500);
    } else {
        // 0点の場合はそのままホームボタン表示
        document.getElementById('home-btn').classList.add('show');
        document.getElementById('screen-result-msg').style.opacity = 1;
        // 0点でも一応履歴は残すため送信
        sendDataToGAS(0);
    }
}

// 獲得したトークンの数だけ星を降らせてビンに入れる
function createFallingStars(visualCount, totalTokens) {
    const screen = document.getElementById('screen-result');
    const tokenDisplay = document.querySelector('.token-count');
    const jarGlass = document.getElementById('jar-glass');

    // 安全装置: アニメーションの進捗に関わらず、必ず一定時間後にホームボタンを出す
    // 星1個150ms間隔 + アニメーション時間最大2秒 ＋ 余裕2秒
    const fallbackTime = (visualCount * 150) + 4000;
    setTimeout(() => {
        document.getElementById('home-btn').classList.add('show');
        document.getElementById('screen-result-msg').style.opacity = 1;
    }, fallbackTime);

    // 最初の星の発生元（トークンの数字のあたり）
    const startRect = tokenDisplay.getBoundingClientRect();
    const startX = startRect.left + startRect.width / 2;
    const startY = startRect.top + startRect.height / 2;

    // 最終的な落下先（ビンの中央付近の座標を計算）
    const endRect = jarGlass.getBoundingClientRect();
    const endX = endRect.left + endRect.width / 2;
    const endY = endRect.top + 20;

    let jarStars = 0;

    // 既存の星をクリア
    jarGlass.innerHTML = '';

    for (let i = 0; i < visualCount; i++) {
        setTimeout(() => {
            const star = document.createElement('div');
            star.classList.add('star');

            // 少し散らばらせてからビンへ向かう
            const spreadX = (Math.random() - 0.5) * 200;
            const spreadY = (Math.random() - 0.5) * 100 - 50;
            const randomScale = Math.random() * 0.4 + 0.6;

            star.style.left = `${startX - 15}px`; // star width offset
            star.style.top = `${startY - 15}px`;
            star.style.transform = `scale(${randomScale})`;

            screen.appendChild(star);

            try {
                // Web Animations APIでアニメーション
                const animation = star.animate([
                    { transform: `translate(0, 0) scale(${randomScale}) rotate(0deg)`, opacity: 0 },
                    { transform: `translate(${spreadX}px, ${spreadY}px) scale(${randomScale * 1.5}) rotate(180deg)`, opacity: 1, offset: 0.3 },
                    { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(${randomScale * 0.5}) rotate(360deg)`, opacity: 1 }
                ], {
                    duration: 1200 + Math.random() * 400, // 1.2 ~ 1.6秒
                    easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
                    fill: 'forwards'
                });

                animation.onfinish = () => {
                    handleStarFallFinish(star, randomScale, jarGlass);
                };
            } catch (e) {
                // Web Animations APIがサポートされていないかエラーが起きた場合のフォールバック
                console.warn("Animation error:", e);
                handleStarFallFinish(star, randomScale, jarGlass);
            }

            function handleStarFallFinish(starEl, scale, jarEl) {
                // アニメーションが終わった星は削除
                starEl.remove();

                // ビンの中に溜まる用の新しい星を作成
                const insideStar = document.createElement('div');
                insideStar.classList.add('star');

                // ビンの中用のスタイル
                insideStar.style.position = 'absolute';
                const finalScale = scale * 0.7;
                insideStar.style.transform = `scale(${finalScale}) rotate(${Math.random() * 360}deg)`;

                // ボトムから0〜30pxくらい、左右はランダムに配置して山積みに見せる
                const jarW = jarEl.clientWidth;
                // 星のサイズは約20px (30px * 0.7)
                const randomLeft = Math.random() * (jarW - 25) + 2;

                // たくさん溜まると上に積まれるようにする簡易計算
                const row = Math.floor(jarStars / 4); // 1段あたり4個くらい
                const randomBottom = Math.random() * 10 + row * 8 + 5;

                insideStar.style.left = `${randomLeft}px`;
                insideStar.style.bottom = `${randomBottom}px`;

                jarEl.appendChild(insideStar);

                jarStars++;

                // 少しビンを揺らす演出
                jarEl.style.transform = "scale(1.05)";
                setTimeout(() => jarEl.style.transform = "scale(1)", 100);

                // 最後の星が入ったらホームボタンなどを表示
                if (jarStars === visualCount) {
                    setTimeout(() => {
                        document.getElementById('home-btn').classList.add('show');
                        document.getElementById('screen-result-msg').style.opacity = 1;
                    }, 500);
                }
            }
        }, i * 150); // 0.15秒おきに生成
    }
}

// GAS連携処理
function sendDataToGAS(tokens) {
    const GAS_URL = "https://script.google.com/macros/s/AKfycbw0qStrpeZZqHBf_ND9CorIQ_kRCyq8LQ1BlmxfIFwXNXBcfR13A6lJxAYr-S4Er8U-6A/exec";

    const payload = {
        appType: "kuku-plus",
        studentId: studentId,
        questions: score,
        tokens: tokens, // トークン数
        history: historyLog.join("\n") // 改行区切りで履歴を送信
    };

    fetch(GAS_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain', // GAS側CORS対応のためtext/plain
        },
        body: JSON.stringify(payload)
    }).then(response => response.json())
        .then(data => console.log('送信成功:', data))
        .catch(error => console.error('送信エラー:', error));
}

function goHome() {
    showScreen('screen-start');
}
