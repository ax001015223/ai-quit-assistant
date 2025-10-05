// 本地存储管理模块
const Storage = {
    // 保存用户评估信息
    saveAssessment(data) {
        try {
            localStorage.setItem('userAssessment', JSON.stringify(data));
        } catch (error) {
            console.error('保存评估数据失败:', error);
        }
    },

    // 获取用户评估信息
    getAssessment() {
        try {
            const data = localStorage.getItem('userAssessment');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('读取评估数据失败:', error);
            return null;
        }
    },

    // 保存戒除计划
    savePlan(plan) {
        try {
            localStorage.setItem('addictionPlan', JSON.stringify(plan));
        } catch (error) {
            console.error('保存计划失败:', error);
        }
    },

    // 获取戒除计划
    getPlan() {
        try {
            const data = localStorage.getItem('addictionPlan');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('读取计划失败:', error);
            return null;
        }
    },

    // 添加打卡记录
    addCheckIn(record) {
        try {
            const records = this.getCheckIns();
            records.push(record);
            localStorage.setItem('checkIns', JSON.stringify(records));
        } catch (error) {
            console.error('保存打卡记录失败:', error);
        }
    },

    // 获取所有打卡记录
    getCheckIns() {
        try {
            const data = localStorage.getItem('checkIns');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('读取打卡记录失败:', error);
            return [];
        }
    },

    // 获取连续打卡天数
    getStreakDays() {
        const records = this.getCheckIns();
        if (records.length === 0) return 0;

        let streak = 0;
        const today = new Date().toDateString();

        // 从最新记录开始倒序检查
        for (let i = records.length - 1; i >= 0; i--) {
            const recordDate = new Date(records[i].date).toDateString();
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() - streak);

            if (recordDate === expectedDate.toDateString()) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    },

    // 检查今天是否已打卡
    isTodayCheckedIn() {
        const records = this.getCheckIns();
        const today = new Date().toDateString();
        return records.some(r => new Date(r.date).toDateString() === today);
    },

    // 添加每日记录
    addDailyRecord(record) {
        try {
            const records = this.getDailyRecords();
            records.push(record);
            localStorage.setItem('dailyRecords', JSON.stringify(records));
        } catch (error) {
            console.error('保存每日记录失败:', error);
        }
    },

    // 获取每日记录
    getDailyRecords() {
        try {
            const data = localStorage.getItem('dailyRecords');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('读取每日记录失败:', error);
            return [];
        }
    },

    // 保存聊天历史
    saveChatHistory(messages) {
        try {
            localStorage.setItem('chatHistory', JSON.stringify(messages));
        } catch (error) {
            console.error('保存聊天历史失败:', error);
        }
    },

    // 获取聊天历史
    getChatHistory() {
        try {
            const data = localStorage.getItem('chatHistory');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('读取聊天历史失败:', error);
            return [];
        }
    },

    // 清空所有数据
    clearAll() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('清空数据失败:', error);
        }
    }
};
