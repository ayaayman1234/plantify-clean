"use client";

import {useEffect, useMemo, useState} from "react";
import {AlertCircle, CheckCircle2, Code2, Info, Loader2, Settings2, ShieldCheck, Users, X} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";

import type {UserProfile, UserRole} from "@/lib/types";
import {
  clearStoredTokens,
  fetchProfile,
  fetchUsers,
  getStoredAccessToken,
  getStoredProfile,
  getStoredRole,
  logoutCurrentSession,
  storeUserRole,
  storeUserProfile,
  updateUserRole
} from "@/lib/api";
import {Button} from "@/components/ui/button";
import {DashboardShell} from "@/components/dashboard/dashboard-shell";
import {FarmerDashboard} from "@/components/farmer/farmer-dashboard";
import {type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {cn} from "@/lib/utils";
import {isNativeMobilePlatform} from "@/lib/platform";
import type {AppLocale} from "@/i18n/routing";

type NoticeKind = "error" | "success" | "info" | "warn";

type Notice = {
  id: number;
  kind: NoticeKind;
  message: string;
};

const ROLE_DASHBOARD_COPY: Record<
  AppLocale,
  {
    dismissNotification: string;
    reviewQueue: string;
    reviewQueueDescription: string;
    accuracySnapshot: string;
    accuracySnapshotDescription: string;
    notes: string;
    notesDescription: string;
    activeUsers: string;
    organizations: string;
    apiSuccess: string;
    supportSla: string;
    developerWorkspace: string;
    developerWorkspaceDescription: string;
    environmentHealth: string;
    environmentHealthDescription: string;
    signedInAccount: string;
    noSignedInUser: string;
    roleManagement: string;
    roleManagementDescription: string;
    userColumn: string;
    emailColumn: string;
    roleColumn: string;
    sessionMissing: string;
    sessionExpired: string;
    unableToLoadDashboard: string;
    loadingDashboard: string;
    roleUpdated: string;
    failedToUpdateRole: string;
    logoutRedirectWarning: string;
    goToLogin: string;
    defaultUser: string;
    navScan: string;
    navAnalyze: string;
    navAct: string;
    navOperationsOverview: string;
    navWorkspace: string;
    navEnvironment: string;
    navAccount: string;
  }
> = {
  en: {
    dismissNotification: "Dismiss notification",
    reviewQueue: "Review queue",
    reviewQueueDescription: "12 cases are waiting for expert validation. Median review time is 38 minutes.",
    accuracySnapshot: "Accuracy snapshot",
    accuracySnapshotDescription: "Current agreement with field outcomes: 96.2%.",
    notes: "Notes",
    notesDescription: "Focus this week: powdery mildew cluster in west region and false positive reductions on segmented samples.",
    activeUsers: "Active users",
    organizations: "Organizations",
    apiSuccess: "API success",
    supportSla: "Support SLA",
    developerWorkspace: "Developer Workspace",
    developerWorkspaceDescription: "Access integration diagnostics, API payload checks, and release verification tools.",
    environmentHealth: "Environment Health",
    environmentHealthDescription: "Status checks and deployment readiness for backend, model, and data services.",
    signedInAccount: "Signed-in account",
    noSignedInUser: "No signed-in user found.",
    roleManagement: "Role management",
    roleManagementDescription: "Admins and developers can update account access levels from this workspace.",
    userColumn: "User",
    emailColumn: "Email",
    roleColumn: "Role",
    sessionMissing: "Session missing. Redirecting to login...",
    sessionExpired: "Session expired. Redirecting to login...",
    unableToLoadDashboard: "Unable to load dashboard",
    loadingDashboard: "Loading dashboard...",
    roleUpdated: "Role updated to {role}.",
    failedToUpdateRole: "Failed to update role.",
    logoutRedirectWarning: "Could not terminate session cleanly. Redirecting anyway.",
    goToLogin: "Go to login",
    defaultUser: "User",
    navScan: "Scan",
    navAnalyze: "Analyze",
    navAct: "Act",
    navOperationsOverview: "Operations overview",
    navWorkspace: "Workspace",
    navEnvironment: "Environment",
    navAccount: "Account"
  },
  ar: {
    dismissNotification: "إغلاق الإشعار",
    reviewQueue: "قائمة المراجعة",
    reviewQueueDescription: "هناك 12 حالة تنتظر مراجعة الخبير. متوسط وقت المراجعة 38 دقيقة.",
    accuracySnapshot: "ملخص الدقة",
    accuracySnapshotDescription: "نسبة التطابق الحالية مع نتائج الحقل: 96.2٪.",
    notes: "ملاحظات",
    notesDescription: "التركيز هذا الأسبوع: انتشار البياض الدقيقي في المنطقة الغربية وتقليل الإيجابيات الكاذبة في العينات المجزأة.",
    activeUsers: "المستخدمون النشطون",
    organizations: "الجهات",
    apiSuccess: "نجاح الـ API",
    supportSla: "الالتزام بالدعم",
    developerWorkspace: "مساحة المطور",
    developerWorkspaceDescription: "الوصول إلى تشخيصات التكامل وفحص طلبات الـ API وأدوات التحقق قبل الإصدار.",
    environmentHealth: "سلامة البيئة",
    environmentHealthDescription: "فحوصات الحالة وجاهزية النشر للباك والموديل وخدمات البيانات.",
    signedInAccount: "الحساب المسجل",
    noSignedInUser: "لا يوجد مستخدم مسجل حاليًا.",
    roleManagement: "إدارة الأدوار",
    roleManagementDescription: "يمكن للمشرفين والمطورين تعديل صلاحيات الحسابات من هذه المساحة.",
    userColumn: "المستخدم",
    emailColumn: "البريد الإلكتروني",
    roleColumn: "الدور",
    sessionMissing: "الجلسة غير موجودة. جارٍ التحويل إلى تسجيل الدخول...",
    sessionExpired: "انتهت الجلسة. جارٍ التحويل إلى تسجيل الدخول...",
    unableToLoadDashboard: "تعذر تحميل لوحة التحكم",
    loadingDashboard: "جارٍ تحميل لوحة التحكم...",
    roleUpdated: "تم تحديث الدور إلى {role}.",
    failedToUpdateRole: "فشل تحديث الدور.",
    logoutRedirectWarning: "تعذر إنهاء الجلسة بشكل نظيف. سيتم التحويل على أي حال.",
    goToLogin: "الذهاب إلى تسجيل الدخول",
    defaultUser: "مستخدم",
    navScan: "فحص",
    navAnalyze: "تحليل",
    navAct: "إجراء",
    navOperationsOverview: "نظرة تشغيلية",
    navWorkspace: "المساحة",
    navEnvironment: "البيئة",
    navAccount: "الحساب"
  },
  es: {
    dismissNotification: "Cerrar notificación",
    reviewQueue: "Cola de revisión",
    reviewQueueDescription: "12 casos esperan validación experta. El tiempo medio de revisión es de 38 minutos.",
    accuracySnapshot: "Resumen de precisión",
    accuracySnapshotDescription: "Coincidencia actual con los resultados de campo: 96.2%.",
    notes: "Notas",
    notesDescription: "Enfoque de esta semana: grupo de oídio en la región oeste y reducción de falsos positivos en muestras segmentadas.",
    activeUsers: "Usuarios activos",
    organizations: "Organizaciones",
    apiSuccess: "Éxito de API",
    supportSla: "SLA de soporte",
    developerWorkspace: "Espacio del desarrollador",
    developerWorkspaceDescription: "Accede a diagnósticos de integración, comprobaciones de cargas API y herramientas de verificación de lanzamientos.",
    environmentHealth: "Salud del entorno",
    environmentHealthDescription: "Comprobaciones de estado y preparación de despliegue para backend, modelo y servicios de datos.",
    signedInAccount: "Cuenta conectada",
    noSignedInUser: "No se encontró una cuenta conectada.",
    roleManagement: "Gestión de roles",
    roleManagementDescription: "Los administradores y desarrolladores pueden actualizar los niveles de acceso desde este espacio.",
    userColumn: "Usuario",
    emailColumn: "Correo",
    roleColumn: "Rol",
    sessionMissing: "Falta la sesión. Redirigiendo al inicio de sesión...",
    sessionExpired: "La sesión expiró. Redirigiendo al inicio de sesión...",
    unableToLoadDashboard: "No se pudo cargar el panel",
    loadingDashboard: "Cargando panel...",
    roleUpdated: "Rol actualizado a {role}.",
    failedToUpdateRole: "No se pudo actualizar el rol.",
    logoutRedirectWarning: "No se pudo cerrar la sesión limpiamente. Redirigiendo de todos modos.",
    goToLogin: "Ir al inicio de sesión",
    defaultUser: "Usuario",
    navScan: "Escanear",
    navAnalyze: "Analizar",
    navAct: "Actuar",
    navOperationsOverview: "Resumen operativo",
    navWorkspace: "Espacio",
    navEnvironment: "Entorno",
    navAccount: "Cuenta"
  },
  hi: {
    dismissNotification: "सूचना बंद करें",
    reviewQueue: "रिव्यू कतार",
    reviewQueueDescription: "12 मामले विशेषज्ञ सत्यापन की प्रतीक्षा कर रहे हैं। औसत समीक्षा समय 38 मिनट है।",
    accuracySnapshot: "सटीकता सारांश",
    accuracySnapshotDescription: "फील्ड परिणामों के साथ वर्तमान मिलान: 96.2%.",
    notes: "नोट्स",
    notesDescription: "इस सप्ताह का फोकस: पश्चिम क्षेत्र में पाउडरी मिल्ड्यू क्लस्टर और विभाजित नमूनों पर false positive में कमी।",
    activeUsers: "सक्रिय उपयोगकर्ता",
    organizations: "संगठन",
    apiSuccess: "API सफलता",
    supportSla: "सपोर्ट SLA",
    developerWorkspace: "डेवलपर वर्कस्पेस",
    developerWorkspaceDescription: "इंटीग्रेशन डायग्नोस्टिक्स, API payload checks और release verification tools तक पहुंचें।",
    environmentHealth: "एनवायरनमेंट हेल्थ",
    environmentHealthDescription: "बैकएंड, मॉडल और डेटा सेवाओं के लिए स्थिति जांच और डिप्लॉयमेंट तैयारी।",
    signedInAccount: "साइन-इन खाता",
    noSignedInUser: "कोई साइन-इन उपयोगकर्ता नहीं मिला।",
    roleManagement: "रोल प्रबंधन",
    roleManagementDescription: "एडमिन और डेवलपर इस वर्कस्पेस से अकाउंट एक्सेस स्तर अपडेट कर सकते हैं।",
    userColumn: "उपयोगकर्ता",
    emailColumn: "ईमेल",
    roleColumn: "भूमिका",
    sessionMissing: "सेशन नहीं मिला। लॉगिन पर भेजा जा रहा है...",
    sessionExpired: "सेशन समाप्त हो गया। लॉगिन पर भेजा जा रहा है...",
    unableToLoadDashboard: "डैशबोर्ड लोड नहीं हो सका",
    loadingDashboard: "डैशबोर्ड लोड हो रहा है...",
    roleUpdated: "भूमिका {role} में अपडेट की गई।",
    failedToUpdateRole: "भूमिका अपडेट नहीं हो सकी।",
    logoutRedirectWarning: "सेशन साफ़ तरीके से समाप्त नहीं हो सका। फिर भी रीडायरेक्ट किया जा रहा है।",
    goToLogin: "लॉगिन पर जाएं",
    defaultUser: "उपयोगकर्ता",
    navScan: "स्कैन",
    navAnalyze: "विश्लेषण",
    navAct: "कार्रवाई",
    navOperationsOverview: "ऑपरेशंस अवलोकन",
    navWorkspace: "वर्कस्पेस",
    navEnvironment: "एनवायरनमेंट",
    navAccount: "खाता"
  },
  zh: {
    dismissNotification: "关闭通知",
    reviewQueue: "审核队列",
    reviewQueueDescription: "有 12 个案例正在等待专家验证。平均审核时间为 38 分钟。",
    accuracySnapshot: "准确率概览",
    accuracySnapshotDescription: "当前与田间结果的一致率为 96.2%。",
    notes: "备注",
    notesDescription: "本周重点：西部地区白粉病聚集，以及降低分割样本中的误报。",
    activeUsers: "活跃用户",
    organizations: "组织数",
    apiSuccess: "API 成功率",
    supportSla: "支持 SLA",
    developerWorkspace: "开发者工作区",
    developerWorkspaceDescription: "访问集成诊断、API 载荷检查和发布验证工具。",
    environmentHealth: "环境健康",
    environmentHealthDescription: "后端、模型和数据服务的状态检查与部署准备情况。",
    signedInAccount: "当前登录账户",
    noSignedInUser: "未找到已登录用户。",
    roleManagement: "角色管理",
    roleManagementDescription: "管理员和开发者可以在此工作区更新账户访问级别。",
    userColumn: "用户",
    emailColumn: "邮箱",
    roleColumn: "角色",
    sessionMissing: "会话缺失。正在跳转到登录页...",
    sessionExpired: "会话已过期。正在跳转到登录页...",
    unableToLoadDashboard: "无法加载仪表板",
    loadingDashboard: "正在加载仪表板...",
    roleUpdated: "角色已更新为 {role}。",
    failedToUpdateRole: "角色更新失败。",
    logoutRedirectWarning: "无法完整结束会话，仍将继续跳转。",
    goToLogin: "前往登录",
    defaultUser: "用户",
    navScan: "扫描",
    navAnalyze: "分析",
    navAct: "处理",
    navOperationsOverview: "运营概览",
    navWorkspace: "工作区",
    navEnvironment: "环境",
    navAccount: "账户"
  }
};

function NotificationStack({
  notices,
  onDismiss,
  dismissLabel
}: {
  notices: Notice[];
  onDismiss: (id: number) => void;
  dismissLabel: string;
}) {
  if (notices.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[70] flex w-[min(90vw,24rem)] flex-col gap-2">
      {notices.map((notice) => {
        const tone =
          notice.kind === "error"
            ? "border-red-300/70 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
            : notice.kind === "success"
              ? "border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
              : notice.kind === "warn"
                ? "border-amber-300/70 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
                : "border-sky-300/70 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200";

        const Icon =
          notice.kind === "error"
            ? AlertCircle
            : notice.kind === "success"
              ? CheckCircle2
              : Info;

        return (
          <div key={notice.id} className={cn("rounded-xl border px-3 py-2 shadow-lg backdrop-blur", tone)}>
            <div className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm leading-5">{notice.message}</p>
              <button
                type="button"
                onClick={() => onDismiss(notice.id)}
                className="ml-auto rounded p-1 opacity-70 transition hover:opacity-100"
                aria-label={dismissLabel}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FarmerPanel() {
  return <FarmerDashboard />;
}

function ExpertPanel({copy}: {copy: (typeof ROLE_DASHBOARD_COPY)[AppLocale]}) {
  return (
    <section id="expert-review" data-dashboard-section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 md:grid-cols-3 scroll-mt-6">
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 md:col-span-2">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{copy.reviewQueue}</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{copy.reviewQueueDescription}</p>
      </article>
      <article id="expert-accuracy" data-dashboard-section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 scroll-mt-6">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{copy.accuracySnapshot}</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{copy.accuracySnapshotDescription}</p>
      </article>
      <article id="expert-notes" data-dashboard-section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 md:col-span-3 scroll-mt-6">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{copy.notes}</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{copy.notesDescription}</p>
      </article>
    </section>
  );
}

function AdminPanel({copy}: {copy: (typeof ROLE_DASHBOARD_COPY)[AppLocale]}) {
  return (
    <section id="admin-overview" data-dashboard-section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 md:grid-cols-4 scroll-mt-6">
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">{copy.activeUsers}</p>
        <p className="mt-3 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">1,284</p>
      </article>
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">{copy.organizations}</p>
        <p className="mt-3 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">37</p>
      </article>
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">{copy.apiSuccess}</p>
        <p className="mt-3 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">99.97%</p>
      </article>
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">{copy.supportSla}</p>
        <p className="mt-3 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">94%</p>
      </article>
    </section>
  );
}

function DeveloperPanel({user, copy}: {user: UserProfile | null; copy: (typeof ROLE_DASHBOARD_COPY)[AppLocale]}) {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 md:grid-cols-3">
      <article id="developer-workspace" data-dashboard-section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 scroll-mt-6">
        <div className="mb-3 inline-flex rounded-lg border border-zinc-300 p-2 dark:border-zinc-700">
          <Code2 className="h-4 w-4" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{copy.developerWorkspace}</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{copy.developerWorkspaceDescription}</p>
      </article>
      <article id="developer-environment" data-dashboard-section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 scroll-mt-6">
        <div className="mb-3 inline-flex rounded-lg border border-zinc-300 p-2 dark:border-zinc-700">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{copy.environmentHealth}</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{copy.environmentHealthDescription}</p>
      </article>
      <article id="developer-account" data-dashboard-section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 scroll-mt-6">
        <div className="mb-3 inline-flex rounded-lg border border-zinc-300 p-2 dark:border-zinc-700">
          <Users className="h-4 w-4" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{copy.signedInAccount}</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{user?.email ?? copy.noSignedInUser}</p>
      </article>
    </section>
  );
}

function RoleManager({
  users,
  currentUser,
  onUpdate,
  copy
}: {
  users: UserProfile[];
  currentUser: UserProfile | null;
  onUpdate: (userId: string, role: UserRole) => Promise<void>;
  copy: (typeof ROLE_DASHBOARD_COPY)[AppLocale];
}) {
  return (
    <section id="role-management" data-dashboard-section className="mx-auto mb-6 w-full max-w-7xl px-4 scroll-mt-6">
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{copy.roleManagement}</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{copy.roleManagementDescription}</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="pb-2 font-medium text-zinc-500 dark:text-zinc-400">{copy.userColumn}</th>
                <th className="pb-2 font-medium text-zinc-500 dark:text-zinc-400">{copy.emailColumn}</th>
                <th className="pb-2 font-medium text-zinc-500 dark:text-zinc-400">{copy.roleColumn}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/80">
                  <td className="py-3 text-zinc-900 dark:text-zinc-100">{u.full_name}</td>
                  <td className="py-3 text-zinc-600 dark:text-zinc-300">{u.email}</td>
                  <td className="py-3">
                    <select
                      className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                      value={u.role}
                      onChange={(event) => void onUpdate(u.id, event.target.value as UserRole)}
                      disabled={currentUser?.id === u.id}
                    >
                      <option value="farmer">farmer</option>
                      <option value="expert">expert</option>
                      <option value="admin">admin</option>
                      <option value="developer">developer</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

export function RoleDashboard() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("dashboard");
  const copy = ROLE_DASHBOARD_COPY[locale] ?? ROLE_DASHBOARD_COPY.en;
  const rtl = locale === "ar";
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [redirecting, setRedirecting] = useState<boolean>(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBootLoader, setShowBootLoader] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [notices, setNotices] = useState<Notice[]>([]);

  const pushNotice = (kind: NoticeKind, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setNotices((prev) => [...prev, {id, kind, message}]);
    window.setTimeout(() => {
      setNotices((prev) => prev.filter((notice) => notice.id !== id));
    }, 5000);
  };

  const navItems = useMemo<DashboardNavItem[]>(() => {
    if (role === "farmer") {
      return [
        {id: "scan", label: copy.navScan, icon: "leaf"},
        {id: "analyze", label: copy.navAnalyze, icon: "activity"},
        {id: "act", label: copy.navAct, icon: "clipboard"},
        {id: "scan-history", label: t("history.title"), icon: "history", href: "/scan-history"}
      ];
    }

    if (role === "expert") {
      return [
        {id: "expert-review", label: copy.reviewQueue, icon: "clipboard"},
        {id: "expert-accuracy", label: copy.accuracySnapshot, icon: "shield"},
        {id: "expert-notes", label: copy.notes, icon: "message"}
      ];
    }

    if (role === "admin") {
      return [
        {id: "admin-overview", label: copy.navOperationsOverview, icon: "activity"},
        {id: "role-management", label: copy.roleManagement, icon: "users"}
      ];
    }

    if (role === "developer") {
      return [
        {id: "developer-workspace", label: copy.navWorkspace, icon: "flask"},
        {id: "developer-environment", label: copy.navEnvironment, icon: "shield"},
        {id: "developer-account", label: copy.navAccount, icon: "users"},
        {id: "role-management", label: copy.roleManagement, icon: "users"}
      ];
    }

    return [];
  }, [copy, role, t]);

  useEffect(() => {
    if (navItems.length > 0) {
      setActiveSection((current) => (navItems.some((item) => item.id === current) ? current : navItems[0].id));
    }
  }, [navItems]);

  useEffect(() => {
    if (navItems.length === 0) return;

    const sections = navItems
      .filter((item) => !item.href)
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => Boolean(node));

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveSection(visible.target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.2, 0.4, 0.6]
      }
    );

    for (const section of sections) {
      observer.observe(section);
    }

    return () => observer.disconnect();
  }, [navItems, role]);

  useEffect(() => {
    const cachedProfile = getStoredProfile();
    if (cachedProfile) {
      setUser(cachedProfile);
      setRole(cachedProfile.role);
      setLoading(false);
    }
    const cachedRole = getStoredRole();
    if (!cachedProfile && cachedRole) {
      setRole(cachedRole);
      setLoading(false);
    }
  }, [copy]);

  useEffect(() => {
    if (!loading || role !== null) {
      setShowBootLoader(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowBootLoader(true);
    }, isNativeMobilePlatform() ? 1800 : 450);

    return () => window.clearTimeout(timer);
  }, [loading, role]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const accessToken = getStoredAccessToken();
        setToken(accessToken);
        
        if (!accessToken) {
          if (!cancelled) {
            clearStoredTokens();
            setRedirecting(true);
            pushNotice("warn", copy.sessionMissing);
            // Use setTimeout to ensure redirect happens after render
            setTimeout(() => {
              if (!cancelled) {
                window.location.replace("/login");
              }
            }, 0);
          }
          return;
        }

        const profile = await fetchProfile(accessToken);
        if (cancelled) return;

        setUser(profile);
        setRole(profile.role);
        storeUserRole(profile.role);
        storeUserProfile(profile);

        if (profile.role === "admin" || profile.role === "developer") {
          const allUsers = await fetchUsers(accessToken);
          if (!cancelled) {
            setUsers(allUsers);
          }
        }

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : copy.unableToLoadDashboard;
          if (message.toLowerCase().includes("session expired") || message.toLowerCase().includes("unauthorized")) {
            clearStoredTokens();
            setRedirecting(true);
            pushNotice("warn", copy.sessionExpired);
            setTimeout(() => {
              if (!cancelled) {
                window.location.replace("/login");
              }
            }, 0);
            return;
          }
          setError(message);
          pushNotice("error", message);
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateRole = async (userId: string, nextRole: UserRole) => {
    if (!token) return;
    try {
      const updated = await updateUserRole({
        token,
        userId,
        payload: {role: nextRole}
      });

      setUsers((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));

      if (user?.id === updated.id) {
        setUser(updated);
        setRole(updated.role);
        storeUserRole(updated.role);
      }
      pushNotice("success", copy.roleUpdated.replace("{role}", updated.role));
    } catch (err) {
      pushNotice("error", err instanceof Error ? err.message : copy.failedToUpdateRole);
    }
  };

  // Redirect in progress — render nothing so no content flashes before navigation.
  if (redirecting) return null;

  // Only block on a loading spinner when we have no cached role to display yet.
  if (loading && role === null) {
    if (!showBootLoader) {
      return <main className="min-h-[100dvh] bg-[var(--bg-primary)]" />;
    }

    return (
      <main className="flex min-h-[100svh] items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-4 text-sm text-[var(--text-secondary)] shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />
          <span>{copy.loadingDashboard}</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <NotificationStack notices={notices} dismissLabel={copy.dismissNotification} onDismiss={(id) => setNotices((prev) => prev.filter((notice) => notice.id !== id))} />
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-sm text-[var(--text-secondary)]">
          <p>{error}</p>
          <Button
            type="button"
            className="mt-4"
            onClick={async () => {
              try {
                await logoutCurrentSession();
              } catch {
                pushNotice("warn", copy.logoutRedirectWarning);
              }
              window.location.href = "/login";
            }}
          >
            {copy.goToLogin}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <>
      <NotificationStack notices={notices} dismissLabel={copy.dismissNotification} onDismiss={(id) => setNotices((prev) => prev.filter((notice) => notice.id !== id))} />
      <DashboardShell
        navItems={navItems}
        activeSection={activeSection}
        onSectionNavigate={setActiveSection}
        topBarLead={
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)]">
              {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.full_name || user?.email || copy.defaultUser}</p>
              {role ? <p className="text-xs text-[var(--text-tertiary)]">{t(`sidebar.role.${role}`)}</p> : null}
            </div>
          </div>
        }
        contentClassName="overflow-y-auto pb-4"
      >
        {role === "expert" ? <ExpertPanel copy={copy} /> : null}
        {role === "admin" ? <AdminPanel copy={copy} /> : null}
        {role === "developer" ? <DeveloperPanel user={user} copy={copy} /> : null}
        {role === "farmer" ? <FarmerPanel /> : null}

        {role === "admin" || role === "developer" ? (
          <RoleManager users={users} currentUser={user} onUpdate={updateRole} copy={copy} />
        ) : null}
      </DashboardShell>
    </>
  );
}
