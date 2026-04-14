import React, { useState, useEffect } from 'react';
import { StatusBar, Platform, View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, SafeAreaView, AsyncStorage } from 'react-native';
import axios from 'axios';
 
const getApiBase = () => 'http://192.168.5.110:3000';
const API_BASE = getApiBase();

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

const STORAGE_KEYS = {
  USER: '@interview_master_user',
  WRONG: '@interview_master_wrong',
  FAVORITES: '@interview_master_favorites',
};

const saveData = async (key, data) => {
  try { await AsyncStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.error(e); }
};
const getData = async (key) => {
  try { const d = await AsyncStorage.getItem(key); return d ? JSON.parse(d) : null; } catch (e) { return null; }
};

export default function App() {
  const [screen, setScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkLogin(); }, []);
  const checkLogin = async () => {
    const u = await getData(STORAGE_KEYS.USER);
    if (u) { setUser(u); setScreen('home'); }
    setLoading(false);
  };
  const handleLogin = (u) => { setUser(u); setScreen('home'); };
  const handleLogout = async () => { await saveData(STORAGE_KEYS.USER, null); setUser(null); setScreen('login'); };

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={{ marginTop: 10 }}>加载中...</Text>
    </View>
  );

  const renderScreen = () => {
    switch(screen) {
      case 'login': return <LoginScreen onLogin={handleLogin} />;
      case 'home': return <HomeScreen user={user} onNavigate={setScreen} onLogout={handleLogout} />;
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
      {tabs.map(t => (
        <TouchableOpacity key={t.key} style={tabStyles.item} onPress={() => onChange(t.key)}>
          <Text style={[tabStyles.icon, current === t.key && tabStyles.active]}>{t.icon}</Text>
          <Text style={[tabStyles.label, current === t.key && tabStyles.activeL]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const tabStyles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: 8, paddingTop: 8 },
  item: { flex: 1, alignItems: 'center' },
  icon: { fontSize: 20, opacity: 0.5 },
  active: { opacity: 1 },
  label: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  activeL: { color: COLORS.primary, fontWeight: '600' },
});

// ==================== 登录 ====================
function LoginScreen({ onLogin }) {
  const [isReg, setIsReg] = useState(false);
  const [user, setUser] = useState('');
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleGuest = async () => {
    const gu = { id: 'guest', username: '游客', isGuest: true };
    await saveData(STORAGE_KEYS.USER, gu);
    onLogin(gu);
  };

  const handleSubmit = async () => {
    if (!user || !pwd) { setErr('请输入用户名和密码'); return; }
    if (pwd.length < 6) { setErr('密码至少6位'); return; }
    setLoading(true); setErr('');
    try {
      const url = isReg ? '/api/register' : '/api/login';
      const res = await axios.post(API_BASE + url, { username: user, password: pwd });
      if (res.data.token) {
        const ud = { id: res.data.userId, username: user, token: res.data.token, isGuest: false };
        await saveData(STORAGE_KEYS.USER, ud);
        onLogin(ud);
      }
    } catch (e) { setErr(e.response?.data?.error || '网络错误'); }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.loginBox, { marginTop: 10 }]}>
        <Text style={styles.title}>🎯 面试大师</Text>
        <Text style={styles.subtitle}>求职面试必备</Text>
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, !isReg && styles.tabActive]} onPress={() => { setIsReg(false); setErr(''); }}>
            <Text style={[styles.tabText, !isReg && styles.tabTextActive]}>登录</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, isReg && styles.tabActive]} onPress={() => { setIsReg(true); setErr(''); }}>
            <Text style={[styles.tabText, isReg && styles.tabTextActive]}>注册</Text>
          </TouchableOpacity>
        </View>
        <TextInput style={styles.input} placeholder="用户名" value={user} onChangeText={setUser} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="密码" value={pwd} onChangeText={setPwd} secureTextEntry />
        {err ? <Text style={styles.errText}>{err}</Text> : null}
        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{isReg ? '立即注册' : '立即登录'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkBtn} onPress={() => setIsReg(!isReg)}>
          <Text style={styles.linkText}>{isReg ? '已有账号？登录' : '没有账号？注册'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.guestBtn} onPress={handleGuest}>
          <Text style={styles.guestText}>游客模式直接进入</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ==================== 首页 ====================
function HomeScreen({ user, onNavigate, onLogout }) {
  const [stat, setStat] = useState({ questions: 0, articles: 0 });
  useEffect(() => { axios.get(API_BASE + '/api/crawler/status').then(r => setStat(r.data)).catch(() => {}); }, []);
  const MenuCard = ({ t, d, icon, color, on }) => (
    <TouchableOpacity style={styles.menuCard} onPress={on}>
      <View style={[styles.menuIcon, { backgroundColor: color }]}><Text style={{ fontSize: 24 }}>{icon}</Text></View>
      <View style={styles.menuContent}><Text style={styles.menuTitle}>{t}</Text><Text style={styles.menuDesc}>{d}</Text></View>
    </TouchableOpacity>
  );
  return (
    <ScrollView style={styles.screen}>
      <View style={styles.header}>
        <View><Text style={styles.headerTitle}>欢迎，{user?.username}</Text><Text style={styles.headerSub}>{user?.isGuest ? '游客模式' : '已登录'}</Text></View>
        <TouchableOpacity onPress={onLogout}><Text style={styles.logoutText}>退出</Text></TouchableOpacity>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statNum}>{stat.questions}</Text><Text style={styles.statLabel}>题库总量</Text></View>
        <View style={styles.statCard}><Text style={styles.statNum}>{stat.articles}</Text><Text style={styles.statLabel}>学习文章</Text></View>
      </View>
      <Text style={styles.sectionTitle}>核心功能</Text>
      <MenuCard t="知识学习" d="系统化学习面试知识点" icon="📚" color="#4CAF50" on={() => onNavigate('learn')} />
      <MenuCard t="智能刷题" d="AI出题 + 遗忘曲线复习" icon="✍️" color="#2196F3" on={() => onNavigate('practice')} />
      <MenuCard t="AI模拟面试" d="AI评分 + 薄弱点分析" icon="🤖" color="#9C27B0" on={() => onNavigate('interview')} />
      <MenuCard t="错题本" d="智能收录 · 针对性复习" icon="📝" color="#F44336" on={() => onNavigate('wrong')} />
    </ScrollView>
  );
}

// ==================== 知识学习 ====================
function LearnScreen({ onBack }) {
  const cats = ['Java基础', 'JVM', 'JUC', 'Redis', 'Kafka', '计算机网络', '操作系统', '数据库', '设计模式', '数据结构', 'AI', 'Agent'];
  return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}><Text style={styles.backText}>← 返回</Text></TouchableOpacity>
      <Text style={styles.screenTitle}>📚 知识学习</Text>
      <View style={styles.catGrid}>
        {cats.map((c, i) => <TouchableOpacity key={i} style={styles.catCard}><Text style={styles.catText}>{c}</Text></TouchableOpacity>)}
      </View>
    </SafeAreaView>
  );
}

// ==================== 刷题 ====================
function PracticeScreen({ onBack }) {
  const [mode, setMode] = useState('list');
  const [qs, setQs] = useState([]);
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState(null);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cat, setCat] = useState('all');
  const [count, setCount] = useState(50);
  const [fav, setFav] = useState(false);

  const cats = ['all', 'Java基础', 'JVM', 'JUC', 'Redis', 'Kafka', '计算机网络', '数据库', '设计模式', '数据结构', 'AI', 'Agent', '操作系统'];
  const counts = [20, 50, 100, 150, 200];

  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  const loadQs = async (c = 'all', n = count) => {
    setLoading(true);
    try {
      const url = c === 'all' ? `${API_BASE}/api/questions?limit=${n}` : `${API_BASE}/api/questions?category=${c}&limit=${n}`;
      const r = await axios.get(url);
      setQs(r.data.map(q => ({ ...q, options: shuffle([...q.options]) })));
      setIdx(0); setMode('practice');
      if (r.data.length > 0) {
        const fs = await getData(STORAGE_KEYS.FAVORITES) || [];
        setFav(fs.some(x => x.question_id === r.data[0].id));
      }
    } catch (e) { Alert.alert('错误', '加载失败'); }
    setLoading(false);
  };

  const handleAns = async (ans) => {
    if (show) return;
    setSel(ans); setShow(true);
    const q = qs[idx];
    if (ans !== q.answer) {
      const wl = await getData(STORAGE_KEYS.WRONG) || [];
      const ei = wl.findIndex(w => w.question_id === q.id);
      if (ei >= 0) wl[ei].wrong_count++; else wl.push({ question_id: q.id, category: q.category, question: q.question, options: JSON.stringify(q.options), answer: q.answer, wrong_count: 1 });
      await saveData(STORAGE_KEYS.WRONG, wl);
    }
  };

  const next = async () => {
    if (idx < qs.length - 1) {
      const ni = idx + 1;
      setIdx(ni); setSel(null); setShow(false);
      const fs = await getData(STORAGE_KEYS.FAVORITES) || [];
      setFav(fs.some(x => x.question_id === qs[ni].id));
    } else { setMode('list'); }
  };

  const toggleFav = async () => {
    const f = await getData(STORAGE_KEYS.FAVORITES) || [];
    const ei = f.findIndex(x => x.question_id === qs[idx].id);
    if (ei >= 0) { f.splice(ei, 1); setFav(false); } else { f.push({ question_id: qs[idx].id, category: qs[idx].category, question: qs[idx].question, options: JSON.stringify(qs[idx].options), answer: qs[idx].answer }); setFav(true); }
    await saveData(STORAGE_KEYS.FAVORITES, f);
  };

  if (mode === 'list') return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}><Text style={styles.backText}>← 返回</Text></TouchableOpacity>
      <Text style={styles.screenTitle}>✍️ 智能刷题</Text>
      <Text style={styles.label}>选择分类</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {cats.map((c, i) => <TouchableOpacity key={i} style={[styles.chip, cat === c && styles.chipAct]} onPress={() => setCat(c)}><Text style={[styles.chipText, cat === c && styles.chipTextAct]}>{c === 'all' ? '全部' : c}</Text></TouchableOpacity>)}
      </ScrollView>
      <Text style={styles.label}>题库数量</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {counts.map((c, i) => <TouchableOpacity key={i} style={[styles.chip, count === c && styles.chipAct]} onPress={() => setCount(c)}><Text style={[styles.chipText, count === c && styles.chipTextAct]}>{c}题</Text></TouchableOpacity>)}
      </ScrollView>
      <TouchableOpacity style={styles.startBtn} onPress={() => loadQs(cat, count)} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.startBtnText}>开始刷题 ({count}题)</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );

  const q = qs[idx];
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.progBar}><View style={[styles.progFill, { width: `${((idx + 1) / qs.length) * 100}%` }]} /></View>
      <Text style={styles.progText}>{idx + 1} / {qs.length}</Text>
      <ScrollView style={styles.qContainer}>
        <View style={styles.qHeader}><Text style={styles.qCat}>{q.category} · {q.difficulty}</Text><TouchableOpacity onPress={toggleFav}><Text style={{ fontSize: 24 }}>{fav ? '❤️' : '🤍'}</Text></TouchableOpacity></View>
        <Text style={styles.qText}>{q.question}</Text>
        {q.options.map((o, i) => {
          let bg = COLORS.card, bc = COLORS.border;
          if (show) { if (o === q.answer) { bg = '#E8F5E9'; bc = COLORS.success; } else if (o === sel) { bg = '#FFEBEE'; bc = COLORS.error; } } else if (o === sel) { bg = '#E3F2FD'; bc = COLORS.primary; }
          return <TouchableOpacity key={i} style={[styles.opt, { backgroundColor: bg, borderColor: bc }]} onPress={() => handleAns(o)} disabled={show}><Text style={styles.optText}>{o}</Text>{show && o === q.answer && <Text style={{ color: COLORS.success, fontSize: 18, fontWeight: 'bold' }}>✓</Text>}</TouchableOpacity>;
        })}
        {show && q.explanation && <View style={styles.exp}><Text style={styles.expTit}>📝 解析</Text><Text style={styles.expText}>{q.explanation}</Text></View>}
      </ScrollView>
      {show && <TouchableOpacity style={styles.nextBtn} onPress={next}><Text style={styles.nextBtnText}>{idx < qs.length - 1 ? '下一题 →' : '完成'}</Text></TouchableOpacity>}
    </SafeAreaView>
  );
}

// ==================== AI面试 ====================
function InterviewScreen({ onBack }) {
  const [mode, setMode] = useState('home');
  const [qs, setQs] = useState([]);
  const [ans, setAns] = useState({});
  const [ci, setCi] = useState(0);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    try { const r = await axios.get(API_BASE + '/api/questions?limit=5'); setQs(r.data.slice(0, 5)); setCi(0); setAns({}); setScores({}); setMode('interview'); } catch (e) { Alert.alert('错误', '获取失败'); }
    setLoading(false);
  };

  const submit = async () => {
    setLoading(true);
    try { const r = await axios.post(API_BASE + '/api/ai/score', { question: qs[ci].question, answer: ans[ci] || '' }); setScores({ ...scores, [ci]: r.data }); } catch (e) {}
    if (ci < qs.length - 1) setCi(ci + 1); else setMode('result');
    setLoading(false);
  };

  if (mode === 'home') return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}><Text style={styles.backText}>← 返回</Text></TouchableOpacity>
      <Text style={styles.screenTitle}>🤖 AI模拟面试</Text>
      <View style={styles.interviewCard}>
        <Text style={{ fontSize: 64 }}>🎯</Text>
        <Text style={styles.interviewTit}>开始模拟面试</Text>
        <Text style={styles.interviewDesc}>5道面试题 · AI评分</Text>
        <TouchableOpacity style={styles.btn} onPress={start} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>开始面试</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if (mode === 'interview') {
    const q = qs[ci];
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.progText}>第 {ci + 1} / {qs.length} 题</Text>
        <ScrollView style={styles.qContainer}>
          <Text style={styles.qCat}>{q.category}</Text>
          <Text style={styles.qText}>{q.question}</Text>
          <TextInput style={styles.ansInput} placeholder="请输入你的回答..." multiline value={ans[ci] || ''} onChangeText={t => setAns({ ...ans, [ci]: t })} />
          {scores[ci] && <View style={styles.scoreCard}><Text style={styles.scoreNum}>得分: {scores[ci].score}</Text><Text style={styles.feedback}>{scores[ci].feedback}</Text></View>}
        </ScrollView>
        <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{ci < qs.length - 1 ? '下一题' : '完成面试'}</Text>}
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const avg = Object.values(scores).reduce((a, b) => a + (b.score || 0), 0) / (Object.keys(scores).length || 1);
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.screenTitle}>📊 面试报告</Text>
      <View style={styles.resultCard}><Text style={styles.resultScore}>{Math.round(avg)}分</Text><Text style={styles.resultLabel}>综合得分</Text></View>
      <TouchableOpacity style={styles.btn} onPress={() => setMode('home')}><Text style={styles.btnText}>重新面试</Text></TouchableOpacity>
    </SafeAreaView>
  );
}

// ==================== 错题本 ====================
function WrongScreen({ onBack }) {
  const [wqs, setWqs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { setWqs(await getData(STORAGE_KEYS.WRONG) || []); setLoading(false); })(); }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}><Text style={styles.backText}>← 返回</Text></TouchableOpacity>
      <Text style={styles.screenTitle}>📝 错题本</Text>
      <ScrollView>
        {wqs.map((q, i) => (
          <View key={i} style={styles.wrongCard}>
            <View style={styles.wrongHeader}><Text style={styles.wrongCat}>{q.category}</Text><Text style={styles.wrongCount}>错误 {q.wrong_count} 次</Text></View>
            <Text style={styles.wrongQ}>{q.question}</Text>
            <Text style={styles.wrongA}>正确答案: {q.answer}</Text>
          </View>
        ))}
        {wqs.length === 0 && !loading && <Text style={styles.empty}>🎉 暂无错题！</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== 样式 ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1, backgroundColor: COLORS.background },
  loginBox: { width: '85%', backgroundColor: COLORS.card, borderRadius: 16, padding: 24, alignSelf: 'center', marginTop: 40 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: COLORS.primary },
  subtitle: { fontSize: 14, textAlign: 'center', color: COLORS.textSecondary, marginBottom: 20 },
  tabRow: { flexDirection: 'row', marginBottom: 20, borderRadius: 8, backgroundColor: COLORS.background, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  input: { backgroundColor: COLORS.background, borderRadius: 8, padding: 14, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: COLORS.border },
  errText: { color: COLORS.error, fontSize: 14, textAlign: 'center', marginBottom: 10 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkBtn: { marginTop: 16, alignItems: 'center' },
  linkText: { color: COLORS.primary, fontSize: 14 },
  guestBtn: { marginTop: 24, alignItems: 'center' },
  guestText: { color: COLORS.textSecondary, fontSize: 14 },
  header: { backgroundColor: COLORS.primary, padding: 20, paddingTop: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  logoutText: { color: '#fff', fontSize: 14, fontWeight: '600', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  statsRow: { flexDirection: 'row', padding: 16, marginTop: -30 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginHorizontal: 6, alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', margin: 16, marginTop: 8 },
  menuCard: { flexDirection: 'row', backgroundColor: COLORS.card, marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16, alignItems: 'center' },
  menuIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuContent: { marginLeft: 16, flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  menuDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  backBtn: { padding: 16, paddingTop: 48 },
  backText: { fontSize: 16, color: COLORS.primary },
  screenTitle: { fontSize: 22, fontWeight: 'bold', margin: 16 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  catCard: { width: '46%', backgroundColor: COLORS.card, borderRadius: 12, padding: 14, margin: '2%', alignItems: 'center' },
  catText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  label: { fontSize: 14, marginLeft: 16, marginTop: 16, color: COLORS.textSecondary },
  chipScroll: { paddingHorizontal: 12, marginVertical: 8 },
  chip: { backgroundColor: COLORS.card, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginHorizontal: 4, borderWidth: 1, borderColor: COLORS.border },
  chipAct: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 14, color: COLORS.text },
  chipTextActive: { color: '#fff' },
  startBtn: { backgroundColor: COLORS.primary, marginHorizontal: 16, marginTop: 24, padding: 16, borderRadius: 12, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  progBar: { height: 4, backgroundColor: COLORS.border },
  progFill: { height: '100%', backgroundColor: COLORS.primary },
  progText: { textAlign: 'center', padding: 8, color: COLORS.textSecondary },
  qContainer: { flex: 1, padding: 16 },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qCat: { fontSize: 12, color: COLORS.primary, marginBottom: 8 },
  qText: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 20, lineHeight: 26 },
  opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 2 },
  optText: { fontSize: 16, color: COLORS.text, flex: 1 },
  exp: { backgroundColor: '#FFF8E1', padding: 16, borderRadius: 12, marginTop: 16 },
  expTit: { fontSize: 14, fontWeight: '600', color: COLORS.warning, marginBottom: 8 },
  expText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  nextBtn: { backgroundColor: COLORS.primary, margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  interviewCard: { backgroundColor: COLORS.card, margin: 16, borderRadius: 16, padding: 32, alignItems: 'center' },
  interviewTit: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 16 },
  interviewDesc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
  ansInput: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, fontSize: 16, minHeight: 150, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  scoreCard: { backgroundColor: '#E8F5E9', padding: 16, borderRadius: 12, marginTop: 16 },
  scoreNum: { fontSize: 24, fontWeight: 'bold', color: COLORS.success },
  feedback: { fontSize: 14, color: COLORS.text, marginTop: 8 },
  resultCard: { backgroundColor: COLORS.card, margin: 16, borderRadius: 16, padding: 32, alignItems: 'center' },
  resultScore: { fontSize: 64, fontWeight: 'bold', color: COLORS.primary },
  resultLabel: { fontSize: 16, color: COLORS.textSecondary },
  wrongCard: { backgroundColor: COLORS.card, marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: COLORS.error },
  wrongHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  wrongCat: { fontSize: 12, color: COLORS.textSecondary },
  wrongCount: { fontSize: 12, color: COLORS.error, fontWeight: '600' },
  wrongQ: { fontSize: 15, color: COLORS.text, marginBottom: 8, lineHeight: 22 },
  wrongA: { fontSize: 14, color: COLORS.success },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, fontSize: 16 },
});
