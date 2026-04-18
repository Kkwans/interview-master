// API工具 - 自动尝试IPv4和IPv6
const API_BASE_V4 = 'http://100.106.29.60:3000';
const API_BASE_V6 = 'http://[fd7a:115c:a1e0::8a01:1dcc]:3000';
const TIMEOUT = 3000;
const TIMEOUT_SLOW = 8000;

const apiGet = async (url, useSlow = false) => {
  const timeout = useSlow ? TIMEOUT_SLOW : TIMEOUT;
  try {
    return await axios.get(API_BASE_V4 + url, { timeout, timeoutErrorMessage: 'timeout' }).then(r => r.data);
  } catch (e) {
    if (e.message === 'timeout' || e.code === 'ECONNABORTED') {
      try {
        return await axios.get(API_BASE_V6 + url, { timeout, timeoutErrorMessage: 'timeout' }).then(r => r.data);
      } catch (e2) { throw e2; }
    }
    throw e;
  }
};

const apiPost = async (url, data, useSlow = false) => {
  const timeout = useSlow ? TIMEOUT_SLOW : TIMEOUT;
  try {
    return await axios.post(API_BASE_V4 + url, data, { timeout, timeoutErrorMessage: 'timeout' }).then(r => r.data);
  } catch (e) {
    if (e.message === 'timeout' || e.code === 'ECONNABORTED') {
      try {
        return await axios.post(API_BASE_V6 + url, data, { timeout, timeoutErrorMessage: 'timeout' }).then(r => r.data);
      } catch (e2) { throw e2; }
    }
    throw e;
  }
};

module.exports = { apiGet, apiPost };
