import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, CancelTokenSource } from 'axios';

// 创建 Axios 实例
const axiosInstance: AxiosInstance = axios.create({
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'platform': 'H5',
  },
});

let cancelTokenSource: CancelTokenSource | null = null;
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

// 请求拦截器
axiosInstance.interceptors.request.use(
  async (req: AxiosRequestConfig) => {
    const token = uni.getStorageSync("token");
    if (token) {
      req.headers['Authorization'] = token;
    }

    // req.headers['source'] = getPlatform();

    if (cancelTokenSource) {
      cancelTokenSource.cancel('取消重复请求');
    }
    cancelTokenSource = axios.CancelToken.source();
    req.cancelToken = cancelTokenSource.token;

    if (process.env.NODE_ENV === 'development') {
      console.group('Request Info');
      console.log('[URL]', `${req.baseURL}${req.url}`);
      console.log('[Method]', req.method);
      console.log('[Body]', req.data);
      console.groupEnd();
    }

    return req;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
axiosInstance.interceptors.response.use(
  async (res: AxiosResponse) => {
    const data = res.data;
    if (![0, 200].includes(data?.code)) {
      if (data?.code === -103 || data?.code === -101) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const newToken = await refreshToken();
            if (newToken) {
              uni.setStorageSync('token', newToken);
              onRrefreshed(newToken);
              return axiosInstance(res.config);
            } else {
              redirectToLogin();
              return Promise.reject(new Error('Token刷新失败'));
            }
          } catch (error) {
            redirectToLogin();
            return Promise.reject(error);
          } finally {
            isRefreshing = false;
          }
        } else {
          return new Promise((resolve) => {
            subscribeTokenRefresh((token: string) => {
              res.config.headers['Authorization'] = token;
              resolve(axiosInstance(res.config));
            });
          });
        }
      } else {
        return Promise.reject(data);
      }
    }
    return data;
  },
  (error) => Promise.reject(error)
);

// 定义 Token 刷新的方法
async function refreshToken(): Promise<string | null> {
  try {
    const response = await axiosInstance.post('/refresh_token');
    return response.data.token;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return null;
  }
}

function redirectToLogin() {
  uni.removeStorageSync('token');
  uni.reLaunch({ url: '/pages/login/login' });
}

function onRrefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

// HTTP 请求类
class Http {
  private instance: AxiosInstance;

  constructor(baseURL: string) {
    this.instance = axios.create({
      baseURL,
      timeout: axiosInstance.defaults.timeout,
      headers: axiosInstance.defaults.headers,
    });

    this.instance.interceptors.request.use(
      async (req: AxiosRequestConfig) => {
        const token = uni.getStorageSync("token");
        if (token) req.headers['Authorization'] = token;
        // req.headers['source'] = getPlatform();
        if (cancelTokenSource) cancelTokenSource.cancel('取消重复请求');
        cancelTokenSource = axios.CancelToken.source();
        req.cancelToken = cancelTokenSource.token;
        if (process.env.NODE_ENV === 'development') {
          console.group('Request Info');
          console.log('[URL]', `${req.baseURL}${req.url}`);
          console.log('[Method]', req.method);
          console.log('[Body]', req.data);
          console.groupEnd();
        }
        return req;
      },
      (error) => Promise.reject(error)
    );

    this.instance.interceptors.response.use(
      async (res: AxiosResponse) => {
        const data = res.data;
        if (![0, 200].includes(data?.code)) {
          if (data?.code === -103 || data?.code === -101) {
            if (!isRefreshing) {
              isRefreshing = true;
              try {
                const newToken = await refreshToken();
                if (newToken) {
                  uni.setStorageSync('token', newToken);
                  onRrefreshed(newToken);
                  return this.instance(res.config);
                } else {
                  redirectToLogin();
                  return Promise.reject(new Error('Token刷新失败'));
                }
              } catch (error) {
                redirectToLogin();
                return Promise.reject(error);
              } finally {
                isRefreshing = false;
              }
            } else {
              return new Promise((resolve) => {
                subscribeTokenRefresh((token: string) => {
                  res.config.headers['Authorization'] = token;
                  resolve(this.instance(res.config));
                });
              });
            }
          } else {
            return Promise.reject(data);
          }
        }
        return data;
      },
      (error) => Promise.reject(error)
    );
  }

  // 请求方法，带取消重复请求的处理
  request<T = any>(config: AxiosRequestConfig): Promise<T> {
    return new Promise((resolve, reject) => {
      this.instance.request<T>(config)
        .then((res: AxiosResponse<T>) => resolve(res.data))
        .catch((error) => reject(error));
    });
  }

  get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ method: 'get', url, params, ...config });
  }

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ method: 'post', url, data, ...config });
  }

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ method: 'put', url, data, ...config });
  }

  delete<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ method: 'delete', url, params, ...config });
  }
}

const httpReqGroups = {
  default: new Http('https://family-client-api.zichudongfang.com/'),
  admin: new Http('https://admin-school-api.zichudongfang.com/admin'),
};

export default httpReqGroups;
