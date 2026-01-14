// 六十四卦抽牌游戏 - 主程序

// 游戏状态
let gameState = {
    currentGesture: 'none', // none, palm, sword, fist
    isShuffling: false,
    selectedCard: null,
    isCardFlipped: false,
    handsDetected: false
};

// 界面元素
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const canvasCtx = canvas.getContext('2d');
const gestureHint = document.getElementById('gestureHint');
const statusText = document.getElementById('statusText');
const compassContainer = document.getElementById('compassContainer');
const selectedCardContainer = document.getElementById('selectedCardContainer');
const cardInner = document.getElementById('cardInner');
const cardFront = document.getElementById('cardFront');

// 手势识别相关
let hands = null;
let camera = null;

// 初始化
async function init() {
    statusText.textContent = '正在初始化摄像头...';
    
    // 初始化手势识别
    hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });
    
    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
    });
    
    hands.onResults(onHandResults);
    
    // 初始化摄像头
    camera = new Camera(video, {
        onFrame: async () => {
            await hands.send({ image: video });
        },
        width: 320,
        height: 240
    });
    
    try {
        await camera.start();
        statusText.textContent = '请伸开手掌开始洗牌';
        createCompassCards();
    } catch (error) {
        statusText.textContent = '摄像头启动失败，请检查权限';
        console.error('摄像头错误:', error);
    }
}

// 创建罗盘式卡牌
function createCompassCards() {
    compassContainer.innerHTML = '';
    const cardCount = 64;
    const radius = 220; // 增大半径
    
    // 在中心添加太极图
    const centerYinyang = document.createElement('div');
    centerYinyang.className = 'center-yinyang';
    centerYinyang.innerHTML = `
        <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50" fill="#fff"/>
            <path d="M50,0 A50,50 0 0,1 50,100 A25,25 0 0,1 50,50 A25,25 0 0,0 50,0" fill="#000"/>
            <circle cx="50" cy="25" r="12" fill="#fff"/>
            <circle cx="50" cy="25" r="5" fill="#000"/>
            <circle cx="50" cy="75" r="12" fill="#000"/>
            <circle cx="50" cy="75" r="5" fill="#fff"/>
        </svg>
    `;
    compassContainer.appendChild(centerYinyang);
    
    // 创建64张牌，但跳过第一张（稍后特殊处理）
    for (let i = 1; i < cardCount; i++) {
        const angle = (i / cardCount) * 2 * Math.PI - Math.PI / 2;
        const angleDeg = (i / cardCount) * 360;
        const card = document.createElement('div');
        card.className = 'mini-card';
        card.dataset.index = i;
        
        const x = Math.cos(angle) * radius + 250 - 30;
        const y = Math.sin(angle) * radius + 250 - 45;
        card.style.left = `${x}px`;
        card.style.top = `${y}px`;
        card.style.transform = `rotate(${angleDeg + 90}deg)`;
        card.style.zIndex = i;
        
        // 添加太极图案
        card.innerHTML = `
            <svg class="mini-yinyang-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" fill="#fff"/>
                <path d="M50,0 A50,50 0 0,1 50,100 A25,25 0 0,1 50,50 A25,25 0 0,0 50,0" fill="#000"/>
                <circle cx="50" cy="25" r="12" fill="#fff"/>
                <circle cx="50" cy="25" r="5" fill="#000"/>
                <circle cx="50" cy="75" r="12" fill="#000"/>
                <circle cx="50" cy="75" r="5" fill="#fff"/>
            </svg>
        `;
        
        compassContainer.appendChild(card);
    }
    
    // 最后添加第一张牌，z-index设为0（在最底层）
    const firstAngle = -Math.PI / 2;
    const firstAngleDeg = 0;
    const firstX = Math.cos(firstAngle) * radius + 250 - 30;
    const firstY = Math.sin(firstAngle) * radius + 250 - 45;
    
    const firstCard = document.createElement('div');
    firstCard.className = 'mini-card';
    firstCard.dataset.index = 0;
    firstCard.style.left = `${firstX}px`;
    firstCard.style.top = `${firstY}px`;
    firstCard.style.transform = `rotate(${firstAngleDeg + 90}deg)`;
    firstCard.style.zIndex = 0;
    
    // 第一张牌也加上太极图案
    firstCard.innerHTML = `
        <svg class="mini-yinyang-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50" fill="#fff"/>
            <path d="M50,0 A50,50 0 0,1 50,100 A25,25 0 0,1 50,50 A25,25 0 0,0 50,0" fill="#000"/>
            <circle cx="50" cy="25" r="12" fill="#fff"/>
            <circle cx="50" cy="25" r="5" fill="#000"/>
            <circle cx="50" cy="75" r="12" fill="#000"/>
            <circle cx="50" cy="75" r="5" fill="#fff"/>
        </svg>
    `;
    
    compassContainer.appendChild(firstCard);
}

// 手势识别结果处理
function onHandResults(results) {
    // 绘制手部关键点
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        gameState.handsDetected = true;
        const landmarks = results.multiHandLandmarks[0];
        
        // 绘制手部
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
            color: '#00D9FF',
            lineWidth: 3
        });
        drawLandmarks(canvasCtx, landmarks, {
            color: '#FFFFFF',
            lineWidth: 2,
            radius: 5,
            fillColor: '#00D9FF'
        });
        
        // 识别手势
        const gesture = recognizeGesture(landmarks);
        handleGestureChange(gesture);
    } else {
        gameState.handsDetected = false;
        if (gameState.currentGesture !== 'none') {
            handleGestureChange('none');
        }
    }
    
    canvasCtx.restore();
}

// 手势识别
function recognizeGesture(landmarks) {
    // 获取关键点
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    const thumbIP = landmarks[3];
    const indexPIP = landmarks[6];
    const middlePIP = landmarks[10];
    const ringPIP = landmarks[14];
    const pinkyPIP = landmarks[18];
    
    const wrist = landmarks[0];
    const indexMCP = landmarks[5];
    const middleMCP = landmarks[9];
    const ringMCP = landmarks[13];
    const pinkyMCP = landmarks[17];
    
    // 判断手指是否伸直
    const isIndexExtended = indexTip.y < indexPIP.y;
    const isMiddleExtended = middleTip.y < middlePIP.y;
    const isRingExtended = ringTip.y < ringPIP.y;
    const isPinkyExtended = pinkyTip.y < pinkyPIP.y;
    const isThumbExtended = Math.abs(thumbTip.x - wrist.x) > 0.1;
    
    // 判断手指是否蜷缩
    const isRingCurled = ringTip.y > ringMCP.y;
    const isPinkyCurled = pinkyTip.y > pinkyMCP.y;
    const isThumbCurled = Math.abs(thumbTip.x - indexMCP.x) < 0.08;
    
    // 伸开手掌：所有手指都伸直
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
        return 'palm';
    }
    
    // 剑指：食指和中指伸直，其他蜷缩
    if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
        return 'sword';
    }
    
    // 握拳：所有手指都蜷缩
    if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
        return 'fist';
    }
    
    return 'none';
}

// 处理手势变化
function handleGestureChange(newGesture) {
    if (newGesture === gameState.currentGesture) return;
    
    const oldGesture = gameState.currentGesture;
    gameState.currentGesture = newGesture;
    
    switch (newGesture) {
        case 'palm':
            gestureHint.textContent = '手掌张开 - 洗牌中';
            statusText.textContent = '洗牌中...变为剑指可抽牌';
            startShuffle();
            break;
        case 'sword':
            gestureHint.textContent = '剑指 - 抽牌';
            if (gameState.isShuffling && !gameState.selectedCard) {
                stopShuffle();
                drawCard();
            } else if (gameState.selectedCard && !gameState.isCardFlipped) {
                statusText.textContent = '握拳翻牌';
            }
            break;
        case 'fist':
            gestureHint.textContent = '握拳 - 翻牌';
            if (gameState.selectedCard && !gameState.isCardFlipped) {
                flipCard();
            }
            break;
        case 'none':
            gestureHint.textContent = '请伸开手掌开始洗牌';
            if (!gameState.selectedCard) {
                statusText.textContent = '请伸开手掌开始洗牌';
            }
            break;
    }
}

// 开始洗牌
function startShuffle() {
    if (gameState.selectedCard) {
        resetGame();
    }
    gameState.isShuffling = true;
    compassContainer.style.display = 'block';
    selectedCardContainer.style.display = 'none';
    
    compassContainer.classList.add('shuffling');
}

// 停止洗牌
function stopShuffle() {
    gameState.isShuffling = false;
    compassContainer.classList.remove('shuffling');
}

// 抽牌
function drawCard() {
    // 随机选择一张卦
    const randomIndex = Math.floor(Math.random() * guaData.length);
    gameState.selectedCard = guaData[randomIndex];
    
    // 隐藏罗盘，显示抽出的牌
    compassContainer.style.display = 'none';
    selectedCardContainer.style.display = 'block';
    
    // 重置翻牌状态
    gameState.isCardFlipped = false;
    cardInner.classList.remove('flipped');
    
    // 添加抽牌动画
    selectedCardContainer.querySelector('.card').classList.add('card-drawn');
    
    statusText.textContent = '已抽出一卦，握拳翻牌查看';
    
    // 预先填充卡牌正面内容
    renderCardFront(gameState.selectedCard);
}

// 翻牌
function flipCard() {
    if (!gameState.selectedCard || gameState.isCardFlipped) return;
    
    gameState.isCardFlipped = true;
    cardInner.classList.add('flipped');
    
    statusText.textContent = `${gameState.selectedCard.fullName} - 伸开手掌重新洗牌`;
}

// 数字转中文
function numberToChinese(num) {
    const chineseNums = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    const chineseUnits = ['', '十', '百'];
    
    if (num <= 10) {
        return ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][num];
    }
    
    if (num < 20) {
        return '十' + chineseNums[num - 10];
    }
    
    if (num < 100) {
        const tens = Math.floor(num / 10);
        const ones = num % 10;
        return chineseNums[tens] + '十' + (ones > 0 ? chineseNums[ones] : '');
    }
    
    return num.toString();
}

// 渲染卡牌正面 - 简化版
function renderCardFront(gua) {
    const yaoHtml = renderYaoSymbol(gua.yao);
    const chineseNumber = numberToChinese(gua.number);
    
    cardFront.innerHTML = `
        <div class="card-header">
            <span class="card-number">${gua.number}</span>
            <span class="card-name">${gua.name}</span>
            <div class="card-trigrams">
                <div>${gua.upperTrigram}上</div>
                <div>${gua.lowerTrigram}下</div>
            </div>
        </div>
        <div class="gua-symbol">
            ${yaoHtml}
        </div>
        <div class="card-explanation">${gua.explanation}</div>
        <div class="card-yaoci">
            ${gua.yaoci.map(yc => `<div style="margin-bottom: 4px;">${yc}</div>`).join('')}
        </div>
        <div class="card-footer">${gua.name}卦第${chineseNumber}　　${gua.fullName}</div>
    `;
}

// 渲染卦象
function renderYaoSymbol(yao) {
    if (!yao || yao.length !== 6) {
        console.error('卦象数据错误:', yao);
        return '<div style="color: red;">卦象数据错误</div>';
    }
    
    // 从上到下显示（数组是从下到上存储的）
    const reversedYao = [...yao].reverse();
    let html = '';
    
    // 上卦和下卦之间添加分隔
    reversedYao.forEach((y, index) => {
        if (y === 1) {
            // 阳爻 - 一条实线，宽度70px
            html += `<div class="yao-line"><div class="yao-segment yang"></div></div>`;
        } else {
            // 阴爻 - 两段断开的线，总宽度也是70px (32+6+32)
            html += `<div class="yao-line"><div class="yao-segment yin"></div><div class="yao-segment gap"></div><div class="yao-segment yin"></div></div>`;
        }
        // 在第三爻后添加间隔（上卦和下卦之间）- 减小间距
        if (index === 2) {
            html += `<div style="height: 5px;"></div>`;
        }
    });
    
    return html;
}

// 获取世应标记
function getShiYing(shiyao, position) {
    // position 是从0开始的，shiyao存储的是1-6
    const actualPos = position + 1;
    if (shiyao[0] === actualPos) return ' 世';
    if (shiyao[1] === actualPos) return ' 应';
    return '';
}

// 重置游戏
function resetGame() {
    gameState.selectedCard = null;
    gameState.isCardFlipped = false;
    cardInner.classList.remove('flipped');
    selectedCardContainer.querySelector('.card').classList.remove('card-drawn');
    shuffleAngle = 0;
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);
