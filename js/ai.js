// AI API 调用封装
const AI = {
    apiUrl: API_CONFIG.apiUrl,
    apiKey: API_CONFIG.apiKey,
    model: API_CONFIG.model,

    // 调用豆包API
    async chat(messages, systemPrompt = '你是一位专业、温暖、有同理心的心理咨询师和成瘾戒除辅导专家。') {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...messages
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('AI调用错误:', error);
            throw error;
        }
    },

    // 初始评估对话
    async assessmentChat(userMessage, conversationHistory = []) {
        const systemPrompt = `你是一位专业的成瘾戒除咨询师。你正在进行初步评估,需要了解用户的:
1. 成瘾类型(手淫、烟瘾、酒精、游戏等)
2. 成瘾时长
3. 戒除动机和目标
4. 触发因素(什么情况下容易发生)
5. 过往戒除经历
6. 当前生活状态

请用温暖、不评判的语气,逐步询问这些信息。每次只问1-2个问题,让对话自然流畅。
当收集到足够信息后,总结评估结果并说"评估完成"。`;

        const messages = [
            ...conversationHistory,
            { role: 'user', content: userMessage }
        ];

        return await this.chat(messages, systemPrompt);
    },

    // 生成戒除计划
    async generatePlan(assessmentData) {
        const systemPrompt = `你是成瘾戒除计划专家。基于用户的评估信息,生成一个详细的、个性化的戒除计划。

计划应包括:
1. 7天适应期的具体任务和策略
2. 30天巩固期的目标和方法
3. 90天稳定期的长期建议
4. 应对戒断反应的具体方法
5. 触发场景的应对策略

请用JSON格式返回,结构如下:
{
  "summary": "计划总结",
  "phases": [
    {
      "name": "第1-7天:适应期",
      "goals": ["目标1", "目标2"],
      "tasks": ["任务1", "任务2"],
      "strategies": ["策略1", "策略2"]
    }
  ],
  "withdrawalTips": ["应对戒断反应建议1", "建议2"],
  "triggerStrategies": ["应对触发场景策略1", "策略2"]
}`;

        const userMessage = `用户评估信息:\n${JSON.stringify(assessmentData, null, 2)}\n\n请生成个性化戒除计划。`;

        const response = await this.chat([{ role: 'user', content: userMessage }], systemPrompt);

        try {
            // 尝试提取JSON
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('无法解析计划JSON');
        } catch (error) {
            console.error('计划解析错误:', error);
            // 返回默认计划结构
            return {
                summary: response,
                phases: [],
                withdrawalTips: [],
                triggerStrategies: []
            };
        }
    },

    // 日常咨询对话
    async dailyChat(userMessage, userProfile) {
        const systemPrompt = `你是用户的戒除助手。用户正在戒除${userProfile.addictionType},已经坚持${Storage.getStreakDays()}天。

你的角色:
1. 提供情绪支持和鼓励
2. 解答戒除过程中的疑问
3. 帮助应对戒断反应
4. 提醒用户使用已制定的策略
5. 在用户想放弃时给予支持

请用温暖、理解、不评判的语气回复。`;

        return await this.chat([{ role: 'user', content: userMessage }], systemPrompt);
    }
};
