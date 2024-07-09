import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, Canceler } from 'axios';

class Http {
    private instance: AxiosInstance;
    private isRefreshing = false;
    private failedQueue: { resolve: (token: string) => void; reject: (error: any) => void; }[] = [];

    constructor(baseURL: string) {
        this.instance = axios.create({
            baseURL,
            timeout: 10000,
        });

        this.instance.interceptors.request.use(
            (config: AxiosRequestConfig) => {
                this.removePendingRequest(config);
                this.addPendingRequest(config);

                const token = localStorage.getItem('access_token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        this.instance.interceptors.response.use(
            (response: AxiosResponse) => {
                this.removePendingRequest(response.config);
                return response;
            },
            async (error) => {
                const originalRequest = error.config;
                if (error.response && error.response.status === 401 && !originalRequest._retry) {
                    if (this.isRefreshing) {
                        return new Promise((resolve, reject) => {
                            this.failedQueue.push({ resolve, reject });
                        }).then((token) => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            return axios(originalRequest);
                        }).catch((err) => {
                            return Promise.reject(err);
                        });
                    }

                    originalRequest._retry = true;
                    this.isRefreshing = true;

                    return new Promise((resolve, reject) => {
                        axios.post('/auth/refresh-token', {
                            token: localStorage.getItem('refresh_token'),
                        }).then(({ data }) => {
                            localStorage.setItem('access_token', data.access_token);
                            this.instance.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;
                            this.processQueue(null, data.access_token);
                            resolve(this.instance(originalRequest));
                        }).catch((err) => {
                            this.processQueue(err, null);
                            localStorage.removeItem('access_token');
                            localStorage.removeItem('refresh_token');
                            uni.reLaunch({
								url: '/pages/index/index'
							})
                            reject(err);
                        }).finally(() => {
                            this.isRefreshing = false;
                        });
                    });
                }

                this.removePendingRequest(originalRequest);
                return Promise.reject(error);
            }
        );
    }

    private pendingRequests = new Map<string, Canceler>();

    private generateRequestKey(config: AxiosRequestConfig) {
        const { method, url, params, data } = config;
        return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
    }

    private addPendingRequest(config: AxiosRequestConfig) {
        const requestKey = this.generateRequestKey(config);
        if (!this.pendingRequests.has(requestKey)) {
            config.cancelToken = config.cancelToken || new axios.CancelToken((cancel) => {
                this.pendingRequests.set(requestKey, cancel);
            });
        }
    }

    private removePendingRequest(config: AxiosRequestConfig) {
        const requestKey = this.generateRequestKey(config);
        if (this.pendingRequests.has(requestKey)) {
            const cancel = this.pendingRequests.get(requestKey);
            cancel && cancel();
            this.pendingRequests.delete(requestKey);
        }
    }

    private processQueue(error: any, token: string | null = null) {
        this.failedQueue.forEach(prom => {
            if (token) {
                prom.resolve(token);
            } else {
                prom.reject(error);
            }
        });

        this.failedQueue = [];
    }

    public get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.instance.get(url, config);
    }

    public post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.instance.post(url, data, config);
    }

    // 其他 HTTP 方法可以根据需要添加
}

const httpReqGroups = {
    default: new Http('https://family-client-api.zichudongfang.com/'),
    admin: new Http('https://admin-school-api.zichudongfang.com/admin'),
};

export default httpReqGroups;
