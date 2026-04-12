import React, { useState, useEffect } from 'react';
import { StatusBar, Platform, View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import axios from 'axios';

// API配置
const API_BASE = 'http://192.168.5.110:3000';

// 颜色主题
const COLORS = {
  primary: '#2196F3',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
};

// ==================== 内存存储 ====================
let memoryStore = {
  user: null,
  wrongQuestions: [],
  progress: {},
};

const saveData = async (key, data) => {
  memoryStore[key] = data;
};

const getData = async (key) => {
  return memoryStore[key] || null;
};

// ==================== 主应用 ====================
export default function App() {
  const [screen, setScreen] = useState('login');
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
    setScreen('home');
  };

  const renderScreen = () => {
    switch(screen) {
      case 'login': return <LoginScreen onLogin={handleLogin} />;
      case 'home': return <HomeScreen user={user} onNavigate={setScreen} />;
      case 'learn': return <LearnScreen onBack={() => setScreen('home')} />;
      case 'practice': return <PracticeScreen onBack={() => setScreen('home')} />;
      case 'interview': return <InterviewScreen onBack={() => setScreen('home')} />;
      case 'wrong': return <WrongScreen onBack={() => setScreen('home')} />;
      default: return <LoginScreen onLogin={handleLogin} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      {renderScreen()}
      {screen !== 'login' && <BottomBar current={screen} onChange={setScreen} />}
    </View>
  );
}

// ==================== 底部导航 ====================
function BottomBar({ current, onChange }) {
  const tabs = [
    { key: 'home', icon: '🏠', label: '首页' },
    { key: 'learn', icon: '📚', label: '学习' },
    { key: 'practice', icon: '✍️', label: '刷题' },
    { key: 'interview', icon: '🤖', label: '面试' },
    { key: 'wrong', icon: '📝', label: '错题' },
  ];

  return (
    <View style={tabStyles.bar}>
      {tabs.map(tab => (
        <TouchableOpacity key={tab.key} style={tabStyles.item} onPress={() => onChange(tab.key)}>
          <Text style={[tabStyles.icon, current === tab.key && tabStyles.activeIcon]}>{tab.icon}</Text>
          <Text style={[tabStyles.label, current === tab.key && tabStyles.activeLabel]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    opacity: 0.5,
  },
  activeIcon: {
    opacity: 1,
  },
  label: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activeLabel: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

// ==================== 登录屏幕 ====================
function LoginScreen({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGuest = async () => {
    const guestUser = { id: 'guest', username: '游客', isGuest: true };
    await saveData('user', guestUser);
    onLogin(guestUser);
  };

  const handleSubmit = async () => {
    if (!username || !password) {
      Alert.alert('提示', '请输入用户名和密码');
      return;
    }
    
    setLoading(true);
    try {
      const url = isRegister ? `${API_BASE}/api/register` : `${API_BASE}/api/login`;
      const res = await axios.post(url, { username, password });
      
      if (res.data.token) {
        await saveData('user', { id: res.data.userId, username, token: res.data.token, isGuest: false });
        onLogin({ id: res.data.userId, username, token: res.data.token, isGuest: false });
      }
    } catch (e) {
      Alert.alert('错误', e.response?.data?.error || '网络错误，请检查网络');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loginBox}>
        <Text style={styles.title}>🎯 面试大师</Text>
        <Text style={styles.subtitle}>99元商用精品APP</Text>
        
        <TextInput
          style={styles.input}
          placeholder="用户名"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="密码"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>
            {isRegister ? '注册' : '登录'}
          </Text>}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.linkButton} onPress={() => setIsRegister(!isRegister)}>
          <Text style={styles.linkText}>
            {isRegister ? '已有账号？登录' : '没有账号？注册'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.guestButton} onPress={handleGuest}>
          <Text style={styles.guestButtonText}>游客模式直接进入</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ==================== 首页 ====================
function HomeScreen({ user, onNavigate }) {
  const [stats, setStats] = useState({ questions: 0, articles: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/crawler/status`);
      setStats(res.data);
    } catch (e) {
      setStats({ questions: 18, articles: 0 });
    }
    setLoading(false);
  };

  const MenuCard = ({ title, desc, icon, color, onPress }) => (
    <TouchableOpacity style={styles.menuCard} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: color }]}>
        <Text style={styles.menuIconText}>{icon}</Text>
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuDesc}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>欢迎，{user.username}</Text>
        <Text style={styles.headerSubtitle}>
          {user.isGuest ? '游客模式' : '已登录'}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{loading ? '...' : stats.questions}</Text>
          <Text style={styles.statLabel}>题库总量</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{loading ? '...' : stats.articles}</Text>
          <Text style={styles.statLabel}>学习文章</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>核心功能</Text>
      
      <MenuCard icon="📚" title="知识学习" desc="系统化学习面试知识点" color="#4CAF50" onPress={() => onNavigate('learn')} />
      <MenuCard icon="✍️" title="智能刷题" desc="AI出题 + 遗忘曲线复习" color="#2196F3" onPress={() => onNavigate('practice')} />
      <MenuCard icon="🤖" title="AI模拟面试" desc="AI评分 + 薄弱点分析" color="#9C27B0" onPress={() => onNavigate('interview')} />
      <MenuCard icon="📝" title="错题本" desc="智能收录 · 针对性复习" color="#F44336" onPress={() => onNavigate('wrong')} />
    </ScrollView>
  );
}

// ==================== 知识学习 ====================
function LearnScreen({ onBack }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  const categoryNames = [
    'Java基础', 'JVM', 'JUC多线程', 'Redis', 'Kafka', 
    '计算机网络', '操作系统', '数据库', '设计模式', 
    '数据结构', '中间件', 'AI', 'Agent'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/article-categories`);
      setCategories(res.data.length ? res.data : categoryNames);
    } catch (e) {
      setCategories(categoryNames);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← 返回首页</Text>
      </TouchableOpacity>
      <Text style={styles.screenTitle}>📚 知识学习</Text>
      <Text style={styles.sectionDesc}>选择分类开始学习</Text>
      
      <View style={styles.categoryGrid}>
        {categories.map((cat, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={styles.categoryCard}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={styles.categoryText}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ==================== 刷题 ====================
function PracticeScreen({ onBack }) {
  const [mode, setMode] = useState('list');
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('all');

  const categories = ['all', 'Java基础', 'JVM', 'JUC', 'Redis', 'Kafka', '计算机网络', '数据库', '设计模式'];

  const loadQuestions = async (cat = 'all') => {
    setLoading(true);
    try {
      const url = cat === 'all' 
        ? `${API_BASE}/api/questions?limit=50`
        : `${API_BASE}/api/questions?category=${cat}&limit=50`;
      const res = await axios.get(url);
      
      const shuffled = res.data.map(q => ({
        ...q,
        options: shuffleArray([...q.options])
      }));
      setQuestions(shuffled);
      setCurrentIdx(0);
      setMode('practice');
    } catch (e) {
      Alert.alert('错误', '加载题库失败，请检查网络');
    }
    setLoading(false);
  };

  const shuffleArray = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const handleAnswer = async (answer) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);
    
    const q = questions[currentIdx];
    if (answer !== q.answer) {
      const wrongList = await getData('wrongQuestions') || [];
      const existingIdx = wrongList.findIndex(w => w.question_id === q.id);
      if (existingIdx >= 0) {
        wrongList[existingIdx].wrong_count += 1;
      } else {
        wrongList.push({
          question_id: q.id,
          category: q.category,
          question: q.question,
          options: JSON.stringify(q.options),
          answer: q.answer,
          wrong_count: 1,
        });
      }
      await saveData('wrongQuestions', wrongList);
    }
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setMode('list');
    }
  };

  if (mode === 'list') {
    return (
      <SafeAreaView style={styles.screen}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← 返回首页</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>✍️ 智能刷题</Text>
        
        <Text style={styles.label}>选择分类</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                {cat === 'all' ? '全部' : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <TouchableOpacity style={styles.startButton} onPress={() => loadQuestions(category)} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.startButtonText}>开始刷题</Text>}
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const q = questions[currentIdx];
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIdx + 1) / questions.length) * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>{currentIdx + 1} / {questions.length}</Text>
      
      <ScrollView style={styles.questionContainer}>
        <Text style={styles.questionCategory}>{q.category} · {q.difficulty}</Text>
        <Text style={styles.questionText}>{q.question}</Text>
        
        <View style={styles.optionsContainer}>
          {q.options.map((opt, idx) => {
            const isSelected = selectedAnswer === opt;
            const isCorrect = opt === q.answer;
            let bgColor = COLORS.card;
            let borderColor = COLORS.border;
            
            if (showResult) {
              if (isCorrect) { bgColor = '#E8F5E9'; borderColor = COLORS.success; }
              else if (isSelected) { bgColor = '#FFEBEE'; borderColor = COLORS.error; }
            } else if (isSelected) {
              bgColor = '#E3F2FD'; borderColor = COLORS.primary;
            }
            
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.option, { backgroundColor: bgColor, borderColor }]}
                onPress={() => handleAnswer(opt)}
                disabled={showResult}
              >
                <Text style={styles.optionText}>{opt}</Text>
                {showResult && isCorrect && <Text style={styles.correctMark}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
        
        {showResult && q.explanation && (
          <View style={styles.explanation}>
            <Text style={styles.explanationTitle}>📝 解析</Text>
            <Text style={styles.explanationText}>{q.explanation}</Text>
          </View>
        )}
      </ScrollView>
      
      {showResult && (
        <TouchableOpacity style={styles.nextButton} onPress={nextQuestion}>
          <Text style={styles.nextButtonText}>
            {currentIdx < questions.length - 1 ? '下一题 →' : '完成'}
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// ==================== AI模拟面试 ====================
function InterviewScreen({ onBack }) {
  const [mode, setMode] = useState('home');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(false);

  const startInterview = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/questions?limit=5`);
      setQuestions(res.data.slice(0, 5));
      setCurrentQ(0);
      setAnswers({});
      setScores({});
      setMode('interview');
    } catch (e) {
      Alert.alert('错误', '获取面试题失败');
    }
    setLoading(false);
  };

  const submitAnswer = async () => {
    setLoading(true);
    try {
      const q = questions[currentQ];
      const answer = answers[currentQ] || '';
      
      const res = await axios.post(`${API_BASE}/api/ai/score`, {
        question: q.question,
        answer
      });
      
      setScores({ ...scores, [currentQ]: res.data });
      
      if (currentQ < questions.length - 1) {
        setCurrentQ(currentQ + 1);
      } else {
        setMode('result');
      }
    } catch (e) {
      Alert.alert('提示', 'AI评分暂时不可用');
      if (currentQ < questions.length - 1) {
        setCurrentQ(currentQ + 1);
      } else {
        setMode('result');
      }
    }
    setLoading(false);
  };

  if (mode === 'home') {
    return (
      <SafeAreaView style={styles.screen}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← 返回首页</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>🤖 AI模拟面试</Text>
        <Text style={styles.sectionDesc}>AI实时出题 + 智能评分</Text>
        
        <View style={styles.interviewCard}>
          <Text style={styles.interviewIcon}>🎯</Text>
          <Text style={styles.interviewTitle}>开始模拟面试</Text>
          <Text style={styles.interviewDesc}>5道面试题 · AI评分 · 薄弱点分析</Text>
          
          <TouchableOpacity style={styles.primaryButton} onPress={startInterview} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>开始面试</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (mode === 'interview') {
    const q = questions[currentQ];
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.progressText}>第 {currentQ + 1} / {questions.length} 题</Text>
        
        <ScrollView style={styles.questionContainer}>
          <Text style={styles.questionCategory}>{q.category}</Text>
          <Text style={styles.questionText}>{q.question}</Text>
          
          <TextInput
            style={styles.answerInput}
            placeholder="请输入你的回答..."
            multiline
            value={answers[currentQ] || ''}
            onChangeText={(text) => setAnswers({ ...answers, [currentQ]: text })}
          />
          
          {scores[currentQ] && (
            <View style={styles.scoreCard}>
              <Text style={styles.scoreNum}>得分: {scores[currentQ].score}</Text>
              <Text style={styles.feedbackText}>{scores[currentQ].feedback}</Text>
            </View>
          )}
        </ScrollView>
        
        <TouchableOpacity style={styles.primaryButton} onPress={submitAnswer} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>
            {currentQ < questions.length - 1 ? '下一题' : '完成面试'}
          </Text>}
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const avgScore = Object.values(scores).reduce((a, b) => a + (b.score || 0), 0) / (Object.keys(scores).length || 1);
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.screenTitle}>📊 面试报告</Text>
      
      <View style={styles.resultCard}>
        <Text style={styles.resultScore}>{Math.round(avgScore)}分</Text>
        <Text style={styles.resultLabel}>综合得分</Text>
      </View>
      
      <TouchableOpacity style={styles.primaryButton} onPress={() => setMode('home')}>
        <Text style={styles.primaryButtonText}>重新面试</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ==================== 错题本 ====================
function WrongScreen({ onBack }) {
  const [wrongQuestions, setWrongQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWrongQuestions();
  }, []);

  const loadWrongQuestions = async () => {
    const data = await getData('wrongQuestions');
    setWrongQuestions(data || []);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← 返回首页</Text>
      </TouchableOpacity>
      <Text style={styles.screenTitle}>📝 错题本</Text>
      <Text style={styles.sectionDesc}>错误次数越多，复习越有针对性</Text>
      
      <ScrollView>
        {wrongQuestions.map((q, idx) => (
          <View key={idx} style={styles.wrongCard}>
            <View style={styles.wrongHeader}>
              <Text style={styles.wrongCategory}>{q.category}</Text>
              <Text style={styles.wrongCount}>错误 {q.wrong_count} 次</Text>
            </View>
            <Text style={styles.wrongQuestion}>{q.question}</Text>
            <Text style={styles.wrongAnswer}>正确答案: {q.answer}</Text>
          </View>
        ))}
        
        {wrongQuestions.length === 0 && !loading && (
          <Text style={styles.emptyText}>🎉 暂无错题，保持好状态！</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== 样式 ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loginBox: {
    width: '85%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignSelf: 'center',
    marginTop: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  guestButton: {
    marginTop: 24,
    padding: 12,
    alignItems: 'center',
  },
  guestButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
  },
  backText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 48,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    marginTop: -30,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    alignItems: 'center',
    elevation: 2,
  },
  statNum: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    margin: 16,
    marginTop: 8,
  },
  sectionDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  menuCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 1,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconText: {
    fontSize: 24,
  },
  menuContent: {
    marginLeft: 16,
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  menuDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    margin: 16,
    marginTop: 0,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  categoryCard: {
    width: '30%',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    margin: '1.5%',
    alignItems: 'center',
    elevation: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  
  label: {
    fontSize: 14,
    marginLeft: 16,
    marginTop: 8,
    color: COLORS.textSecondary,
  },
  categoryScroll: {
    paddingHorizontal: 12,
    marginVertical: 8,
  },
  chip: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  chipTextActive: {
    color: '#fff',
  },
  startButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressText: {
    textAlign: 'center',
    padding: 8,
    color: COLORS.textSecondary,
  },
  questionContainer: {
    flex: 1,
    padding: 16,
  },
  questionCategory: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 20,
    lineHeight: 26,
  },
  optionsContainer: {
    marginTop: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  correctMark: {
    fontSize: 18,
    color: COLORS.success,
    fontWeight: 'bold',
  },
  explanation: {
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  interviewCard: {
    backgroundColor: COLORS.card,
    margin: 16,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  interviewIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  interviewTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  interviewDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  answerInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  scoreCard: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  scoreNum: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  feedbackText: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 8,
  },
  resultCard: {
    backgroundColor: COLORS.card,
    margin: 16,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  resultScore: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  resultLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  
  wrongCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  wrongHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  wrongCategory: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  wrongCount: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '600',
  },
  wrongQuestion: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  wrongAnswer: {
    fontSize: 14,
    color: COLORS.success,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 40,
    fontSize: 16,
  },
});
