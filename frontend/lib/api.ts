import axios from "axios";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const apiClient = axios.create({ baseURL: API_URL });

apiClient.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("neuronos_token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem("neuronos_token");
      toast.error("Session expired, please log in");
      if (typeof window !== "undefined") window.location.href = "/login";
    } else if (status === 429) {
      toast.error("Too many requests, slow down");
    } else if (status === 500) {
      toast.error("Something went wrong. Our AI might be napping 😅");
    } else if (!error.response) {
      toast.error("Can't reach the server. Is it running?");
    }
    return Promise.reject(error);
  }
);

export const api = {
  getEmails: (params?: Record<string, unknown>) =>
    apiClient.get("/gmail/emails", { params }).then((r) => r.data),
  getEmail: (id: string) =>
    apiClient.get(`/gmail/emails/${id}`).then((r) => r.data),
  syncEmails: () =>
    apiClient.post("/gmail/sync").then((r) => r.data),
  getTasks: (params?: Record<string, unknown>) =>
    apiClient.get("/tasks", { params }).then((r) => r.data),
  createTask: (data: Record<string, unknown>) =>
    apiClient.post("/tasks", data).then((r) => r.data),
  updateTask: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/tasks/${id}`, data).then((r) => r.data),
  deleteTask: (id: string) =>
    apiClient.delete(`/tasks/${id}`).then((r) => r.data),
  extractTasksFromEmail: (emailId: string) =>
    apiClient.post(`/tasks/extract-from-email/${emailId}`).then((r) => r.data),
  getDailyDigest: () =>
    apiClient.get("/ai/daily-digest").then((r) => r.data),
  runCommand: (query: string) =>
    apiClient.post("/ai/command", { query }).then((r) => r.data),
  summarizeEmail: (emailId: string) =>
    apiClient.post(`/ai/summarize-email/${emailId}`).then((r) => r.data),
  search: (q: string) =>
    apiClient.get("/ai/search", { params: { q } }).then((r) => r.data),
  getGithubActivity: () =>
    apiClient.get("/github/activity").then((r) => r.data),
  getGithubStats: () =>
    apiClient.get("/github/stats").then((r) => r.data),
  getMe: () =>
    apiClient.get("/auth/me").then((r) => r.data),
  draftReply: (emailId: string, userContext?: string) =>
    apiClient.post(`/gmail/draft-reply/${emailId}`, { user_context: userContext || "" }).then((r) => r.data),
  sendEmail: (to: string, subject: string, body: string) =>
    apiClient.post("/gmail/send", { to, subject, body }).then((r) => r.data),
};
