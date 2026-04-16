import React, { useState, useEffect } from 'react';
import { StatusBar, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, AsyncStorage, Dimensions, Platform, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 简单颜色
const COLORS = {
  primary: '#2196F3',
  success: '#4CAF50',
  error: '#F44336',
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
};

// 存储键
const STORAGE_KEYS = { USER: '@im_user' };

// 保存用户
const saveUser = async (user) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (e) {
    console.log('Save error:', e);
  }
};

// 获取用户
const getUser = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.log('Get error:', e);
    return null;
  }
};

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState(null);

  // 初始化
  useEffect(() => {
    initApp();
  }, []);

  async function initApp() {
    try {
      console.log('Starting init...');
      const u = await getUser();
      console.log('Got user:', u);
      
      if (u && u.username) {
        setUser(u);
        setScreen('home');
      } else {
        setScreen('login');
      }
    } catch (e) {
      console.log('Init failed:', e);
      setScreen('login');
    }
  }

  // 加载中
  if (screen === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  // 登录
  if (screen === 'login') {
    return <LoginScreen onLogin={(u) => { setUser(u); setScreen('home'); }} />;
  }

  // 首页
  return <HomeScreen user={user} onLogout={() => { setUser(null); setScreen('login'); }} />;
}

// ==================== 登录 ====================
function LoginScreen({ onLogin }) {
  const [isReg, setIsReg] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleLogin() {
    if (!username || !password) {
      setMsg('请输入用户名和密码');
      return;
    }
    setLoading(true);
    setMsg('');

    try {
      // 直接本地创建游客账号
      const user = { id: '1', username: username, isGuest: false };
      await saveUser(user);
      onLogin(user);
    } catch (e) {
      setMsg('登录失败: ' + e.message);
    }
    setLoading(false);
  }

  async function handleGuest() {
    const user = { id: 'guest', username: '游客', isGuest: true };
    await saveUser(user);
    onLogin(user);
  }

  return (
    <SafeAreaView style={styles.loginContainer}>
      <ScrollView contentContainerStyle={styles.loginScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.loginBox}>
          <Text style={styles.title}>🎯 面试大师 🎯</Text>
          <Text style={styles.subtitle}>{isReg ? '创建账号' : '登录学习'}</Text>

          {/* Tab */}
          <View style={styles.tabRow}>
            <TouchableOpacity 
              style={[styles.tab, !isReg && styles.tabActive]} 
              onPress={() => setIsReg(false)}
            >
              <Text style={[styles.tabText, !isReg && styles.tabTextActive]}>登录</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, isReg && styles.tabActive]} 
              onPress={() => setIsReg(true)}
            >
              <Text style={[styles.tabText, isReg && styles.tabTextActive]}>注册</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="用户名"
            value={username}
            onChangeText={setUsername}
            placeholderTextColor={COLORS.textSecondary}
          />
          <TextInput
            style={styles.input}
            placeholder="密码"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={COLORS.textSecondary}
          />

          {msg ? <Text style={styles.msg}>{msg}</Text> : null}

          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{isReg ? '注册' : '登录'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={() => setIsReg(!isReg)}>
            <Text style={styles.linkText}>
              {isReg ? '已有账号？登录' : '没有账号？注册'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.guestBtn} onPress={handleGuest}>
            <Text style={styles.guestText}>游客模式</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== 首页 ====================
function HomeScreen({ user, onLogout }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>欢迎，{user?.username || '用户'}</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logoutText}>退出</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.welcome}>🎉 面试大师</Text>
        <Text style={styles.desc}>准备面试，首选神器</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📚 知识学习</Text>
          <Text style={styles.cardDesc}>系统化学体系</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>✍️ 智能刷题</Text>
          <Text style={styles.cardDesc}>NAS+AI双模式</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 错题本</Text>
          <Text style={styles.cardDesc}>查漏补缺</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>❤️ 收藏夹</Text>
          <Text style={styles.cardDesc}>收藏题目</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 模拟面试</Text>
          <Text style={styles.cardDesc}>AI真实面试</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== 样式 ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 16 },
  
  loginContainer: { flex: 1, backgroundColor: COLORS.background },
  loginScroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  loginBox: { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, elevation: 3 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: COLORS.primary },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20, color: COLORS.textSecondary },
  
  tabRow: { flexDirection: 'row', marginBottom: 20, backgroundColor: COLORS.background, borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: '#fff' },
  
  input: { backgroundColor: COLORS.background, borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text },
  msg: { color: COLORS.error, textAlign: 'center', marginBottom: 8 },
  
  btn: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, minHeight: 52, justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  
  linkBtn: { marginTop: 16, alignItems: 'center' },
  linkText: { color: COLORS.primary, fontSize: 14 },
  guestBtn: { marginTop: 16, alignItems: 'center' },
  guestText: { color: COLORS.textSecondary, fontSize: 14 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.primary, padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 50 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  logoutText: { color: '#fff', fontSize: 16 },
  
  content: { flex: 1, padding: 16 },
  welcome: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', marginTop: 20 },
  desc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 },
  
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  cardDesc: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
});