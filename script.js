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

// ゲーム開始
function startGame(count) {
    const idInput = document.getElementById('student-id').value;
    if (!idInput) {
        alert("出席番号を入力してください！");
        return;
    }

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

    let tokens = Math.floor(score / 5) * 2; // 5問正解ごとに2トークンとか（暫定）
    if (tokens === 0 && score > 0) tokens = 1; // 1問でも解ければ1トークンとする

    document.getElementById('earned-tokens').textContent = tokens;

    // GASへデータ送信
    sendDataToGAS(tokens);
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
