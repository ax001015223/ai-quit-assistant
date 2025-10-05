// 主界面逻辑
let userProfile = null;
let currentPlan = null;

// 页面加载
document.addEventListener('DOMContentLoaded', () => {
    // 检查是否完成评估
    userProfile = Storage.getAssessment();
    if (!userProfile) {
        alert('请先完成初始评估');
        window.location.href = 'index.html';
        return;
    }

    // 加载数据
    currentPlan = Storage.getPlan();
    loadDashboard();

    // 绑定事件
    bindEvents();
});

// 加载仪表盘数据
function loadDashboard() {
    // 更新连续天数
    updateStreakDisplay();

    // 加载计划
    loadPlan();

    // 加载记录
    loadRecords();

    // 更新打卡状态
    updateCheckinStatus();

    // 更新里程碑
    updateMilestones();

    // 生成日历
    generateCalendar();
}

// 更新连续天数显示
function updateStreakDisplay() {
    const streakDays = Storage.getStreakDays();
    document.getElementById('streakDays').textContent = streakDays;
}

// 加载戒除计划
function loadPlan() {
    if (!currentPlan) {
        document.getElementById('planSummary').innerHTML = '<p>计划生成中,请稍候...</p>';
        return;
    }

    // 显示计划摘要
    const summaryDiv = document.getElementById('planSummary');
    summaryDiv.innerHTML = `<p>${currentPlan.summary || '正在为您定制计划...'}</p>`;

    // 显示阶段计划
    const phasesDiv = document.getElementById('planPhases');
    if (currentPlan.phases && currentPlan.phases.length > 0) {
        phasesDiv.innerHTML = currentPlan.phases.map(phase => `
            <div class="phase-card">
                <h3>${phase.name}</h3>
                ${phase.goals ? `
                    <div class="phase-section">
                        <h4>目标:</h4>
                        <ul>${phase.goals.map(g => `<li>${g}</li>`).join('')}</ul>
                    </div>
                ` : ''}
                ${phase.tasks ? `
                    <div class="phase-section">
                        <h4>任务:</h4>
                        <ul>${phase.tasks.map(t => `<li>${t}</li>`).join('')}</ul>
                    </div>
                ` : ''}
                ${phase.strategies ? `
                    <div class="phase-section">
                        <h4>策略:</h4>
                        <ul>${phase.strategies.map(s => `<li>${s}</li>`).join('')}</ul>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    // 显示戒断反应建议
    const withdrawalTipsDiv = document.getElementById('withdrawalTips');
    if (currentPlan.withdrawalTips && currentPlan.withdrawalTips.length > 0) {
        withdrawalTipsDiv.innerHTML = currentPlan.withdrawalTips.map(tip => `<li>${tip}</li>`).join('');
    } else {
        withdrawalTipsDiv.innerHTML = '<li>保持规律作息</li><li>适度运动</li><li>寻求支持</li>';
    }

    // 显示触发场景策略
    const triggerStrategiesDiv = document.getElementById('triggerStrategies');
    if (currentPlan.triggerStrategies && currentPlan.triggerStrategies.length > 0) {
        triggerStrategiesDiv.innerHTML = currentPlan.triggerStrategies.map(s => `<li>${s}</li>`).join('');
    } else {
        triggerStrategiesDiv.innerHTML = '<li>识别触发信号</li><li>转移注意力</li><li>深呼吸放松</li>';
    }
}

// 加载记录数据
function loadRecords() {
    const records = Storage.getDailyRecords();
    const checkIns = Storage.getCheckIns();

    // 统计数据
    document.getElementById('totalDays').textContent = checkIns.length;

    if (records.length > 0) {
        const avgMood = (records.reduce((sum, r) => sum + r.mood, 0) / records.length).toFixed(1);
        document.getElementById('avgMood').textContent = avgMood;
    }

    const bestStreak = calculateBestStreak(checkIns);
    document.getElementById('bestStreak').textContent = bestStreak;

    // 显示历史记录
    displayRecordHistory(records);

    // 绘制情绪图表
    drawMoodChart(records);
}

// 计算最长连续天数
function calculateBestStreak(checkIns) {
    if (checkIns.length === 0) return 0;

    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < checkIns.length; i++) {
        const prevDate = new Date(checkIns[i - 1].date);
        const currDate = new Date(checkIns[i].date);
        const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 1;
        }
    }

    return maxStreak;
}

// 显示历史记录
function displayRecordHistory(records) {
    const historyDiv = document.getElementById('recordHistory');

    if (records.length === 0) {
        historyDiv.innerHTML = '<p class="empty-state">暂无记录</p>';
        return;
    }

    // 显示最近10条
    const recentRecords = records.slice(-10).reverse();
    historyDiv.innerHTML = recentRecords.map(record => `
        <div class="record-item">
            <div class="record-date">${new Date(record.date).toLocaleDateString()}</div>
            <div class="record-mood">情绪: ${record.mood}/10</div>
            ${record.withdrawal && record.withdrawal.length > 0 ?
                `<div class="record-withdrawal">戒断反应: ${record.withdrawal.join(', ')}</div>` : ''}
            ${record.note ? `<div class="record-note">${record.note}</div>` : ''}
        </div>
    `).join('');
}

// 绘制情绪图表
function drawMoodChart(records) {
    const canvas = document.getElementById('moodChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 设置背景 - 侘寂米白
    ctx.fillStyle = '#F5F1E8';
    ctx.fillRect(0, 0, width, height);

    if (records.length === 0) {
        ctx.font = '16px serif';
        ctx.fillStyle = '#8B8680';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据,开始记录您的情绪吧', width / 2, height / 2);
        return;
    }

    // 获取最近7天数据
    const recentRecords = records.slice(-7);

    // 绘制Y轴刻度和标签
    ctx.strokeStyle = '#C4C0B8';
    ctx.lineWidth = 1;
    ctx.font = '11px serif';
    ctx.fillStyle = '#8B8680';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 10; i += 2) {
        const y = height - padding - (i / 10) * (height - padding * 2);

        // 绘制刻度线
        ctx.beginPath();
        ctx.moveTo(padding - 5, y);
        ctx.lineTo(padding, y);
        ctx.stroke();

        // 绘制网格线
        ctx.strokeStyle = '#E8E3D8';
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        ctx.strokeStyle = '#C4C0B8';

        // Y轴标签
        ctx.fillText(i.toString(), padding - 10, y + 4);
    }

    // 绘制坐标轴
    ctx.strokeStyle = '#5A5550';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // 绘制折线图
    if (recentRecords.length >= 1) {
        const stepX = (width - padding * 2) / Math.max(recentRecords.length - 1, 1);
        const scaleY = (height - padding * 2) / 10;

        // 绘制折线 - 鼠灰色
        ctx.strokeStyle = '#5A5550';
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        recentRecords.forEach((record, index) => {
            const x = padding + (recentRecords.length === 1 ? (width - padding * 2) / 2 : index * stepX);
            const y = height - padding - record.mood * scaleY;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // 绘制数据点和数值
        ctx.font = '12px serif';
        ctx.textAlign = 'center';

        recentRecords.forEach((record, index) => {
            const x = padding + (recentRecords.length === 1 ? (width - padding * 2) / 2 : index * stepX);
            const y = height - padding - record.mood * scaleY;

            // 绘制数据点
            ctx.fillStyle = '#3D3935';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();

            // 绘制数值
            ctx.fillStyle = '#5A5550';
            ctx.fillText(record.mood.toString(), x, y - 15);

            // 绘制日期
            const date = new Date(record.date);
            const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
            ctx.font = '10px serif';
            ctx.fillStyle = '#8B8680';
            ctx.fillText(dateLabel, x, height - padding + 20);
            ctx.font = '12px serif';
        });
    }

    // 绘制标题
    ctx.font = '13px serif';
    ctx.fillStyle = '#3D3935';
    ctx.textAlign = 'center';
    ctx.fillText('情绪趋势', width / 2, 20);

    // Y轴标题
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '11px serif';
    ctx.fillStyle = '#8B8680';
    ctx.textAlign = 'center';
    ctx.fillText('情绪分数', 0, 0);
    ctx.restore();
}

// 打卡功能
function updateCheckinStatus() {
    const isCheckedIn = Storage.isTodayCheckedIn();
    const checkinBtn = document.getElementById('checkinBtn');
    const checkinCircle = document.getElementById('checkinCircle');
    const checkinText = document.getElementById('checkinText');

    if (isCheckedIn) {
        checkinBtn.disabled = true;
        checkinBtn.textContent = '今日已打卡 ✅';
        checkinCircle.classList.add('checked');
        checkinText.textContent = '今日已完成';
    }
}

function doCheckin() {
    if (Storage.isTodayCheckedIn()) {
        alert('今天已经打过卡了!');
        return;
    }

    const record = {
        date: new Date().toISOString(),
        timestamp: Date.now()
    };

    Storage.addCheckIn(record);
    updateStreakDisplay();
    updateCheckinStatus();
    updateMilestones();
    generateCalendar();

    // 显示鼓励消息
    showEncouragement();
}

// 显示鼓励消息
function showEncouragement() {
    const streakDays = Storage.getStreakDays();
    const messages = [
        '太棒了!继续保持!',
        `已经坚持${streakDays}天了,你很棒!`,
        '每一天的坚持都值得骄傲!',
        '你正在变得更强大!',
        '继续加油,胜利在前方!'
    ];

    const message = messages[Math.floor(Math.random() * messages.length)];
    alert(`🎉 ${message}`);
}

// 更新里程碑
function updateMilestones() {
    const streakDays = Storage.getStreakDays();
    const milestones = document.querySelectorAll('.milestone');

    milestones.forEach(milestone => {
        const days = parseInt(milestone.dataset.days);
        if (streakDays >= days) {
            milestone.classList.add('achieved');
        }
    });
}

// 生成打卡日历
function generateCalendar() {
    const calendarDiv = document.getElementById('calendar');
    const checkIns = Storage.getCheckIns();
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // 获取本月第一天和最后一天
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    let html = '<div class="calendar-header">';
    html += `<h3>${currentYear}年${currentMonth + 1}月</h3>`;
    html += '</div>';

    html += '<div class="calendar-grid">';
    html += '<div class="calendar-day-name">日</div>';
    html += '<div class="calendar-day-name">一</div>';
    html += '<div class="calendar-day-name">二</div>';
    html += '<div class="calendar-day-name">三</div>';
    html += '<div class="calendar-day-name">四</div>';
    html += '<div class="calendar-day-name">五</div>';
    html += '<div class="calendar-day-name">六</div>';

    // 填充空白
    for (let i = 0; i < firstDay.getDay(); i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // 填充日期
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateStr = date.toDateString();
        const isChecked = checkIns.some(c => new Date(c.date).toDateString() === dateStr);
        const isToday = date.toDateString() === today.toDateString();

        let className = 'calendar-day';
        if (isChecked) className += ' checked';
        if (isToday) className += ' today';

        html += `<div class="${className}">${day}</div>`;
    }

    html += '</div>';
    calendarDiv.innerHTML = html;
}

// 绑定事件
function bindEvents() {
    // 标签切换
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            switchTab(targetTab);
        });
    });

    // 打卡按钮
    document.getElementById('checkinBtn').addEventListener('click', doCheckin);

    // 记录表单
    document.getElementById('recordForm').addEventListener('submit', saveRecord);

    // 情绪滑块
    document.getElementById('moodSlider').addEventListener('input', (e) => {
        document.getElementById('moodValue').textContent = e.target.value;
    });

    // AI聊天
    document.getElementById('aiChatBtn').addEventListener('click', toggleAIChat);
    document.getElementById('closeChatBtn').addEventListener('click', toggleAIChat);
    document.getElementById('clearChatBtn').addEventListener('click', clearChatHistory);
    document.getElementById('sendChatBtn').addEventListener('click', sendAIMessage);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendAIMessage();
    });

    // AI聊天窗口拖动
    initChatWindowDrag();
}

// AI聊天窗口拖动功能
function initChatWindowDrag() {
    const chatWindow = document.getElementById('aiChatWindow');
    const chatHeader = chatWindow.querySelector('.chat-header');

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    let isDragEnabled = false;

    // 检测并设置拖动状态
    function checkAndSetDragState() {
        const wasDragEnabled = isDragEnabled;
        isDragEnabled = window.innerWidth > 768;

        // 如果从桌面切换到移动,重置位置
        if (wasDragEnabled && !isDragEnabled) {
            chatWindow.style.transform = '';
            xOffset = 0;
            yOffset = 0;
        }

        // 如果从移动切换到桌面,恢复保存的位置
        if (!wasDragEnabled && isDragEnabled) {
            const savedPosition = localStorage.getItem('chatWindowPosition');
            if (savedPosition) {
                try {
                    const { x, y } = JSON.parse(savedPosition);
                    xOffset = x || 0;
                    yOffset = y || 0;
                    if (chatWindow.classList.contains('active')) {
                        setTranslate(xOffset, yOffset, chatWindow);
                    }
                } catch (error) {
                    console.error('恢复窗口位置失败:', error);
                }
            }
        }

        return isDragEnabled;
    }

    // 初始检测
    checkAndSetDragState();

    // 监听窗口大小变化
    window.addEventListener('resize', checkAndSetDragState);

    // 恢复上次位置(仅桌面端)
    if (isDragEnabled) {
        const savedPosition = localStorage.getItem('chatWindowPosition');
        if (savedPosition) {
            try {
                const { x, y } = JSON.parse(savedPosition);
                xOffset = x || 0;
                yOffset = y || 0;
                if (chatWindow.classList.contains('active')) {
                    setTranslate(xOffset, yOffset, chatWindow);
                }
            } catch (error) {
                console.error('恢复窗口位置失败:', error);
                xOffset = 0;
                yOffset = 0;
            }
        }
    }

    // 绑定鼠标事件
    chatHeader.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        // 移动端不响应拖动
        if (!isDragEnabled) return;

        if (e.target === chatHeader || chatHeader.contains(e.target)) {
            // 排除所有按钮
            if (e.target.classList.contains('close-btn') ||
                e.target.classList.contains('header-icon-btn') ||
                e.target.closest('.close-btn') ||
                e.target.closest('.header-icon-btn') ||
                e.target.closest('.chat-header-actions')) {
                return;
            }

            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            isDragging = true;
            chatWindow.classList.add('dragging');
        }
    }

    function drag(e) {
        if (isDragging && isDragEnabled) {
            e.preventDefault();

            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            // 边界限制
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const rect = chatWindow.getBoundingClientRect();

            // 限制拖动范围,保证至少有50px可见
            const safeZone = 50;
            if (rect.left + xOffset < -rect.width + safeZone) {
                xOffset = -rect.left - rect.width + safeZone;
            }
            if (rect.right + xOffset > windowWidth + rect.width - safeZone) {
                xOffset = windowWidth - rect.right + rect.width - safeZone;
            }
            if (rect.top + yOffset < 0) {
                yOffset = -rect.top;
            }
            if (rect.bottom + yOffset > windowHeight) {
                yOffset = windowHeight - rect.bottom;
            }

            setTranslate(xOffset, yOffset, chatWindow);
        }
    }

    function dragEnd(e) {
        if (isDragging && isDragEnabled) {
            isDragging = false;
            chatWindow.classList.remove('dragging');

            // 保存位置到localStorage (仅桌面端)
            try {
                localStorage.setItem('chatWindowPosition', JSON.stringify({ x: xOffset, y: yOffset }));
            } catch (error) {
                console.error('保存窗口位置失败:', error);
            }
        }
    }

    function setTranslate(xPos, yPos, el) {
        // 仅在桌面端应用transform
        if (isDragEnabled) {
            el.style.transform = `translate(${xPos}px, ${yPos}px)`;
        }
    }

    // 监听窗口打开事件,应用保存的位置(仅桌面端)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                if (chatWindow.classList.contains('active') && isDragEnabled) {
                    const savedPosition = localStorage.getItem('chatWindowPosition');
                    if (savedPosition) {
                        try {
                            const { x, y } = JSON.parse(savedPosition);
                            setTranslate(x || 0, y || 0, chatWindow);
                        } catch (error) {
                            console.error('恢复窗口位置失败:', error);
                        }
                    }
                }
            }
        });
    });

    observer.observe(chatWindow, { attributes: true });
}

// 切换标签
function switchTab(tabName) {
    // 更新标签按钮
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });

    // 更新内容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetContent = document.getElementById(tabName + 'Tab');
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

// 保存记录
function saveRecord(e) {
    e.preventDefault();

    const mood = parseInt(document.getElementById('moodSlider').value);
    const withdrawalCheckboxes = document.querySelectorAll('input[name="withdrawal"]:checked');
    const withdrawal = Array.from(withdrawalCheckboxes).map(cb => cb.value);
    const note = document.getElementById('dailyNote').value;

    const record = {
        date: new Date().toISOString(),
        mood,
        withdrawal,
        note
    };

    Storage.addDailyRecord(record);

    // 重新加载记录
    loadRecords();

    // 清空表单
    document.getElementById('recordForm').reset();
    document.getElementById('moodValue').textContent = '5';

    alert('记录已保存!');
}

// AI聊天相关
function toggleAIChat(e) {
    if (e) e.preventDefault();

    const chatWindow = document.getElementById('aiChatWindow');
    const isOpening = !chatWindow.classList.contains('active');

    chatWindow.classList.toggle('active');

    // 打开时加载历史消息
    if (isOpening) {
        loadChatHistory();
    }
}

async function sendAIMessage(e) {
    if (e) e.preventDefault();

    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    // 显示用户消息
    addChatMessage(message, 'user');
    input.value = '';

    try {
        // 调用AI
        const response = await AI.dailyChat(message, userProfile);
        addChatMessage(response, 'ai');

        // 保存聊天历史
        saveChatHistory();
    } catch (error) {
        addChatMessage('抱歉,网络连接出现问题。', 'ai');
    }
}

function addChatMessage(text, sender) {
    const messagesDiv = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;

    // 创建消息内容
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = text;

    // 创建时间戳
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    const now = new Date();
    timeDiv.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    messageDiv.appendChild(textDiv);
    messageDiv.appendChild(timeDiv);

    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // 添加淡入动画
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(10px)';
    setTimeout(() => {
        messageDiv.style.transition = 'all 0.3s ease';
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    }, 10);
}

// 保存聊天历史
function saveChatHistory() {
    const messagesDiv = document.getElementById('chatMessages');
    const messages = [];

    messagesDiv.querySelectorAll('.chat-message').forEach(msg => {
        const textDiv = msg.querySelector('.message-text');
        if (textDiv) {
            messages.push({
                text: textDiv.textContent,
                sender: msg.classList.contains('user-message') ? 'user' : 'ai',
                timestamp: Date.now()
            });
        }
    });

    localStorage.setItem('dailyChatHistory', JSON.stringify(messages));
}

// 加载聊天历史
function loadChatHistory() {
    const messagesDiv = document.getElementById('chatMessages');
    const savedHistory = localStorage.getItem('dailyChatHistory');

    if (savedHistory) {
        const messages = JSON.parse(savedHistory);

        // 清空当前消息
        messagesDiv.innerHTML = '';

        // 加载历史消息 - 使用 addChatMessage 保持一致的格式
        messages.forEach(msg => {
            // 直接创建消息元素,避免重复保存
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${msg.sender}-message`;

            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            textDiv.textContent = msg.text;

            const timeDiv = document.createElement('div');
            timeDiv.className = 'message-time';
            const msgDate = new Date(msg.timestamp);
            timeDiv.textContent = `${msgDate.getHours().toString().padStart(2, '0')}:${msgDate.getMinutes().toString().padStart(2, '0')}`;

            messageDiv.appendChild(textDiv);
            messageDiv.appendChild(timeDiv);
            messagesDiv.appendChild(messageDiv);
        });

        // 滚动到底部
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } else {
        // 没有历史记录,显示欢迎消息
        messagesDiv.innerHTML = '';
        addChatMessage('你好!我是你的戒除助手,有什么我可以帮助你的吗?', 'ai');
        saveChatHistory();
    }
}

// 清空聊天记录
function clearChatHistory(e) {
    if (e) e.preventDefault();

    if (confirm('确定要清空所有聊天记录吗?')) {
        const messagesDiv = document.getElementById('chatMessages');
        messagesDiv.innerHTML = '';
        localStorage.removeItem('dailyChatHistory');

        // 显示欢迎消息
        addChatMessage('聊天记录已清空。我是你的戒除助手,有什么我可以帮助你的吗?', 'ai');
        saveChatHistory();
    }
}
