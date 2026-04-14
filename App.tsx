import React, { useState, useEffect } from 'react';
import { StatusBar, View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, AsyncStorage, Dimensions, Platform } from 'react-native';
import axios from 'axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// API地址 - 支持双栈
const API_BASE_V4 = 'http://100.106.29.60:3000';
const API_BASE_V6 = 'http://[fd7a:115c:a1e0::8a01:1dcc]:3000';
const TIMEOUT = 3000;
const TIMEOUT_SLOW = 8000;

const COLORS = { primary: '#2196F3', success: '#4CAF50', error: '#F44336', warning: '#FF9800', background: '#F5F5F5', card: '#FFFFFF', text: '#212121', textSecondary: '#757575', border: '#E0E0E0' };

const STORAGE_KEYS = { USER: '@im_user', WRONG: '@im_wrong', FAVORITES: '@im_favorites' };
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

// Toast引用
let toastRef = { show: () => {} };
const showToast = (msg, type = 'info') => {
  const bg = type === 'error' ? COLORS.error : type === 'success' ? COLORS.success : COLORS.primary;
  toastRef.show(msg, bg);
};

export default function App() {
  const [screen, setScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  const [toastBg, setToastBg] = useState(COLORS.primary);
  const [toastVis, setToastVis] = useState(false);

  toastRef = { show: (msg, bg) => { setToastMsg(msg); setToastBg(bg); setToastVis(true); setTimeout(() => setToastVis(false), 2500); } };

  useEffect(() => { (async () => { const u = await getData(STORAGE_KEYS.USER); if (u) { setUser(u); setScreen('home'); } setLoading(false); })(); }, []);

  const goTo = (newScreen) => setScreen(newScreen);
  const handleLogin = (u) => { setUser(u); setScreen('home'); };
  const handleLogout = async () => { await saveData(STORAGE_KEYS.USER, null); setUser(null); setScreen('login'); };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>加载中...</Text></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {toastVis && <View style={[styles.toast, { backgroundColor: toastBg }]}><Text style={styles.toastTxt}>{toastMsg}</Text></View>}
      {screen === 'login' ? <LoginScreen onLogin={handleLogin} /> :
       <HomeScreen user={user} onNavigate={goTo} onLogout={handleLogout} />}
      {screen !== 'login' && <BottomBar current={screen} onChange={goTo} />}
    </View>
  );
}

function BottomBar({ current, onChange }) {
  const tabs = [{ k: 'home', i: '🏠', l: '首页' }, { k: 'learn', i: '📚', l: '学习' }, { k: 'practice', i: '✍️', l: '刷题' }, { k: 'wrong', i: '📝', l: '错题' }, { k: 'fav', i: '❤️', l: '收藏' }];
  return <View style={tabStyles.bar}>{tabs.map(t => <TouchableOpacity key={t.k} style={tabStyles.item} onPress={() => onChange(t.k)}><Text style={[tabStyles.icon, current === t.k && tabStyles.active]}>{t.i}</Text><Text style={[tabStyles.label, current === t.k && tabStyles.activeLabel]}>{t.l}</Text></TouchableOpacity>)}</View>;
}
const tabStyles = StyleSheet.create({ bar: { flexDirection: 'row', backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: Platform.OS === 'ios' ? 20 : 8 }, item: { flex: 1, alignItems: 'center' }, icon: { fontSize: 20, opacity: 0.5 }, active: { opacity: 1 }, label: { fontSize: 10, color: COLORS.textSecondary }, activeLabel: { color: COLORS.primary, fontWeight: '600' } });

function LoadingView({ text = '加载中...' }) {
  return <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>{text}</Text></View>;
}

// ==================== 登录 ====================
function LoginScreen({ onLogin }) {
  const [isReg, setIsReg] = useState(false);
  const [user, setUser] = useState('');
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGuest = async () => { const gu = { id: 'guest', username: '游客', isGuest: true }; await saveData(STORAGE_KEYS.USER, gu); onLogin(gu); };
  const handleSubmit = async () => {
    if (!user.trim() || !pwd.trim()) { showToast('请输入用户名和密码', 'error'); return; }
    if (pwd.length < 6) { showToast('密码至少6位', 'error'); return; }
    setLoading(true);
    try {
      const url = isReg ? '/api/register' : '/api/login';
      const res = await apiPost(url, { username: user, password: pwd }, true);
      if (res.token) { const ud = { id: res.userId, username: user, token: res.token, isGuest: false }; await saveData(STORAGE_KEYS.USER, ud); onLogin(ud); showToast(isReg ? '注册成功' : '登录成功', 'success'); }
    } catch (e) { showToast(e.response?.data?.error || '网络超时', 'error'); }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.loginContainer}>
      <View style={styles.loginBox}>
        <Text style={styles.title}>🎯 面试大师</Text>
        <Text style={styles.subtitle}>{isReg ? '创建账号' : '登录学习'}</Text>
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, !isReg && styles.tabActive]} onPress={() => setIsReg(false)}><Text style={[styles.tabText, !isReg && styles.tabTextActive]}>登录</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tab, isReg && styles.tabActive]} onPress={() => setIsReg(true)}><Text style={[styles.tabText, isReg && styles.tabTextActive]}>注册</Text></TouchableOpacity>
        </View>
        <TextInput style={styles.input} placeholder="用户名" value={user} onChangeText={setUser} autoCapitalize="none" placeholderTextColor="#999" />
        <TextInput style={styles.input} placeholder="密码" value={pwd} onChangeText={setPwd} secureTextEntry placeholderTextColor="#999" />
        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{isReg ? '注册' : '登录'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkBtn} onPress={() => setIsReg(!isReg)}><Text style={styles.linkText}>{isReg ? '登录' : '注册'}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.guestBtn} onPress={handleGuest}><Text style={styles.guestText}>游客模式</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ==================== 首页 ====================
function HomeScreen({ user, onNavigate, onLogout }) {
  const [stat, setStat] = useState({ questions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { apiGet('/api/crawler/status', true).then(r => setStat(r.data || { questions: 0 })).catch(() => {}).finally(() => setLoading(false)); }, []);

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.header}>
        <View><Text style={styles.headerTitle}>欢迎，{user?.username}</Text><Text style={styles.headerSub}>{user?.isGuest ? '游客' : '已登录'}</Text></View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}><Text style={styles.logoutText}>退出</Text></TouchableOpacity>
      </View>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>{loading ? <ActivityIndicator color={COLORS.primary} /> : <><Text style={styles.statNum}>{stat.questions}</Text><Text style={styles.statLabel}>题库</Text></>}</View>
      </View>
      <Text style={styles.sectionTitle}>核心功能</Text>
      <MenuCard title="知识学习" desc="系统化学体系" icon="📚" color="#4CAF50" on={() => onNavigate('learn')} />
      <MenuCard title="智能刷题" desc="NAS+AI双模式" icon="✍️" color="#2196F3" on={() => onNavigate('practice')} />
      <MenuCard title="错题本" desc="查漏补缺" icon="📝" color="#F44336" on={() => onNavigate('wrong')} />
      <MenuCard title="收藏夹" desc="收藏题目" icon="❤️" color="#9C27B0" on={() => onNavigate('fav')} />
    </ScrollView>
  );
}

function MenuCard({ title, desc, icon, color, on }) {
  return <TouchableOpacity style={styles.menuCard} onPress={on}><View style={[styles.menuIcon, { backgroundColor: color }]}><Text style={{ fontSize: 28 }}>{icon}</Text></View><View style={styles.menuCon}><Text style={styles.menuTitle}>{title}</Text><Text style={styles.menuDesc}>{desc}</Text></View></TouchableOpacity>;
}

// ==================== 学习 ====================
function LearnScreen({ onBack }) {
  const [cats, setCats] = useState({});
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/categories', true).then(r => {
      const m = {};
      r.forEach(c => { m[c.name] = c.children || []; });
      setCats(m);
    }).catch(e => showToast('加载失败', 'error')).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingView text="加载分类..." />;
  if (!selectedCat) return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}><Text style={styles.backBtnText}>← 返回</Text></TouchableOpacity>
      <Text style={styles.screenTitle}>📚 知识学习</Text>
      <Text style={styles.desc}>选择分类开始学习</Text>
      <View style={styles.catGrid}>{Object.keys(cats).map((c, i) => <TouchableOpacity key={i} style={styles.catCard} onPress={() => setSelectedCat(c)}><Text style={styles.catText}>{c}</Text><Text style={styles.catSub}>{cats[c]?.length || 0}个</Text></TouchableOpacity>)}</View>
    </SafeAreaView>
  );
  if (!selectedSub) return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedCat(null)}><Text style={styles.backBtnText}>← 返回</Text></TouchableOpacity>
      <Text style={styles.screenTitle}>📚 {selectedCat}</Text>
      <View style={styles.catGrid}>{(cats[selectedCat] || []).map((s, i) => <TouchableOpacity key={i} style={styles.catCard} onPress={() => setSelectedSub(s)}><Text style={styles.catText}>{s}</Text></TouchableOpacity>)}</View>
    </SafeAreaView>
  );
  return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedSub(null)}><Text style={styles.backBtnText}>← 返回</Text></TouchableOpacity>
      <Text style={styles.screenTitle}>📖 {selectedCat} · {selectedSub}</Text>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <TouchableOpacity style={styles.articleCard}><Text style={styles.articleTitle}>📖 知识文章</Text><Text style={styles.articleDesc}>系统化学习该知识点</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.articleCard, { marginTop: 12, backgroundColor: '#E3F2FD' }]}><Text style={styles.articleTitle}>✍️ 对应题库</Text><Text style={styles.articleDesc}>学习后刷题巩固</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== 刷题 ====================
function PracticeScreen({ onBack }) {
  const [mode, setMode] = useState('select');
  const [qs, setQs] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cat, setCat] = useState('all');
  const [count, setCount] = useState(50);

  const cats = ['all', 'Java基础', 'JVM', 'JUC', 'Redis', 'Kafka', '计算机网络', '操作系统', '数据库', '设计模式', '数据结构', 'AI', 'Agent'];
  const counts = [20, 50, 100, 150, 200];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const url = cat === 'all' ? `/api/questions?limit=${count}` : `/api/questions?category=${encodeURIComponent(cat)}&limit=${count}`;
      const r = await apiGet(url, true);
      if (Array.isArray(r)) { setQs(r.map(q => ({ ...q, options: shuffle([...q.options]) }))); setIdx(0); setMode('practice'); showToast('加载成功', 'success'); }
      else { showToast('加载失败', 'error'); }
    } catch (e) { showToast('网络超时', 'error'); }
    setLoading(false);
  };

  const handleAnswer = async (ans) => {
    if (showResult) return;
    setSelected(ans); setShowResult(true);
    const q = qs[idx];
    if (ans !== q.answer) {
      const wrongList = await getData(STORAGE_KEYS.WRONG) || [];
      wrongList.push({ question_id: q.id, category: q.category, question: q.question, answer: q.answer, wrong_count: 1, answered_at: new Date().toISOString() });
      await saveData(STORAGE_KEYS.WRONG, wrongList);
    }
  };

  const next = () => { if (idx < qs.length - 1) { setIdx(idx + 1); setSelected(null); setShowResult(false); } else { showToast('完成！', 'success'); setMode('select'); } };

  if (mode === 'select') return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}><Text style={styles.backBtnText}>← 返回</Text></TouchableOpacity>
      <Text style={styles.screenTitle}>✍️ 智能刷题</Text>
      {loading ? <LoadingView /> : (
        <>
          <Text style={styles.label}>分类</Text>
          <ScrollView horizontal style={styles.chipScroll}>{cats.map(c => <TouchableOpacity key={c} style={[styles.chip, cat === c && styles.chipActive]} onPress={() => setCat(c)}><Text style={[styles.chipText, cat === c && styles.chipTextActive]}>{c === 'all' ? '全部' : c}</Text></TouchableOpacity>)}</ScrollView>
          <Text style={styles.label}>数量</Text>
          <ScrollView horizontal style={styles.chipScroll}>{counts.map(c => <TouchableOpacity key={c} style={[styles.chip, count === c && styles.chipActive]} onPress={() => setCount(c)}><Text style={[styles.chipText, count === c && styles.chipTextActive]}>{c}题</Text></TouchableOpacity>)}</ScrollView>
          <TouchableOpacity style={styles.startBtn} onPress={loadQuestions}><Text style={styles.startBtnText}>开始刷题 ({count}题)</Text></TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );

  const q = qs[idx];
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.progBar}><View style={[styles.progFill, { width: `${((idx + 1) / qs.length) * 100}%` }]} /></View>
      <Text style={styles.progTxt}>{idx + 1}/{qs.length}</Text>
      <ScrollView style={styles.qCon}>
        <View style={styles.qHeader}><Text style={styles.qCat}>{q.category}</Text></View>
        <Text style={styles.qTxt}>{q.question}</Text>
        {q.options.map((o, i) => {
          let bg = COLORS.card, bc = COLORS.border;
          if (showResult) { if (o === q.answer) { bg = '#E8F5E9'; bc = COLORS.success; } else if (o === selected) { bg = '#FFEBEE'; bc = COLORS.error; } }
          return <TouchableOpacity key={i} style={[styles.opt, { bg, bc }]} onPress={() => handleAnswer(o)} disabled={showResult}><Text style={styles.optTxt}>{o}</Text>{showResult && o === q.answer && '✓'}</TouchableOpacity>;
        })}
      </ScrollView>
      {showResult && <TouchableOpacity style={styles.nextBtn} onPress={next}><Text style={styles.nextBtnTxt}>{idx < qs.length - 1 ? '下一题' : '完成'}</Text></TouchableOpacity>}
    </SafeAreaView>
  );
}

// ==================== 错题 ====================
function WrongScreen({ onBack }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { setList(await getData(STORAGE_KEYS.WRONG) || []); setLoading(false); })(); }, []);
  if (loading) return <LoadingView />;
  return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}><Text style={styles.backBtnText}>← 返回</Text></TouchableOpacity>
      <Text style={styles.screenTitle}>📝 错题本</Text>
      <ScrollView>{list.length === 0 && <Text style={styles.empty}>🎉 暂无错题!</Text>}
      {list.map((q, i) => <View key={i} style={styles.wrongCard}><Text style={styles.wrongCat}>{q.category}</Text><Text style={styles.wrongQ}>{q.question}</Text><Text style={styles.wrongA}>答案: {q.answer}</Text></View>)}
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== 收藏 ====================
function FavScreen({ onBack }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { setList(await getData(STORAGE_KEYS.FAVORITES) || []); setLoading(false); })(); }, []);
  if (loading) return <LoadingView />;
  return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}><Text style={styles.backBtnText}>← 返回</Text></TouchableOpacity>
      <Text style={styles.screenTitle}>❤️ 收藏夹</Text>
      <ScrollView>{list.length === 0 && <Text style={styles.empty}>暂无收藏!</Text>}
      {list.map((q, i) => <View key={i} style={styles.favCard}><Text style={styles.favCat}>{q.category}</Text><Text style={styles.favQ}>{q.question}</Text><Text style={styles.favA}>答案: {q.answer}</Text></View>)}
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== 样式 ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: COLORS.textSecondary },
  toast: { position: 'absolute', bottom: '15%', left: 20, right: 20, padding: 14, borderRadius: 10, elevation: 10 },
  toastTxt: { color: '#fff', fontSize: 14, textAlign: 'center' },
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginBox: { width: SCREEN_WIDTH * 0.85, backgroundColor: COLORS.card, borderRadius: 20, padding: 24, elevation: 5 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: COLORS.primary },
  subtitle: { fontSize: 14, textAlign: 'center', color: COLORS.textSecondary, marginBottom: 24 },
  tabRow: { flexDirection: 'row', marginBottom: 20, backgroundColor: COLORS.background, borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: '#fff' },
  input: { backgroundColor: COLORS.background, borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: COLORS.border },
  btn: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  linkBtn: { marginTop: 16, alignItems: 'center' },
  linkText: { color: COLORS.primary, fontSize: 14 },
  guestBtn: { marginTop: 20, alignItems: 'center' },
  guestText: { color: COLORS.textSecondary, fontSize: 14 },
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 50, flexDirection: 'row', justifyContent: 'space-between' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  logoutText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  statsContainer: { padding: 16, marginTop: -20 },
  statCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 20, alignItems: 'center', elevation: 3 },
  statNum: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 14, color: COLORS.textSecondary },
  sectionTitle: { fontSize: 18, fontWeight: '600', margin: 16, marginTop: 8 },
  menuCard: { flexDirection: 'row', backgroundColor: COLORS.card, marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16, elevation: 2 },
  menuIcon: { width: 52, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuCon: { marginLeft: 16, flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600' },
  menuDesc: { fontSize: 13, color: COLORS.textSecondary },
  backBtn: { padding: 12, paddingTop: Platform.OS === 'android' ? 12 : 50 },
  backBtnText: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  screenTitle: { fontSize: 24, fontWeight: 'bold', margin: 16 },
  desc: { fontSize: 14, color: COLORS.textSecondary, marginHorizontal: 16, marginBottom: 16 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12 },
  catCard: { width: '46%', backgroundColor: COLORS.card, borderRadius: 12, padding: 16, margin: '2%', alignItems: 'center', elevation: 2 },
  catText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  catSub: { fontSize: 12, color: COLORS.textSecondary },
  label: { fontSize: 14, marginLeft: 16, marginTop: 12, color: COLORS.textSecondary },
  chipScroll: { paddingHorizontal: 12, marginVertical: 8 },
  chip: { backgroundColor: COLORS.card, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginHorizontal: 4, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 14 },
  chipTextActive: { color: '#fff' },
  startBtn: { backgroundColor: COLORS.primary, margin: 16, padding: 16, borderRadius: 12, alignItems: 'center', elevation: 3 },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  progBar: { height: 4, backgroundColor: COLORS.border },
  progFill: { height: '100%', backgroundColor: COLORS.primary },
  progTxt: { textAlign: 'center', padding: 8, color: COLORS.textSecondary },
  qCon: { flex: 1, padding: 16 },
  qHeader: { marginBottom: 12 },
  qCat: { fontSize: 13, color: COLORS.primary },
  qTxt: { fontSize: 18, fontWeight: '600', marginBottom: 20, lineHeight: 26 },
  opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 2 },
  optTxt: { fontSize: 16, flex: 1 },
  nextBtn: { backgroundColor: COLORS.primary, margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 60, fontSize: 16 },
  wrongCard: { backgroundColor: COLORS.card, margin: 16, marginBottom: 12, borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: COLORS.error },
  wrongCat: { fontSize: 12, color: COLORS.textSecondary },
  wrongQ: { fontSize: 15, marginVertical: 8 },
  wrongA: { fontSize: 14, color: COLORS.success },
  favCard: { backgroundColor: COLORS.card, margin: 16, marginBottom: 12, borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: '#9C27B0' },
  favCat: { fontSize: 12, color: COLORS.textSecondary },
  favQ: { fontSize: 15, marginVertical: 8 },
  favA: { fontSize: 14, color: COLORS.success },
  articleCard: { backgroundColor: COLORS.card, padding: 20, borderRadius: 12, marginTop: 12 },
  articleTitle: { fontSize: 18, fontWeight: '600' },
  articleDesc: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8 },
});
