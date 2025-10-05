// 评估页面逻辑
let conversationHistory = [];
let assessmentData = {};
let questionCount = 0;

// 页面加载
document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('sendBtn');
    const userInput = document.getElementById('userInput');

    // 发送消息
    sendBtn.addEventListener('click', sendMessage);

    // 回车发送(Shift+Enter换行)
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 检查是否已有评估数据
    const existingAssessment = Storage.getAssessment();
    if (existingAssessment) {
        if (confirm('检测到您之前已完成评估,是否直接进入主页?')) {
            window.location.href = 'dashboard.html';
        } else {
            Storage.clearAll();
        }
    }
});

// 发送消息
async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();

    if (!message) return;

    // 显示用户消息
    addMessage(message, 'user');
    userInput.value = '';

    // 显示加载状态
    setLoading(true);

    try {
        // 调用AI
        const aiResponse = await AI.assessmentChat(message, conversationHistory);

        // 更新对话历史
        conversationHistory.push({ role: 'user', content: message });
        conversationHistory.push({ role: 'assistant', content: aiResponse });

        // 显示AI回复
        addMessage(aiResponse, 'ai');

        // 检查是否完成评估（只在AI明确表示完成时结束）
        if (aiResponse.includes('评估完成')) {
            // 设置进度为100%
            updateProgress(5);
            setTimeout(() => {
                completeAssessment();
            }, 2000);
        } else {
            // 根据对话轮次更新进度（但不超过4，最后一个点留给完成状态）
            questionCount++;
            updateProgress(Math.min(questionCount, 4));
        }

    } catch (error) {
        addMessage('抱歉,网络连接出现问题,请稍后重试。', 'ai');
        console.error(error);
    } finally {
        setLoading(false);
    }
}

// 添加消息到聊天区
function addMessage(text, sender) {
    const chatContainer = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = `<p>${text.replace(/\n/g, '</p><p>')}</p>`;

    messageDiv.appendChild(contentDiv);
    chatContainer.appendChild(messageDiv);

    // 滚动到底部
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 设置加载状态
function setLoading(isLoading) {
    const sendBtn = document.getElementById('sendBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    const userInput = document.getElementById('userInput');

    sendBtn.disabled = isLoading;
    userInput.disabled = isLoading;
    btnText.style.display = isLoading ? 'none' : 'inline';
    btnLoader.style.display = isLoading ? 'inline-block' : 'none';
}

// 更新进度
function updateProgress(count) {
    const dots = document.querySelectorAll('.dot');
    const progressText = document.querySelector('.progress-text');

    const progress = Math.min(count, 5);
    dots.forEach((dot, index) => {
        if (index < progress) {
            dot.classList.add('active');
        }
    });

    progressText.textContent = `评估进度: ${progress}/5`;
}

// 完成评估
async function completeAssessment() {
    // 从对话历史中提取关键信息
    const extractedData = extractAssessmentData();

    // 保存评估数据
    Storage.saveAssessment(extractedData);
    Storage.saveChatHistory(conversationHistory);

    // 显示完成消息
    addMessage('评估已完成!正在为您生成个性化戒除计划,请稍候...', 'ai');
    setLoading(true);

    try {
        // 生成戒除计划
        const plan = await AI.generatePlan(extractedData);
        Storage.savePlan(plan);

        // 跳转到主界面
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (error) {
        console.error('生成计划失败:', error);
        addMessage('计划生成出现问题,但我们可以继续。请点击继续按钮。', 'ai');

        // 添加手动继续按钮
        const continueBtn = document.createElement('button');
        continueBtn.className = 'btn btn-primary';
        continueBtn.textContent = '继续';
        continueBtn.onclick = () => window.location.href = 'dashboard.html';
        document.querySelector('.input-area').appendChild(continueBtn);
    }
}

// 从对话历史提取评估数据
function extractAssessmentData() {
    // 简单提取:将所有用户回复合并
    const userMessages = conversationHistory
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' ');

    return {
        timestamp: new Date().toISOString(),
        conversationHistory: conversationHistory,
        summary: userMessages,
        // 尝试提取成瘾类型(第一个用户回答)
        addictionType: conversationHistory[0]?.content || '未指定',
        startDate: new Date().toISOString()
    };
}
