import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusBar, View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, AsyncStorage, Dimensions, Platform, BackHandler, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import axios from 'axios';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// API地址 - 支持双栈
const API_BASE_V4 = 'http://100.106.29.60:3000';
const API_BASE_V6 = 'http://[fd7a:115c:a1e0::8a01:1dcc]:3000';
const TIMEOUT = 8000;  // 增加到8秒，给内网穿透更多时间
const TIMEOUT_SLOW = 15000;  // 慢速网络15秒

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

const STORAGE_KEYS = { USER: '@im_user', WRONG: '@im_wrong', FAVORITES: '@im_favorites' };
const saveData = async (k, d) => { try { await AsyncStorage.setItem(k, JSON.stringify(d)); } catch (e) {} };
const getData = async (k) => { try { const d = await AsyncStorage.getItem(k); return d ? JSON.parse(d) : null; } catch (e) { return null; } };

// API请求工具
// 网络状态追踪
let networkState = { lastError: null, isSlow: false };

const apiGet = async (url, useSlow = false) => {
  const timeout = useSlow ? TIMEOUT_SLOW : TIMEOUT;
  const startTime = Date.now();
  
  try { 
    const user = await getData(STORAGE_KEYS.USER);
    const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
    return await axios.get(API_BASE_V4 + url, { timeout, headers }).then(r => r.data); 
  }
  catch (e) {
    const elapsed = Date.now() - startTime;
    // 如果耗时超过5秒，说明可能走了内网穿透
    networkState.isSlow = elapsed > 5000;
    
    if (e.code === 'ECONNABORTED' || e.message?.includes('timeout') || e.code === 'ECONNREFUSED') { 
      try { 
        const user = await getData(STORAGE_KEYS.USER);
        const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {}; 
        return await axios.get(API_BASE_V6 + url, { timeout, headers }).then(r => r.data); 
      } catch (e2) { 
        networkState.lastError = 'fail';
        throw e2; 
      }
    }
    networkState.lastError = 'fail';
    throw e;
  }
};
const apiPost = async (url, data, useSlow = false) => {
  const timeout = useSlow ? TIMEOUT_SLOW : TIMEOUT;
  const startTime = Date.now();
  
  try { 
    const user = await getData(STORAGE_KEYS.USER);
    const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
    return await axios.post(API_BASE_V4 + url, data, { timeout, headers }).then(r => r.data); 
  }
  catch (e) {
    const elapsed = Date.now() - startTime;
    networkState.isSlow = elapsed > 5000;
    
    if (e.code === 'ECONNABORTED' || e.message?.includes('timeout') || e.code === 'ECONNREFUSED') { 
      try { 
        const user = await getData(STORAGE_KEYS.USER);
        const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {}; 
        return await axios.post(API_BASE_V6 + url, data, { timeout, headers }).then(r => r.data); 
      } catch (e2) { 
        networkState.lastError = 'fail';
        throw e2; 
      }
    }
    networkState.lastError = 'fail';
    throw e;
  }
};

// Toast工具 - 修复引用问题
let toastRef = null;
let toastTimeout = null;
const showToast = (msg, type = 'info') => {
  if (toastRef && toastRef.show) {
    toastRef.show(msg, type);
  }
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

  // Toast函数 - 修复：确保正确设置显示
  const displayToast = useCallback((msg, type) => {
    const bg = type === 'error' ? COLORS.error : type === 'success' ? COLORS.success : COLORS.primary;
    setToastMsg(msg); setToastBg(bg); setToastVis(true);
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => setToastVis(false), 1800);
  }, [COLORS]);

  // 注册toast引用 - 修复：确保正确传递函数
  useEffect(() => {
    toastRef = { show: displayToast };
    return () => { toastRef = null; };
  }, [displayToast]);

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

  useEffect(() => { (async () => { const u = await getData(STORAGE_KEYS.USER); if (u) { setUser(u); setScreen('home'); } setLoading(false); })(); }, []);

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

  // Toast样式 - 底部显示，毛玻璃效果
  const getToastStyle = () => {
    const bg = toastBg === '#F44336' ? 'rgba(244, 67, 54, 0.92)' : toastBg === '#4CAF50' ? 'rgba(76, 175, 80, 0.92)' : 'rgba(33, 150, 243, 0.92)';
    return { backgroundColor: bg };
  };

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
      {toastVis && (
        <View style={styles.toastContainer} pointerEvents="none">
          <View style={[styles.toastBox, getToastStyle()]}>
            <Text style={styles.toastText}>{toastMsg}</Text>
          </View>
        </View>
      )}
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
      const errMsg = e.response?.data?.error;
      if (errMsg) { showToast(errMsg, 'error'); }
      else if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) { 
        // 区分超时类型
        if (networkState.isSlow) {
          showToast('连接较慢，请耐心等待...', 'error');
        } else {
          showToast('连接超时，请检查网络', 'error');
        }
      }
      else if (e.code === 'ENOTFOUND' || e.code === 'ECONNREFUSED') { showToast('无法连接服务器', 'error'); }
      else { showToast('网络错误: ' + (e.message || '未知错误'), 'error'); }
    }
    setBtnLoading(false);
  };

  return (
    <SafeAreaView style={[styles.loginContainer, { backgroundColor: COLORS.background }]}>
      <View style={[styles.loginBox, { backgroundColor: COLORS.card }]}>
        <Text style={[styles.title, { color: COLORS.primary }]}>🎯 面试大师 🎯</Text>
        <Text style={[styles.subtitle, { color: COLORS.textSecondary }]}>{isReg ? '创建账号' : '登录学习'}</Text>
        <View style={[styles.tabRow, { backgroundColor: COLORS.background }]}>
          <TouchableOpacity style={[styles.tab, !isReg && styles.tabActive, { backgroundColor: !isReg ? COLORS.primary : 'transparent' }]} onPress={() => setIsReg(false)} activeOpacity={0.8}><Text style={[styles.tabText, !isReg && styles.tabTextActive, { color: !isReg ? '#fff' : COLORS.textSecondary }]}>登录</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tab, isReg && styles.tabActive, { backgroundColor: isReg ? COLORS.primary : 'transparent' }]} onPress={() => setIsReg(true)} activeOpacity={0.8}><Text style={[styles.tabText, isReg && styles.tabTextActive, { color: isReg ? '#fff' : COLORS.textSecondary }]}>注册</Text></TouchableOpacity>
        </View>
        <TextInput style={[styles.input, { backgroundColor: COLORS.background, borderColor: COLORS.border, color: COLORS.text }]} placeholder="用户名" value={user} onChangeText={setUser} autoCapitalize="none" placeholderTextColor={COLORS.textSecondary} />
        <TextInput style={[styles.input, { backgroundColor: COLORS.background, borderColor: COLORS.border, color: COLORS.text }]} placeholder="密码" value={pwd} onChangeText={setPwd} secureTextEntry placeholderTextColor={COLORS.textSecondary} />
        {/* 修复：按钮高度固定，不抖动，添加loading状态 */}
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.primary, opacity: btnLoading ? 0.7 : 1 }]} onPress={handleSubmit} disabled={btnLoading} activeOpacity={0.9}>
          {btnLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>{isReg ? '注册' : '登录'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkBtn} onPress={() => setIsReg(!isReg)} activeOpacity={0.7}><Text style={[styles.linkText, { color: COLORS.primary }]}>{isReg ? '已有账号？登录' : '没有账号？注册'}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.guestBtn} onPress={handleGuest} activeOpacity={0.7}><Text style={[styles.guestText, { color: COLORS.textSecondary }]}>游客模式</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ==================== 首页 ====================
function HomeScreen({ user, onNavigate, onLogout, COLORS, isDark, toggleDarkMode }) {
  const [stat, setStat] = useState({ questions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { apiGet('/api/crawler/status', true).then(r => setStat(r.data || { questions: 0 })).catch(() => {}).finally(() => setLoading(false)); }, []);

  // 修复：主界面顶部padding减少
  const headerPadding = Platform.OS === 'android' ? 30 : 40;

  return (
    <ScrollView style={[styles.screen, { backgroundColor: COLORS.background }]}>
      <View style={[styles.header, { backgroundColor: COLORS.primary, paddingTop: headerPadding }]}>
        <View><Text style={[styles.headerTitle, { color: '#fff' }]}>欢迎，{user?.username}</Text><Text style={[styles.headerSub, { color: 'rgba(255,255,255,0.8)' }]}>{user?.isGuest ? '游客' : '已登录'}</Text></View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}><Text style={styles.logoutText}>退出</Text></TouchableOpacity>
      </View>
      {/* 深色模式切换 */}
      <TouchableOpacity style={[styles.darkModeBtn, { backgroundColor: COLORS.card }]} onPress={toggleDarkMode} activeOpacity={0.7}>
        <Text style={styles.darkModeIcon}>{isDark ? '🌙' : '☀️'}</Text>
        <Text style={[styles.darkModeText, { color: COLORS.text }]}>{isDark ? '深色' : '浅色'}模式</Text>
      </TouchableOpacity>
      <View style={[styles.statsContainer, { padding: 16, marginTop: -20 }]}>
        <View style={[styles.statCard, { backgroundColor: COLORS.card }]}>{loading ? <ActivityIndicator color={COLORS.primary} /> : <><Text style={[styles.statNum, { color: COLORS.primary }]}>{stat.questions}</Text><Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>题库</Text></>}</View>
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
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  // 修复：子页面顶部paddingTop减少
  const backPadding = Platform.OS === 'android' ? 8 : 10;

  // 从API加载三级分类树
  useEffect(() => { 
    apiGet('/api/category-tree', true).then(r => { setCats(r || {}); }).catch(() => { showToast('加载分类失败', 'error'); }).finally(() => setLoading(false)); 
  }, []);

  // 加载文章 - 修复：添加错误提示
  useEffect(() => {
    if (selectedSub) {
      setLoadingArticles(true);
      apiGet(`/api/articles?category=${encodeURIComponent(selectedCat)}&subcategory=${encodeURIComponent(selectedSub)}&limit=20`, true)
        .then(r => {
          setArticles(r || []);
          if (!r || r.length === 0) showToast('该分类暂无文章', 'error');
        })
        .catch(() => {
          setArticles([]);
          showToast('加载文章失败', 'error');
        })
        .finally(() => setLoadingArticles(false));
    }
  }, [selectedSub, selectedCat]);

  if (loading) return <LoadingView text="加载分类..." COLORS={COLORS} />;
  if (!selectedCat) return (
    <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.background }]}>
      <TouchableOpacity style={[styles.backBtn, { paddingTop: backPadding }]} onPress={onBack} activeOpacity={0.7}><Text style={[styles.backBtnText, { color: COLORS.primary }]}>← 返回</Text></TouchableOpacity>
      <Text style={[styles.screenTitle, { color: COLORS.text }]}>📚 知识学习</Text>
      <Text style={[styles.desc, { color: COLORS.textSecondary }]}>选择分类开始学习</Text>
      <ScrollView style={{ flex: 1, padding: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{Object.keys(cats).map((c, i) => <TouchableOpacity key={i} style={[styles.catCard, { backgroundColor: COLORS.card, width: '46%', margin: '2%' }]} onPress={() => setSelectedCat(c)}><Text style={[styles.catText, { color: COLORS.text }]}>{c}</Text><Text style={[styles.catSub, { color: COLORS.textSecondary }]}>{Object.keys(cats[c] || {}).length}个子类</Text></TouchableOpacity>)}</View>
      </ScrollView>
    </SafeAreaView>
  );
  if (!selectedSub) return (
    <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.background }]}>
      <TouchableOpacity style={[styles.backBtn, { paddingTop: Platform.OS === "android" ? 8 : 10 }]} onPress={() => setSelectedCat(null)}><Text style={[styles.backBtnText, { color: COLORS.primary }]}>← 返回</Text></TouchableOpacity>
      <Text style={[styles.screenTitle, { color: COLORS.text }]}>📚 {selectedCat}</Text>
      <ScrollView style={{ flex: 1, padding: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{(Object.keys(cats[selectedCat] || {})).map((s, i) => <TouchableOpacity key={i} style={[styles.catCard, { backgroundColor: COLORS.card, width: '46%', margin: '2%' }]} onPress={() => setSelectedSub(s)}><Text style={[styles.catText, { color: COLORS.text }]}>{s}</Text><Text style={[styles.catSub, { color: COLORS.textSecondary }]}>{cats[selectedCat]?.[s]?.length || 0}知识点</Text></TouchableOpacity>)}</View>
      </ScrollView>
    </SafeAreaView>
  );
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.background }]}>
      <TouchableOpacity style={[styles.backBtn, { paddingTop: Platform.OS === "android" ? 8 : 10 }]} onPress={() => setSelectedSub(null)}><Text style={[styles.backBtnText, { color: COLORS.primary }]}>← 返回</Text></TouchableOpacity>
      <Text style={[styles.screenTitle, { color: COLORS.text }]}>📖 {selectedCat} · {selectedSub}</Text>
      {loadingArticles ? <LoadingView text="加载文章..." COLORS={COLORS} /> : (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          {articles.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 16 }}>暂无文章</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 8 }}>该分类下暂无知识文章</Text>
            </View>
          ) : (
            articles.map((a, i) => (
              <TouchableOpacity key={i} style={[styles.articleCard, { backgroundColor: COLORS.card, marginBottom: 12 }]}>
                <Text style={[styles.articleTitle, { color: COLORS.text }]}>{a.title}</Text>
                <Text style={[styles.articleDesc, { color: COLORS.textSecondary }]} numberOfLines={2}>{a.content?.substring(0, 100)}...</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
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
  const [count, setCount] = useState(20);
  const [difficulty, setDifficulty] = useState('all');
  const [source, setSource] = useState('nas'); // nas 或 ai

  const [user, setUser] = useState(null);
  useEffect(() => { (async () => { const u = await getData(STORAGE_KEYS.USER); setUser(u); })(); }, []);

  const cats = ['all', 'Java基础', 'JVM', 'JUC', 'Redis', 'Kafka', '计算机网络', '操作系统', '数据库', '设计模式', '数据结构', 'AI', 'Agent'];
  const counts = [10, 20, 50, 100];
  const difficulties = ['all', '简单', '中等', '困难'];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const loadQuestions = async () => {
    setLoading(true);
    try {
      let url;
      if (source === 'nas') {
        // NAS题库 - 支持三级分类
        url = cat === 'all' ? `/api/public/questions?limit=${count}` : `/api/public/questions?category=${encodeURIComponent(cat)}&limit=${count}`;
        if (difficulty !== 'all') url += `&difficulty=${encodeURIComponent(difficulty)}`;
      } else {
        // AI出题
        url = `/api/ai/generate-questions?category=${encodeURIComponent(cat === 'all' ? 'Java基础' : cat)}&difficulty=${difficulty === 'all' ? 'medium' : difficulty}&count=${count}`;
      }
      const r = await apiGet(url, true);
      if (Array.isArray(r) && r.length > 0) { setQs(r.map(q => ({ ...q, options: shuffle([...q.options]) }))); setIdx(0); setMode('practice'); showToast(`加载成功 ${r.length}题`, 'success'); }
      else { showToast('暂无题目', 'error'); }
    } catch (e) { showToast('加载失败', 'error'); }
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

  if (mode === 'select') return (
    <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.background }]}>
      <TouchableOpacity style={[styles.backBtn, { paddingTop: Platform.OS === "android" ? 8 : 10 }]} onPress={onBack}><Text style={[styles.backBtnText, { color: COLORS.primary }]}>← 返回</Text></TouchableOpacity>
      <Text style={[styles.screenTitle, { color: COLORS.text }]}>✍️ 智能刷题</Text>
      {loading ? <LoadingView text="加载中..." COLORS={COLORS} /> : (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          {/* 题源选择 */}
          <Text style={[styles.label, { color: COLORS.textSecondary }]}>题源</Text>
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            <TouchableOpacity style={{ flex: 1, padding: 14, borderRadius: 10, backgroundColor: source === 'nas' ? COLORS.primary : COLORS.card, marginRight: 8 }} onPress={() => setSource('nas')}>
              <Text style={{ textAlign: 'center', color: source === 'nas' ? '#fff' : COLORS.text, fontWeight: '600' }}>📚 NAS题库</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, padding: 14, borderRadius: 10, backgroundColor: source === 'ai' ? COLORS.primary : COLORS.card }} onPress={() => setSource('ai')}>
              <Text style={{ textAlign: 'center', color: source === 'ai' ? '#fff' : COLORS.text, fontWeight: '600' }}>🤖 AI出题</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: COLORS.textSecondary }]}>分类 {cat === 'all' ? '(全部)' : ''}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {cats.map(c => <TouchableOpacity key={c} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: cat === c ? COLORS.primary : COLORS.card, marginRight: 8 }} onPress={() => setCat(c)}><Text style={{ color: cat === c ? '#fff' : COLORS.text }}>{c === 'all' ? '全部' : c}</Text></TouchableOpacity>)}
          </ScrollView>
          
          <Text style={[styles.label, { color: COLORS.textSecondary }]}>难度</Text>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            {difficulties.map(d => <TouchableOpacity key={d} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: difficulty === d ? COLORS.primary : COLORS.card, marginRight: 8 }} onPress={() => setDifficulty(d)}><Text style={{ color: difficulty === d ? '#fff' : COLORS.text }}>{d === 'all' ? '全部' : d}</Text></TouchableOpacity>)}
          </View>
          
          <Text style={[styles.label, { color: COLORS.textSecondary }]}>数量</Text>
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            {counts.map(c => <TouchableOpacity key={c} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: count === c ? COLORS.primary : COLORS.card, marginRight: 8 }} onPress={() => setCount(c)}><Text style={{ color: count === c ? '#fff' : COLORS.text }}>{c}题</Text></TouchableOpacity>)}
          </View>
          
          <TouchableOpacity style={[styles.startBtn, { backgroundColor: COLORS.primary }]} onPress={loadQuestions}><Text style={styles.startBtnText}>开始刷题</Text></TouchableOpacity>
        </ScrollView>
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
      {showResult && <TouchableOpacity style={[styles.nextBtn, { backgroundColor: COLORS.primary }]} onPress={next}><Text style={styles.nextBtnTxt}>{idx < qs.length - 1 ? '下一题' : '完成'}</Text></TouchableOpacity>}
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
    // 登录用户从NAS获取，游客从本地获取
    if (u && !u.isGuest && u.token) {
      try { const r = await apiGet('/api/wrong-answers', true); setList(r || []); } catch (e) { setList([]); }
    } else {
      setList(await getData(STORAGE_KEYS.WRONG) || []);
    }
    setLoading(false);
  })(); }, []);
  if (loading) return <LoadingView COLORS={COLORS} />;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.background }]}>
      <TouchableOpacity style={[styles.backBtn, { paddingTop: Platform.OS === "android" ? 8 : 10 }]} onPress={onBack}><Text style={[styles.backBtnText, { color: COLORS.primary }]}>← 返回</Text></TouchableOpacity>
      <Text style={[styles.screenTitle, { color: COLORS.text }]}>📝 错题本</Text>
      <ScrollView>{list.length === 0 && <Text style={[styles.empty, { color: COLORS.textSecondary }]}>🎉 暂无错题!</Text>}
      {list.map((q, i) => <View key={i} style={[styles.wrongCard, { backgroundColor: COLORS.card, borderLeftColor: COLORS.error }]}><Text style={[styles.wrongCat, { color: COLORS.textSecondary }]}>{q.category}</Text><Text style={[styles.wrongQ, { color: COLORS.text }]}>{q.question}</Text><Text style={[styles.wrongA, { color: COLORS.success }]}>答案: {q.answer}</Text></View>)}
      </ScrollView>
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
      try { const r = await apiGet('/api/favorites', true); setList(r || []); } catch (e) { setList([]); }
    } else {
      setList(await getData(STORAGE_KEYS.FAVORITES) || []);
    }
    setLoading(false);
  })(); }, []);
  if (loading) return <LoadingView COLORS={COLORS} />;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.background }]}>
      <TouchableOpacity style={[styles.backBtn, { paddingTop: Platform.OS === "android" ? 8 : 10 }]} onPress={onBack}><Text style={[styles.backBtnText, { color: COLORS.primary }]}>← 返回</Text></TouchableOpacity>
      <Text style={[styles.screenTitle, { color: COLORS.text }]}>❤️ 收藏夹</Text>
      <ScrollView>{list.length === 0 && <Text style={[styles.empty, { color: COLORS.textSecondary }]}>暂无收藏!</Text>}
      {list.map((q, i) => <View key={i} style={[styles.favCard, { backgroundColor: COLORS.card, borderLeftColor: '#9C27B0' }]}><Text style={[styles.favCat, { color: COLORS.textSecondary }]}>{q.category}</Text><Text style={[styles.favQ, { color: COLORS.text }]}>{q.question}</Text><Text style={[styles.favA, { color: COLORS.success }]}>答案: {q.answer}</Text></View>)}
      </ScrollView>
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

  useEffect(() => { apiGet('/api/category-tree', true).then(r => { const m = {}; r.forEach(c => { m[c.name] = c.children || []; }); setCats(m); }).catch(() => {}); }, []);

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
        <TouchableOpacity style={[styles.backBtn, { paddingTop: Platform.OS === "android" ? 8 : 10 }]} onPress={onBack}><Text style={[styles.backBtnText, { color: COLORS.primary }]}>← 返回</Text></TouchableOpacity>
        <Text style={[styles.screenTitle, { color: COLORS.text }]}>🎯 模拟面试</Text>
        <Text style={[styles.desc, { color: COLORS.textSecondary }]}>选择分类开始AI面试</Text>
        <View style={styles.catGrid}>{Object.keys(cats).map((c, i) => <TouchableOpacity key={i} style={[styles.catCard, { backgroundColor: COLORS.card }]} onPress={() => startMock(c)}><Text style={[styles.catText, { color: COLORS.text }]}>{c}</Text><Text style={[styles.catSub, { color: COLORS.textSecondary }]}>开始面试</Text></TouchableOpacity>)}</View>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) return <LoadingView COLORS={COLORS} />;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.background }]}>
      <TouchableOpacity style={[styles.backBtn, { paddingTop: Platform.OS === "android" ? 8 : 10 }]} onPress={() => setStarted(false)}><Text style={[styles.backBtnText, { color: COLORS.primary }]}>← 退出</Text></TouchableOpacity>
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
  // 修复：Toast底部显示，毛玻璃效果，文字白色
  toastContainer: { position: 'absolute', bottom: '15%', left: 0, right: 0, alignItems: 'center', zIndex: 9999 },
  toastBox: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 28, elevation: 8, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 12, maxWidth: '85%' },
  toastText: { color: '#fff', fontSize: 15, fontWeight: '500', textAlign: 'center' },
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
  btn: { borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, minHeight: 52 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  linkBtn: { marginTop: 16, alignItems: 'center' },
  linkText: { fontSize: 14 },
  guestBtn: { marginTop: 20, alignItems: 'center' },
  guestText: { fontSize: 14 },
  screen: { flex: 1 },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  logoutText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  darkModeBtn: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 12 },
  darkModeIcon: { fontSize: 24, marginRight: 12 },
  darkModeText: { fontSize: 16, fontWeight: '600' },
  statsContainer: { padding: 16, marginTop: -20 },
  statCard: { borderRadius: 12, padding: 20, alignItems: 'center', elevation: 3 },
  statNum: { fontSize: 32, fontWeight: 'bold' },
  statLabel: { fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '600', margin: 16, marginTop: 8 },
  menuCard: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16, elevation: 2 },
  menuIcon: { width: 52, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuCon: { marginLeft: 16, flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600' },
  menuDesc: { fontSize: 13 },
  backBtn: { padding: 12 },
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
