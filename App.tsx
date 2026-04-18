import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusBar, View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, AsyncStorage, Dimensions, Platform, BackHandler, useColorScheme, Clipboard, Share, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import axios from 'axios';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// API地址 - 支持双栈
const API_BASE_V4 = 'http://100.106.29.60:3000';
const API_BASE_V6 = 'http://[fd7a:115c:a1e0::8a01:1dcc]:3000';
const TIMEOUT = 5000;
const TIMEOUT_SLOW = 15000;

// 深色模式检测
const useSystemColorScheme = () => {
  const [colorScheme, setColorScheme] = useState(() => {
    return useColorScheme() || 'light';
  });
  return colorScheme;
};

// 深色模式颜色
const getColors = (isDark) => ({
  primary: '#2196F3',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  background: isDark ? '#121212' : '#F5F5F5',
  card: isDark ? '#1E1E1E' : '#FFFFFF',
  text: isDark ? '#FFFFFF' : '#212121',
  textSecondary: isDark ? '#B0B0B0' : '#757575',
  border: isDark ? '#333333' : '#E0E0E0',
});

const STORAGE_KEYS = { USER: '@im_user', WRONG: '@im_wrong', FAVORITES: '@im_favorites', PROGRESS: '@im_progress', CORRECT: '@im_correct' };
const saveData = async (k, d) => { try { await AsyncStorage.setItem(k, JSON.stringify(d)); } catch (e) {} };
const getData = async (k) => { try { const d = await AsyncStorage.getItem(k); return d ? JSON.parse(d) : null; } catch (e) { return null; } };

// API请求工具
const apiGet = async (url, useSlow = false) => {
  const timeout = useSlow ? TIMEOUT_SLOW : TIMEOUT;
  try { return await axios.get(API_BASE_V4 + url, { timeout, timeoutErrorMessage: 'timeout' }).then(r => r.data); }
  catch (e) {
    if (e.message === 'timeout') { try { return await axios.get(API_BASE_V6 + url, { timeout }).then(r => r.data); } catch (e2) { throw e2; } }
    throw e;
  }
};
const apiPost = async (url, data, useSlow = false) => {
  const timeout = useSlow ? TIMEOUT_SLOW : TIMEOUT;
  try { return await axios.post(API_BASE_V4 + url, data, { timeout, timeoutErrorMessage: 'timeout' }).then(r => r.data); }
  catch (e) {
    if (e.message === 'timeout') { try { return await axios.post(API_BASE_V6 + url, data, { timeout }).then(r => r.data); } catch (e2) { throw e2; } }
    throw e;
  }
};

// Toast
let toastRef = { show: () => {} };
const showToast = (msg, type = 'info') => {
  const bg = type === 'error' ? COLORS.error : type === 'success' ? COLORS.success : COLORS.primary;
  toastRef.show(msg, bg);
};

export default function App() {
  const colorScheme = useSystemColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === 'dark');
  const [screen, setScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  const [toastBg, setToastBg] = useState('#2196F3');
  const [toastVis, setToastVis] = useState(false);
  const [prevScreen, setPrevScreen] = useState('home'); // 用于返回
  
  const COLORS = getColors(isDark);

  toastRef = { show: (msg, bg) => { setToastMsg(msg); setToastBg(bg); setToastVis(true); setTimeout(() => setToastVis(false), 2500); } };

  // 切换深色模式
  const toggleDarkMode = useCallback(() => setIsDark(d => !d), []);

  // 物理返回键处理
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'login') {
        BackHandler.exitApp();
        return true;
      }
      onBack();
      return true;
    });
    return () => backHandler.remove();
  }, [screen, prevScreen]);

  // 初始化 - 使用超时保护
  useEffect(() => { 
    (async () => { 
      try {
        const u = await getData(STORAGE_KEYS.USER); 
        if (u) { setUser(u); setScreen('home'); }
      } catch (e) {
        console.log('初始化失败', e);
      }
      setLoading(false); 
    })(); 
  }, []);

  const goTo = (newScreen) => { 
    setPrevScreen(screen);
    setScreen(newScreen); 
  };
  const onBack = () => { 
    setScreen(prevScreen); 
  };
  const handleLogin = (u) => { setUser(u); setPrevScreen('login'); setScreen('home'); };
  const handleLogout = async () => { await saveData(STORAGE_KEYS.USER, null); setUser(null); setScreen('login'); };

  if (loading) return <View style={[styles.loading, { backgroundColor: COLORS.background }]}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>加载中...</Text></View>;

  // 渲染各页面
  const renderScreen = () => {
    switch (screen) {
      case 'login': return <LoginScreen onLogin={handleLogin} COLORS={COLORS} />;
      case 'home': return <HomeScreen user={user} onNavigate={goTo} onLogout={handleLogout} COLORS={COLORS} isDark={isDark} toggleDarkMode={toggleDarkMode} />;
      case 'learn': return <LearnScreen onBack={onBack} COLORS={COLORS} />;
      case 'practice': return <PracticeScreen onBack={onBack} COLORS={COLORS} />;
      case 'wrong': return <WrongScreen onBack={onBack} COLORS={COLORS} />;
      case 'fav': return <FavScreen onBack={onBack} COLORS={COLORS} />;
      case 'mock': return <MockScreen onBack={onBack} COLORS={COLORS} />;
      default: return <HomeScreen user={user} onNavigate={goTo} onLogout={handleLogout} COLORS={COLORS} isDark={isDark} toggleDarkMode={toggleDarkMode} />;
    }
  };

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />
      {toastVis && <View style={[styles.toast, { backgroundColor: toastBg }]}><Text style={styles.toastTxt}>{toastMsg}</Text></View>}
      {renderScreen()}
      {screen !== 'login' && <BottomBar current={screen} onChange={goTo} COLORS={COLORS} />}
    </GestureHandlerRootView>
  );
}

function BottomBar({ current, onChange, COLORS }) {
  const tabs = [{ k: 'home', i: '🏠', l: '首页' }, { k: 'learn', i: '📚', l: '学习' }, { k: 'practice', i: '✍️', l: '刷题' }, { k: 'wrong', i: '📝', l: '错题' }, { k: 'fav', i: '❤️', l: '收藏' }];
  return <View style={[tabStyles.bar, { backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: Platform.OS === 'ios' ? 20 : 8 }]}>{tabs.map(t => <TouchableOpacity key={t.k} style={tabStyles.item} onPress={() => onChange(t.k)}><Text style={[tabStyles.icon, { opacity: current === t.k ? 1 : 0.5 }]}>{t.i}</Text><Text style={[tabStyles.label, { color: current === t.k ? COLORS.primary : COLORS.textSecondary, fontSize: 10 }]}>{t.l}</Text></TouchableOpacity>)}</View>;
}
const tabStyles = StyleSheet.create({ bar: { flexDirection: 'row', paddingTop: 8 }, item: { flex: 1, alignItems: 'center' }, icon: { fontSize: 20 }, label: { fontWeight: '600' } });

function LoadingView({ text = '加载中...', COLORS }) {
  return <View style={[styles.loading, { backgroundColor: COLORS.background }]}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>{text}</Text></View>;
}

// ==================== 登录 ====================
function LoginScreen({ onLogin, COLORS }) {
  const [isReg, setIsReg] = useState(false);
  const [user, setUser] = useState('');
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);

  const handleGuest = async () => { const gu = { id: 'guest', username: '游客', isGuest: true }; await saveData(STORAGE_KEYS.USER, gu); onLogin(gu); };
  const handleSubmit = async () => {
    if (!user.trim() || !pwd.trim()) { showToast('请输入用户名和密码', 'error'); return; }
    if (pwd.length < 6) { showToast('密码至少6位', 'error'); return; }
    setBtnLoading(true);
    try {
      const url = isReg ? '/api/register' : '/api/login';
      const res = await apiPost(url, { username: user, password: pwd }, true);
      if (res.token) { 
        const ud = { id: res.userId, username: user, token: res.token, isGuest: false }; 
        await saveData(STORAGE_KEYS.USER, ud); 
        onLogin(ud); 
        showToast(isReg ? '注册成功' : '登录成功', 'success'); 
      }
    } catch (e) { 
      const msg = e.message || '';
      if (msg.includes('timeout') || msg.includes('网络')) {
        showToast('无法连接服务器，请检查网络或NAS连接', 'error');
      } else {
        showToast(e.response?.data?.error || '登录失败', 'error');
      }
    }
    setBtnLoading(false);
  };

  return (
    <SafeAreaView style={[styles.loginContainer, { backgroundColor: COLORS.background }]}>
      <View style={[styles.loginBox, { backgroundColor: COLORS.card }]}>
        <Text style={[styles.title, { color: COLORS.primary }]}>面试大师</Text>
        <Text style={[styles.subtitle, { color: COLORS.textSecondary }]}>{isReg ? '创建账号' : '登录学习'}</Text>
        <View style={[styles.tabRow, { backgroundColor: COLORS.background }]}>
          <TouchableOpacity style={[styles.tab, !isReg && styles.tabActive, { backgroundColor: !isReg ? COLORS.primary : 'transparent' }]} onPress={() => setIsReg(false)}><Text style={[styles.tabText, !isReg && styles.tabTextActive, { color: !isReg ? '#fff' : COLORS.textSecondary }]}>登录</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tab, isReg && styles.tabActive, { backgroundColor: isReg ? COLORS.primary : 'transparent' }]} onPress={() => setIsReg(true)}><Text style={[styles.tabText, isReg && styles.tabTextActive, { color: isReg ? '#fff' : COLORS.textSecondary }]}>注册</Text></TouchableOpacity>
        </View>
        <TextInput style={[styles.input, { backgroundColor: COLORS.background, borderColor: COLORS.border, color: COLORS.text }]} placeholder="用户名" value={user} onChangeText={setUser} autoCapitalize="none" placeholderTextColor={COLORS.textSecondary} />
        <TextInput style={[styles.input, { backgroundColor: COLORS.background, borderColor: COLORS.border, color: COLORS.text }]} placeholder="密码" value={pwd} onChangeText={setPwd} secureTextEntry placeholderTextColor={COLORS.textSecondary} />
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.primary }]} onPress={handleSubmit} disabled={btnLoading}>
          {btnLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{isReg ? '注册' : '登录'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkBtn} onPress={() => setIsReg(!isReg)}><Text style={[styles.linkText, { color: COLORS.primary }]}>{isReg ? '登录' : '注册'}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.guestBtn} onPress={handleGuest}><Text style={[styles.guestText, { color: COLORS.textSecondary }]}>游客模式</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ==================== 首页 ====================
function HomeScreen({ user, onNavigate, onLogout, COLORS, isDark, toggleDarkMode }) {
  const [stat, setStat] = useState({ questions: 0 });
  const [loading, setLoading] = useState(true);
  const [userStat, setUserStat] = useState({ done: 0, correct: 0, wrong: 0, fav: 0 });

  useEffect(() => { 
    apiGet('/api/crawler/status', true).then(r => setStat(r.data || { questions: 0 })).catch(() => {}).finally(() => setLoading(false)); 
    // 加载用户学习统计
    (async () => {
      const [wrongList, favList, correctList] = await Promise.all([getData(STORAGE_KEYS.WRONG), getData(STORAGE_KEYS.FAVORITES), getData(STORAGE_KEYS.CORRECT)]);
      const done = (wrongList?.length || 0) + (favList?.length || 0) + (correctList?.length || 0);
      setUserStat({ done, correct: correctList?.length || 0, wrong: wrongList?.length || 0, fav: favList?.length || 0 });
    })();
  }, []);

  return (
    <ScrollView style={[styles.screen, { backgroundColor: COLORS.background }]}>
      <View style={[styles.header, { backgroundColor: COLORS.primary, paddingTop: Platform.OS === 'android' ? 50 : 60 }]}>
        <View><Text style={[styles.headerTitle, { color: '#fff' }]}>欢迎，{user?.username}</Text><Text style={[styles.headerSub, { color: 'rgba(255,255,255,0.8)' }]}>{user?.isGuest ? '游客' : '已登录'}</Text></View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}><Text style={styles.logoutText}>退出</Text></TouchableOpacity>
      </View>
      {/* 深色模式切换 */}
      <TouchableOpacity style={[styles.darkModeBtn, { backgroundColor: COLORS.card }]} onPress={toggleDarkMode}>
        <Text style={styles.darkModeIcon}>{isDark ? '🌙' : '☀️'}</Text>
        <Text style={[styles.darkModeText, { color: COLORS.text }]}>{isDark ? '深色' : '浅色'}模式</Text>
      </TouchableOpacity>
      <View style={[styles.statsContainer, { padding: 16, marginTop: -20 }]}>
        <View style={[styles.statCard, { backgroundColor: COLORS.card }]}>{loading ? <ActivityIndicator color={COLORS.primary} /> : <><Text style={[styles.statNum, { color: COLORS.primary }]}>{stat.questions}</Text><Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>题库</Text></>}</View>
        <View style={[styles.statCard, { backgroundColor: COLORS.card, marginTop: 12 }]}><Text style={[styles.statNum, { color: COLORS.success }]}>{userStat.done}</Text><Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>已刷</Text></View>
        <View style={[styles.statCard, { backgroundColor: COLORS.card, marginTop: 12 }]}><Text style={[styles.statNum, { color: COLORS.error }]}>{userStat.wrong}</Text><Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>错题</Text></View>
        <View style={[styles.statCard, { backgroundColor: COLORS.card, marginTop: 12 }]}><Text style={[styles.statNum, { color: '#9C27B0' }]}>{userStat.fav}</Text><Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>收藏</Text></View>
      </View>
      <Text style={[styles.sectionTitle, { color: COLORS.text }]}>核心功能</Text>
      <MenuCard title="知识学习" desc="系统化学体系" icon="📚" color="#4CAF50" on={() => onNavigate('learn')} COLORS={COLORS} />
      <MenuCard title="智能刷题" desc="NAS+AI双模式" icon="✍️" color="#2196F3" on={() => onNavigate('practice')} COLORS={COLORS} />
      <MenuCard title="错题本" desc="查漏补缺" icon="📝" color="#F44336" on={() => onNavigate('wrong')} COLORS={COLORS} />
      <MenuCard title="收藏夹" desc="收藏题目" icon="❤️" color="#9C27B0" on={() => onNavigate('fav')} COLORS={COLORS} />
      <MenuCard title="模拟面试" desc="AI真实面试" icon="🎯" color="#FF5722" on={() => onNavigate('mock')} COLORS={COLORS} />
    </ScrollView>
  );
}

function MenuCard({ title, desc, icon, color, on, COLORS }) {
  return <TouchableOpacity style={[styles.menuCard, { backgroundColor: COLORS.card }]} onPress={on}><View style={[styles.menuIcon, { backgroundColor: color }]}><Text style={{ fontSize: 28 }}>{icon}</Text></View><View style={styles.menuCon}><Text style={[styles.menuTitle, { color: COLORS.text }]}>{title}</Text><Text style={[styles.menuDesc, { color: COLORS.textSecondary }]}>{desc}</Text></View></TouchableOpacity>;
}

// ==================== 学习 ====================
function LearnScreen({ onBack, COLORS }) {
  const [cats, setCats] = useState({});
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // 从API加载分类和文章
  useEffect(() => { 
    Promise.all([
      apiGet('/api/categories', true).catch(() => []),
      apiGet('/api/articles', true).catch(() => [])
    ]).then(([catsRes, artsRes]) => {
      const m = {}; 
      (catsRes || []).forEach(c => { m[c.name] = c.children || []; });
      setCats(m);
      setArticles(artsRes || []);
    }).catch(e => {}).finally(() => setLoading(false)); 
  }, []);

  const filteredArticles = articles.filter(a => a.category === selectedCat || selectedSub && a.sub_category === selectedSub);

  // 选择子分类后显示文章列表
  if (selectedSub) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedSub(null)}><Text style={[styles.backBtnText, { color: COLORS.primary }]}>← 返回</Text></TouchableOpacity>
        <Text style={[styles.screenTitle, { color: COLORS.text }]}>📖 {selectedCat} · {selectedSub}</Text>
        <Text style={[styles.desc, { color: COLORS.textSecondary }]}>{filteredArticles.length}篇文章</Text>
        <ScrollView style={{ flex: 1, padding: 16 }}>
          {filteredArticles.length === 0 ? (
            <Text style={[styles.empty, { color: COLORS.textSecondary }]}>暂无文章</Text>
          ) : filteredArticles.map((a, i) => (
            <TouchableOpacity key={i} style={[styles.articleCard, { backgroundColor: COLORS.card }]}>
              <Text style={[styles.articleTitle, { color: COLORS.text }]}>{a.title}</Text>
              <Text style={[styles.articleDesc, { color: COLORS.textSecondary }]}>{a.source || '未知来源'}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.articleCard, { marginTop: 12, backgroundColor: COLORS.primary + '20' }]}>
            <Text style={[styles.articleTitle, { color: COLORS.primary }]}>✍️ 对应题库</Text>
            <Text style={styles.articleDesc}>学习后刷题巩固</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (loading) return <LoadingView text="加载中..." COLORS={COLORS} />;
  if (!selectedCat) return (
    <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}><Text style={[styles.backBtnText, { color: COLORS.primary }]}>← 返回</Text></TouchableOpacity>
      <Text style={[styles.screenTitle, { color: COLORS.text }]}>知识学习</Text>
      <Text style={[styles.desc, { color: COLORS.textSecondary }]}>选择分类查看文章</Text>
      <View style={styles.catGrid}>{Object.keys(cats).map((c, i) => <TouchableOpacity key={i} style={[styles.catCard, { backgroundColor: COLORS.card }]} onPress={() => setSelectedCat(c)}><Text style={[styles.catText, { color: COLORS.text }]}>{c}</Text><Text style={[styles.catSub, { color: COLORS.textSecondary }]}>{cats[c]?.length || 0}个</Text></TouchableOpacity>)}</View>
    </SafeAreaView>
  );
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedCat(null)}><Text style={[styles.backBtnText, { color: COLORS.primary }]}>← 返回</Text></TouchableOpacity>
      <Text style={[styles.screenTitle, { color: COLORS.text }]}>{selectedCat}</Text>
      <View style={styles.catGrid}>{(cats[selectedCat] || []).map((s, i) => <TouchableOpacity key={i} style={[styles.catCard, { backgroundColor: COLORS.card }]} onPress={() => setSelectedSub(s)}><Text style={[styles.catText, { color: COLORS.text }]}>{s}</Text></TouchableOpacity>)}</View>
    </SafeAreaView>
  );
}

// ==================== 刷题 ====================
function PracticeScreen({ onBack, COLORS }) {
  const [mode, setMode] = useState('select');
  const [qs, setQs] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cat, setCat] = useState('all');
  const [count, setCount] = useState(50);
  const [difficulty, setDifficulty] = useState('all');

  const [user, setUser] = useState(null);
  useEffect(() => { (async () => { const u = await getData(STORAGE_KEYS.USER); setUser(u); })(); }, []);

  const cats = ['all', 'Java基础', 'JVM', 'JUC', 'Redis', 'Kafka', '计算机网络', '操作系统', '数据库', '设计模式', '数据结构', 'AI', 'Agent'];
  const counts = [20, 50, 100, 150, 200];
  const difficulties = ['all', '简单', '中等', '困难', '混合'];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const loadQuestions = async () => {
    setLoading(true);
    try {
      let url = cat === 'all' ? `/api/questions?limit=${count}` : `/api/questions?category=${encodeURIComponent(cat)}&limit=${count}`;
      if (difficulty !== 'all') url += `&difficulty=${encodeURIComponent(difficulty)}`;
      const r = await apiGet(url, true);
      if (Array.isArray(r)) { setQs(r.map(q => ({ ...q, options: shuffle([...q.options]) }))); setIdx(0); setMode('practice'); showToast('加载成功', 'success'); }
      else { showToast('加载失败', 'error'); }
    } catch (e) { showToast('网络超时', 'error'); }
    setLoading(false);
  };

  // 错题立即记录
  const handleAnswer = async (ans) => {
    if (showResult) return;
    setSelected(ans); setShowResult(true);
    const q = qs[idx];
    if (ans !== q.answer) {
      // 登录用户存NAS，游客存本地
      if (user && !user.isGuest && user.token) {
        try { await apiPost('/api/wrong-answers', { question_id: q.id, wrong_option: ans, answered_at: new Date().toISOString() }, true); showToast('已记录错题', 'error'); } catch (e) {}
      } else {
        const wrongList = await getData(STORAGE_KEYS.WRONG) || [];
        wrongList.push({ question_id: q.id, category: q.category, question: q.question, answer: q.answer, wrong_option: ans, answered_at: new Date().toISOString() });
        await saveData(STORAGE_KEYS.WRONG, wrongList); showToast('已记录错题', 'error');
      }
    } else {
      // 记录正确答案
      const correctList = await getData(STORAGE_KEYS.CORRECT) || [];
      correctList.push({ question_id: q.id, category: q.category, question: q.question, answered_at: new Date().toISOString() });
      await saveData(STORAGE_KEYS.CORRECT, correctList);
    }
  };

  const next = () => { if (idx < qs.length - 1) { setIdx(idx + 1); setSelected(null); setShowResult(false); } else { showToast('完成！', 'success'); setMode('select'); } };

  const toggleFavorite = async () => {
    if (user && !user.isGuest && user.token) {
      try { await apiPost('/api/favorites', { question_id: qs[idx].id }, true); showToast('已收藏', 'success'); } catch (e) {}
    } else {
      const favList = await getData(STORAGE_KEYS.FAVORITES) || [];
      favList.push({ question_id: qs[idx].id, category: qs[idx].category, question: qs[idx].question, answer: qs[idx].answer, created_at: new Date().toISOString() });
      await saveData(STORAGE_KEYS.FAVORITES, favList); showToast('已收藏', 'success');
    }
  };

  // 分享题目
  const shareQuestion = async () => {
    const q = qs[idx];
    const text = `【面试大师】${q.category}题：${q.question}\n\n答案：${q.answer}\n\n来源：面试大师APP`;
    try {
      await Share.share({ message: text, title: '面试大师题目分享' });
    } catch (e) {
      Clipboard.setString(text);
      showToast('已复制到剪贴板', 'success');
    }
  };

  if (mode === 'select') return (
    <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.background }]}>
      <TouchableOpacity style={[styles.backBtn]} onPress={onBack}><Text style={[styles.backBtnText, { color: COLORS.primary }]}>← 返回</Text></TouchableOpacity>
      <Text style={[styles.screenTitle, { color: COLORS.text }]}>✍️ 智能刷题</Text>
      {loading ? <LoadingView COLORS={COLORS} /> : (
        <>
          <Text style={[styles.label, { color: COLORS.textSecondary }]}>分类</Text>
          <ScrollView horizontal style={styles.chipScroll}>{cats.map(c => <TouchableOpacity key={c} style={[styles.chip, { backgroundColor: COLORS.card, borderColor: COLORS.border }, cat === c && styles.chipActive]} onPress={() => setCat(c)}><Text style={[styles.chipText, { color: cat === c ? '#fff' : COLORS.text }]}>{c === 'all' ? '全部' : c}</Text></TouchableOpacity>)}</ScrollView>
          
          <Text style={[styles.label, { color: COLORS.textSecondary }]}>难度</Text>
          <ScrollView horizontal style={styles.chipScroll}>{difficulties.map(d => <TouchableOpacity key={d} style={[styles.chip, { backgroundColor: COLORS.card, borderColor: COLORS.border }, difficulty === d && styles.chipActive]} onPress={() => setDifficulty(d)}><Text style={[styles.chipText, { color: difficulty === d ? '#fff' : COLORS.text }]}>{d === 'all' ? '全部' : d}</Text></TouchableOpacity>)}</ScrollView>
          
          <Text style={[styles.label, { color: COLORS.textSecondary }]}>数量</Text>
          <ScrollView horizontal style={styles.chipScroll}>{counts.map(c => <TouchableOpacity key={c} style={[styles.chip, { backgroundColor: COLORS.card, borderColor: COLORS.border }, count === c && styles.chipActive]} onPress={() => setCount(c)}><Text style={[styles.chipText, { color: count === c ? '#fff' : COLORS.text }]}>{c}题</Text></TouchableOpacity>)}</ScrollView>
          
          <TouchableOpacity style={[styles.startBtn, { backgroundColor: COLORS.primary }]} onPress={loadQuestions}><Text style={styles.startBtnText}>开始刷题 ({count}题/{difficulty})</Text></TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );

  const q = qs[idx];
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.background }]}>
      <View style={[styles.progBar, { backgroundColor: COLORS.border }]}><View style={[styles.progFill, { width: `${((idx + 1) / qs.length) * 100}%`, backgroundColor: COLORS.primary }]} /></View>
      <Text style={[styles.progTxt, { color: COLORS.textSecondary }]}>{idx + 1}/{qs.length}</Text>
      <ScrollView style={styles.qCon}>
        <View style={styles.qHeader}><Text style={[styles.qCat, { color: COLORS.primary }]}>{q.category}</Text></View>
        <Text style={[styles.qTxt, { color: COLORS.text }]}>{q.question}</Text>
        {q.options.map((o, i) => {
          let bg = COLORS.card, bc = COLORS.border;
          if (showResult) { if (o === q.answer) { bg = '#E8F5E9'; bc = COLORS.success; } else if (o === selected) { bg = '#FFEBEE'; bc = COLORS.error; } }
          return <TouchableOpacity key={i} style={[styles.opt, { backgroundColor: bg, borderColor: bc }]} onPress={() => handleAnswer(o)} disabled={showResult}><Text style={[styles.optTxt, { color: COLORS.text }]}>{o}</Text>{showResult && o === q.answer && <Text style={{ color: COLORS.success }}>✓</Text>}</TouchableOpacity>;
        })}
      </ScrollView>
      {showResult && <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.card, borderColor: COLORS.border }]} onPress={toggleFavorite}><Text style={[styles.actionBtnTxt, { color: COLORS.text }]}>❤️ 收藏</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} onPress={next}><Text style={styles.actionBtnTxt}>{idx < qs.length - 1 ? '下一题' : '完成'}</Text></TouchableOpacity>
      </View>}
    </SafeAreaView>
  );
}

// ==================== 错题 ====================
function WrongScreen({ onBack, COLORS }) {
  const [list, setList] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => { 
    const u = await getData(STORAGE_KEYS.USER);
    setUser(u);
    // 登录用户从NAS获取
    if (u && !u.isGuest && u.token) {
      try { const r = await apiGet('/api/wrong-answers', true); setList(r || []); } catch (e) { showToast('获取错题失败', 'error'); setList([]); }
    } else {
      // 游客提示登录
      setList([]); 
    }
    setLoading(false);
  })(); }, []);
  if (loading) return <LoadingView COLORS={COLORS} />;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}><Text style={[styles.backBtnText, { color: COLORS.primary }]}>← 返回</Text></TouchableOpacity>
      <Text style={[styles.screenTitle, { color: COLORS.text }]}>错题本</Text>
      {(!user || user.isGuest) && <Text style={[styles.empty, { color: COLORS.textSecondary }]}>请登录查看错题</Text>}
      {list.length === 0 && user && !user.isGuest && <Text style={[styles.empty, { color: COLORS.textSecondary }]}>🎉 暂无错题!</Text>}
      {list.map((q, i) => <View key={i} style={[styles.wrongCard, { backgroundColor: COLORS.card, borderLeftColor: COLORS.error }]}><Text style={[styles.wrongCat, { color: COLORS.textSecondary }]}>{q.category}</Text><Text style={[styles.wrongQ, { color: COLORS.text }]}>{q.question}</Text><Text style={[styles.wrongA, { color: COLORS.success }]}>答案: {q.answer}</Text></View>)}
    </SafeAreaView>
  );
}

// ==================== 收藏 ====================
function FavScreen({ onBack, COLORS }) {
  const [list, setList] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => { 
    const u = await getData(STORAGE_KEYS.USER);
    setUser(u);
    if (u && !u.isGuest && u.token) {
      try { const r = await apiGet('/api/favorites', true); setList(r || []); } catch (e) { showToast('获取收藏失败', 'error'); setList([]); }
    } else {
      setList([]); 
    }
    setLoading(false);
  })(); }, []);
  if (loading) return <LoadingView COLORS={COLORS} />;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}><Text style={[styles.backBtnText, { color: COLORS.primary }]}>← 返回</Text></TouchableOpacity>
      <Text style={[styles.screenTitle, { color: COLORS.text }]}>收藏夹</Text>
      {(!user || user.isGuest) && <Text style={[styles.empty, { color: COLORS.textSecondary }]}>请登录查看收藏</Text>}
      {list.length === 0 && user && !user.isGuest && <Text style={[styles.empty, { color: COLORS.textSecondary }]}>暂无收藏!</Text>}
      {list.map((q, i) => <View key={i} style={[styles.favCard, { backgroundColor: COLORS.card, borderLeftColor: '#9C27B0' }]}><Text style={[styles.favCat, { color: COLORS.textSecondary }]}>{q.category}</Text><Text style={[styles.favQ, { color: COLORS.text }]}>{q.question}</Text><Text style={[styles.favA, { color: COLORS.success }]}>答案: {q.answer}</Text></View>)}
    </SafeAreaView>
  );
}

// ==================== 模拟面试 ====================
function MockScreen({ onBack, COLORS }) {
  const [category, setCategory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cats, setCats] = useState({});

  useEffect(() => { apiGet('/api/categories', true).then(r => { const m = {}; r.forEach(c => { m[c.name] = c.children || []; }); setCats(m); }).catch(() => {}); }, []);

  const startMock = async (cat) => {
    setLoading(true);
    try {
      const res = await apiPost('/api/ai/generate-questions', { category: cat, count: 5 }, true);
      setQuestions(res.questions || []);
      setCategory(cat);
      setStarted(true);
      setCurrent(0);
      setAnswer('');
      setResult(null);
    } catch (e) {
      showToast('启动失败', 'error');
    }
    setLoading(false);
  };

  const submitAnswer = async () => {
    if (!answer.trim()) { showToast('请输入答案', 'error'); return; }
    setLoading(true);
    try {
      const res = await apiPost('/api/ai/score', { question: questions[current].question, answer: answer }, true);
      setResult(res);
    } catch (e) { showToast('评分失败', 'error'); }
    setLoading(false);
  };

  const nextQ = () => {
    if (current < questions.length - 1) { setCurrent(c => c + 1); setAnswer(''); setResult(null); }
    else { showToast('面试完成!', 'success'); setStarted(false); }
  };

  if (!started) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.background }]}>
        <TouchableOpacity style={[styles.backBtn]} onPress={onBack}><Text style={[styles.backBtnText, { color: COLORS.primary }]}>← 返回</Text></TouchableOpacity>
        <Text style={[styles.screenTitle, { color: COLORS.text }]}>🎯 模拟面试</Text>
        <Text style={[styles.desc, { color: COLORS.textSecondary }]}>选择分类开始AI面试</Text>
        <View style={styles.catGrid}>{Object.keys(cats).map((c, i) => <TouchableOpacity key={i} style={[styles.catCard, { backgroundColor: COLORS.card }]} onPress={() => startMock(c)}><Text style={[styles.catText, { color: COLORS.text }]}>{c}</Text><Text style={[styles.catSub, { color: COLORS.textSecondary }]}>开始面试</Text></TouchableOpacity>)}</View>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) return <LoadingView COLORS={COLORS} />;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.background }]}>
      <TouchableOpacity style={[styles.backBtn]} onPress={() => setStarted(false)}><Text style={[styles.backBtnText, { color: COLORS.primary }]}>← 退出</Text></TouchableOpacity>
      <View style={[styles.qCon, { backgroundColor: COLORS.background }]}>
        <Text style={[styles.qCat, { color: COLORS.textSecondary }]}>{category} • {current + 1}/{questions.length}</Text>
        <Text style={[styles.qTxt, { color: COLORS.text }]}>{questions[current]?.question}</Text>
        {!result && <>
          <TextInput style={[styles.input, { backgroundColor: COLORS.card, color: COLORS.text, borderColor: COLORS.border }]} multiline numberOfLines={4} placeholder="请口头说出你的答案..." placeholderTextColor={COLORS.textSecondary} value={answer} onChangeText={setAnswer} />
          <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.primary }]} onPress={submitAnswer} disabled={loading}><Text style={styles.btnText}>{loading ? '评分中...' : '提交答案'}</Text></TouchableOpacity>
        </>}
        {result && <>
          <View style={[styles.resultBox, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.resultScore, { color: result.score >= 60 ? COLORS.success : COLORS.error }]}>得分: {result.score}</Text>
            <Text style={[styles.resultFeedback, { color: COLORS.text }]}>{result.feedback}</Text>
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.primary }]} onPress={nextQ}><Text style={styles.btnText}>{current < questions.length - 1 ? '下一题' : '完成'}</Text></TouchableOpacity>
        </>}
      </View>
    </SafeAreaView>
  );
}

// ==================== 样式 ====================
const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10 },
  toast: { position: 'absolute', bottom: '15%', left: 20, right: 20, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, elevation: 10, opacity: 0.95 },
  toastTxt: { color: '#fff', fontSize: 15, textAlign: 'center', fontWeight: '500' },
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginBox: { width: SCREEN_WIDTH * 0.85, borderRadius: 20, padding: 24, elevation: 5 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  tabRow: { flexDirection: 'row', marginBottom: 20, borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  tabActive: {},
  tabText: { fontSize: 16, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  input: { borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16, borderWidth: 1 },
  btn: { borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center', marginTop: 12, elevation: 3 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  linkBtn: { marginTop: 16, alignItems: 'center' },
  linkText: { fontSize: 14 },
  guestBtn: { marginTop: 20, alignItems: 'center' },
  guestText: { fontSize: 14 },
  screen: { flex: 1 },
  header: { paddingTop: 50, padding: 20, flexDirection: 'row', justifyContent: 'space-between' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  logoutText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  darkModeBtn: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 12 },
  darkModeIcon: { fontSize: 24, marginRight: 12 },
  darkModeText: { fontSize: 16, fontWeight: '600' },
  statsContainer: { padding: 16, marginTop: -20, flexDirection: 'row', justifyContent: 'space-between' },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', elevation: 3, marginHorizontal: 4 },
  statNum: { fontSize: 32, fontWeight: 'bold' },
  statLabel: { fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '600', margin: 16, marginTop: 8 },
  menuCard: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16, elevation: 2 },
  menuIcon: { width: 52, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuCon: { marginLeft: 16, flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600' },
  menuDesc: { fontSize: 13 },
  backBtn: { paddingTop: 50, padding: 12 },
  backBtnText: { fontSize: 16, fontWeight: '600' },
  screenTitle: { fontSize: 24, fontWeight: 'bold', margin: 16 },
  desc: { fontSize: 14, marginHorizontal: 16, marginBottom: 16 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12 },
  catCard: { width: '46%', borderRadius: 12, padding: 16, margin: '2%', alignItems: 'center', elevation: 2 },
  catText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  catSub: { fontSize: 12 },
  label: { fontSize: 14, marginLeft: 16, marginTop: 12 },
  chipScroll: { paddingHorizontal: 12, marginVertical: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginHorizontal: 4, borderWidth: 1 },
  chipActive: {},
  chipText: { fontSize: 14 },
  chipTextActive: { color: '#fff' },
  startBtn: { margin: 16, padding: 16, borderRadius: 12, alignItems: 'center', elevation: 3 },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  progBar: { height: 4 },
  progFill: { height: '100%' },
  progTxt: { textAlign: 'center', padding: 8 },
  qCon: { flex: 1, padding: 16 },
  qHeader: { marginBottom: 12 },
  qCat: { fontSize: 13 },
  qTxt: { fontSize: 18, fontWeight: '600', marginBottom: 20, lineHeight: 26 },
  opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 2 },
  optTxt: { fontSize: 16, flex: 1 },
  nextBtn: { margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 16 },
  wrongCard: { margin: 16, marginBottom: 12, borderRadius: 12, padding: 16, borderLeftWidth: 4 },
  wrongCat: { fontSize: 12 },
  wrongQ: { fontSize: 15, marginVertical: 8 },
  wrongA: { fontSize: 14 },
  favCard: { margin: 16, marginBottom: 12, borderRadius: 12, padding: 16, borderLeftWidth: 4 },
  favCat: { fontSize: 12 },
  favQ: { fontSize: 15, marginVertical: 8 },
  favA: { fontSize: 14 },
  articleCard: { padding: 20, borderRadius: 12, marginTop: 12 },
  articleTitle: { fontSize: 18, fontWeight: '600' },
  articleDesc: { fontSize: 14, marginTop: 8 },
  resultBox: { padding: 16, borderRadius: 12, marginTop: 16 },
  resultScore: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  resultFeedback: { fontSize: 15, lineHeight: 22 },
});
