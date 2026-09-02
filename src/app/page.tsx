'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  getAll,
  create,
  update,
  remove,
  type DocRecord,
} from '@/lib/rtdb-helpers';
import {
  adminExists,
  setupAdmin,
  loginAdmin,
  readPersistedAdmin,
  clearPersistedAdmin,
  listAdmins,
  createSubAdmin,
  deleteAdmin,
  resetAdminPassword,
  ADMIN_ROLES,
  canAccessTab,
  roleLabel,
  roleDesc,
  type AdminRole,
} from '@/lib/admin-auth';
import { useLocationCascade } from '@/lib/use-location-cascade';
import { fetchDivisions, type Division } from '@/lib/client-data';
import { v4 as uuidv4 } from 'uuid';

/* ----------- Types ----------- */
type View =
  | 'home'
  | 'create'
  | 'post'
  | 'admin'
  | 'privacy'
  | 'contact'
  | 'faq'
  | 'dashboard';

interface OffenderInfo {
  type?: string | null;
  name?: string | null;
  description?: string | null;
  position?: string | null;
  group?: string | null;
}

interface Post {
  id: string;
  hashedId: string;
  title: string;
  content: string;
  category: string;
  division: string | null;
  district: string | null;
  upazila: string | null;
  union: string | null;
  location: string | null;
  amount: number | null;
  outcome: string | null;
  offender?: OffenderInfo | null;
  status: string;
  upvotes: number;
  viewCount: number;
  createdAt: string;
  updatedAt?: string;
  _count?: { comments: number };
}

interface Comment {
  id: string;
  postId: string;
  content: string;
  status: string;
  upvotes: number;
  createdAt: string;
  post?: { id: string; title: string; hashedId: string };
}

/* ----------- Constants ----------- */
const CATEGORIES = [
  'চাঁদাবাজি', 'ঘুষ', 'হয়রানি', 'দুর্নীতি',
  'সেবা বঞ্চনা', 'অনিয়ম', 'প্রতারণা', 'জনস্বাস্থ্য',
  'শিক্ষা', 'অবকাঠামো', 'প্রাকৃতিক দুর্যোগ', 'অন্যান্য',
];

const OUTCOMES = [
  { value: 'paid', label: 'পরিশোধিত', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'rejected_outcome', label: 'প্রত্যাখ্যাত', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'pending_outcome', label: 'দাবি মুলতুবি', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'পেন্ডিং', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  approved: { label: 'প্রকাশিত', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  rejected: { label: 'বাতিল', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

const CATEGORY_ICONS: Record<string, string> = {
  'চাঁদাবাজি': 'bi-exclamation-triangle-fill',
  'ঘুষ': 'bi-cash-stack',
  'হয়রানি': 'bi-shield-exclamation',
  'দুর্নীতি': 'bi-slash-circle-fill',
  'সেবা বঞ্চনা': 'bi-x-circle-fill',
  'অনিয়ম': 'bi-exclamation-diamond-fill',
  'প্রতারণা': 'bi-megaphone-fill',
  'জনস্বাস্থ্য': 'bi-heart-pulse-fill',
  'শিক্ষা': 'bi-mortarboard-fill',
  'অবকাঠামো': 'bi-building-fill',
  'প্রাকৃতিক দুর্যোগ': 'bi-cloud-lightning-fill',
  'অন্যান্য': 'bi-three-dots',
};

const OFFENDER_TYPES = [
  'চাঁদাবাজ',
  'ঘুষবাজ',
  'চোর',
  'ছিনতাইকারী',
  'দুর্নীতিবাজ',
  'হয়রানিকারী',
  'প্রতারক',
  'অন্যান্য',
];

const FAQS = [
  { q: 'গুঞ্জন কী?', a: 'গুঞ্জন হলো একটি বেনামী প্রকাশনা প্ল্যাটফর্ম যেখানে আপনি অ্যাকাউন্ট ছাড়াই চাঁদাবাজি, ঘুষ, দুর্নীতি, হয়রানি সহ সকল অনিয়মের রিপোর্ট করতে পারবেন। আপনার পরিচয় সম্পূর্ণ গোপন থাকবে।' },
  { q: 'আমি কি সত্যিই বেনামী থাকতে পারব?', a: 'হ্যাঁ। গুঞ্জনে কোনো অ্যাকাউন্ট, নাম, ইমেইল, ফোন নম্বর বা কাঁচা IP সংগ্রহ করা হয় না। আপনার রিপোর্ট শুধুমাত্র বিষয়বস্তু নিয়ে কাজ করে।' },
  { q: 'আমার রিপোর্ট তৎক্ষণাৎ প্রকাশ হবে?', a: 'না। প্রতিটি রিপোর্ট ও মন্তব্য অ্যাডমিন যাচাই-বাছাই করার পরেই ওয়েবসাইটে প্রকাশিত হয়। এটি ভুয়া বা আপত্তিকর কন্টেন্ট রোধ করতে সাহায্য করে।' },
  { q: 'কোন বিষয়গুলো নিয়ে রিপোর্ট করা যাবে?', a: 'চাঁদাবাজি, ঘুষ, হয়রানি, দুর্নীতি, সেবা বঞ্চনা, অনিয়ম, প্রতারণা, জনস্বাস্থ্য, শিক্ষা, অবকাঠামো, প্রাকৃতিক দুর্যোগ এবং অন্যান্য যেকোনো সামাজিক বিষয়ে রিপোর্ট করা যাবে।' },
  { q: 'আমি কি অন্যায়কারীর তথ্য দিতে পারব?', a: 'হ্যাঁ, রিপোর্ট ফর্মে একটি ঐচ্ছিক "অন্যায়কারীর তথ্য" সেকশন আছে। আপনি চাইলে চাঁদাবাজ, চোর, ছিনতাইকারী বা অন্য অন্যায়কারীর নাম, চেহারা, পেশা বা দলের তথ্য দিতে পারেন। তবে মনে রাখবেন — ভুল তথ্য দিলে বা কারো নামে মিথ্যা অভিযোগ করলে তা বাতিল করা হবে।' },
  { q: 'এটি কি আইনি পদক্ষেপের বিকল্প?', a: 'না। গুঞ্জন তথ্য সংগ্রহ ও প্যাটার্ন চিহ্নিতকরণের জন্য। আইনি পদক্ষেপের জন্য সংশ্লিষ্ট কর্তৃপক্ষের সাথে যোগাযোগ করুন।' },
  { q: 'কীভাবে অ্যাডমিন লগইন করব?', a: 'প্রথমবার অ্যাডমিন প্যানেলে প্রবেশ করলে সিস্টেম আপনাকে নিজের ইউজারনেম ও পাসওয়ার্ড দিয়ে সুপার অ্যাডমিন সেটআপ করতে বলবে। এটি একবারই করা যাবে। সুপার অ্যাডমিন পরে অন্যান্য রোল-ভিত্তিক ইউজার (পোস্ট মডারেটর, কমেন্ট মডারেটর ইত্যাদি) তৈরি করতে পারবেন।' },
  { q: 'অবস্থান নির্বাচন কীভাবে কাজ করে?', a: 'রিপোর্ট করার সময় বিভাগ, জেলা, উপজেলা, ইউনিয়ন পর্যায়ক্রমে নির্বাচন করতে হবে — প্রতিটি লিস্ট Unified Bangladesh Geo API (unifiedapi.pages.dev) থেকে লোড হয়। সর্বশেষে বিস্তারিত অবস্থান (অফিসের নাম, ওয়ার্ড ইত্যাদি) লিখতে হবে।' },
];

/* ----------- Helpers ----------- */
function formatDate(d: string) {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'এইমাত্র';
  if (mins < 60) return `${mins} মিনিট আগে`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ঘণ্টা আগে`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} দিন আগে`;
  return date.toLocaleDateString('bn-BD');
}

function formatAmount(n: number | null) {
  if (!n) return '';
  if (n >= 10000000) return `৳${(n / 10000000).toFixed(2)} কোটি`;
  if (n >= 100000) return `৳${(n / 100000).toFixed(2)} লাখ`;
  return `৳${n.toLocaleString('bn-BD')}`;
}

function shortHash(id: string) {
  return id ? id.slice(0, 8) : '';
}

function bnToEnDigits(s: string): string {
  return s.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
}

function toOffender(r: DocRecord): OffenderInfo | null {
  const o = r.offender as Record<string, unknown> | undefined;
  if (!o) return null;
  const hasAny = (o.type as string) || (o.name as string) || (o.description as string) || (o.position as string) || (o.group as string);
  if (!hasAny) return null;
  return {
    type: (o.type as string) || null,
    name: (o.name as string) || null,
    description: (o.description as string) || null,
    position: (o.position as string) || null,
    group: (o.group as string) || null,
  };
}

function toPost(r: DocRecord): Post {
  return {
    id: r.id,
    hashedId: (r.hashedId as string) || r.id,
    title: (r.title as string) || '',
    content: (r.content as string) || '',
    category: (r.category as string) || '',
    division: (r.division as string) || null,
    district: (r.district as string) || null,
    upazila: (r.upazila as string) || null,
    union: (r.union as string) || null,
    location: (r.location as string) || null,
    amount: typeof r.amount === 'number' ? r.amount : null,
    outcome: (r.outcome as string) || null,
    offender: toOffender(r),
    status: (r.status as string) || 'pending',
    upvotes: typeof r.upvotes === 'number' ? r.upvotes : 0,
    viewCount: typeof r.viewCount === 'number' ? r.viewCount : 0,
    createdAt: (r.createdAt as string) || new Date().toISOString(),
    updatedAt: (r.updatedAt as string) || undefined,
  };
}

function toComment(r: DocRecord): Comment {
  return {
    id: r.id,
    postId: (r.postId as string) || '',
    content: (r.content as string) || '',
    status: (r.status as string) || 'pending',
    upvotes: typeof r.upvotes === 'number' ? r.upvotes : 0,
    createdAt: (r.createdAt as string) || new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*                            MAIN APP                                  */
/* ═══════════════════════════════════════════════════════════════════════ */
export default function Home() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [view, setView] = useState<View>('home');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminRole, setAdminRole] = useState<AdminRole>('posts_moderator');

  useEffect(() => {
    const persisted = readPersistedAdmin();
    if (persisted) {
      setAdminToken(persisted.token);
      setAdminName(persisted.name);
      setAdminRole(persisted.role);
    }
  }, []);

  const navigateTo = (v: View) => {
    setView(v);
    setMobileMenu(false);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-primary text-primary-foreground text-center py-1.5 text-xs sm:text-sm px-4">
        <i className="bi bi-shield-lock-fill mr-1"></i>
        {'বেনামী প্রকাশনা · অ্যাকাউন্ট নেই · কুকিহীন অ্যানালিটিক্স · কাঁচা IP রাখা হয় না'}
      </div>

      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigateTo('home')} className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition">
            <span className="text-2xl">🔮</span>
            <span className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">গুঞ্জন</span>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            <NavBtn icon="bi-grid-fill" label="রিপোর্ট" onClick={() => navigateTo('home')} active={view === 'home'} />
            <NavBtn icon="bi-pen-fill" label="রিপোর্ট করুন" onClick={() => navigateTo('create')} active={view === 'create'} />
            <NavBtn icon="bi-bar-chart-fill" label="ড্যাশবোর্ড" onClick={() => navigateTo('dashboard')} active={view === 'dashboard'} />
            <NavBtn icon="bi-question-circle" label="FAQ" onClick={() => navigateTo('faq')} active={view === 'faq'} />
            <NavBtn icon="bi-shield-check" label="গোপনীয়তা" onClick={() => navigateTo('privacy')} active={view === 'privacy'} />
            <NavBtn icon="bi-envelope" label="যোগাযোগ" onClick={() => navigateTo('contact')} active={view === 'contact'} />
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => navigateTo('create')} className="hidden sm:flex bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition items-center gap-1.5">
              <i className="bi bi-plus-lg"></i> রিপোর্ট
            </button>
            <button onClick={() => navigateTo('admin')} className="p-2 rounded-lg hover:bg-accent transition" title="অ্যাডমিন">
              <i className="bi bi-gear-fill"></i>
            </button>
            {mounted && (
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg hover:bg-accent transition"
                title="থিম পরিবর্তন"
              >
                <i className={`bi ${resolvedTheme === 'dark' ? 'bi-sun-fill' : 'bi-moon-fill'}`}></i>
              </button>
            )}
            <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 rounded-lg hover:bg-accent transition">
              <i className={`bi ${mobileMenu ? 'bi-x-lg' : 'bi-list'}`}></i>
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="md:hidden border-t bg-card p-4 space-y-2">
            <MobileNavBtn icon="bi-grid-fill" label="রিপোর্ট" onClick={() => navigateTo('home')} />
            <MobileNavBtn icon="bi-pen-fill" label="রিপোর্ট করুন" onClick={() => navigateTo('create')} />
            <MobileNavBtn icon="bi-bar-chart-fill" label="ড্যাশবোর্ড" onClick={() => navigateTo('dashboard')} />
            <MobileNavBtn icon="bi-question-circle" label="FAQ" onClick={() => navigateTo('faq')} />
            <MobileNavBtn icon="bi-shield-check" label="গোপনীয়তা" onClick={() => navigateTo('privacy')} />
            <MobileNavBtn icon="bi-envelope" label="যোগাযোগ" onClick={() => navigateTo('contact')} />
            <MobileNavBtn icon="bi-gear-fill" label="অ্যাডমিন প্যানেল" onClick={() => navigateTo('admin')} />
          </div>
        )}
      </header>

      <main className="flex-1">
        {view === 'home' && <HomeView onNavigate={navigateTo} />}
        {view === 'create' && <CreateView onSuccess={() => navigateTo('home')} />}
        {view === 'post' && <PostDetail postId={''} onBack={() => navigateTo('home')} />}
        {view === 'admin' && (
          <AdminView
            token={adminToken}
            setToken={setAdminToken}
            setName={setAdminName}
            setRole={setAdminRole}
            name={adminName}
            role={adminRole}
          />
        )}
        {view === 'dashboard' && <DashboardView onNavigate={navigateTo} />}
        {view === 'privacy' && <PrivacyView />}
        {view === 'contact' && <ContactView />}
        {view === 'faq' && <FAQView />}
      </main>

      <footer className="mt-auto border-t bg-card/50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 font-bold text-lg mb-3">
                <span className="text-2xl">🔮</span>
                <span className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">গুঞ্জন</span>
              </div>
              <p className="text-sm text-muted-foreground">বেনামী প্রকাশনা প্ল্যাটফর্ম। অ্যাকাউন্ট ছাড়াই সত্য তুলে ধরুন। প্যাটার্ন উপেক্ষা করা কঠিন হয়ে ওঠে।</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">দ্রুত লিংক</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <button onClick={() => navigateTo('home')} className="block hover:text-foreground transition">রিপোর্ট সমূহ</button>
                <button onClick={() => navigateTo('create')} className="block hover:text-foreground transition">রিপোর্ট করুন</button>
                <button onClick={() => navigateTo('dashboard')} className="block hover:text-foreground transition">ড্যাশবোর্ড</button>
                <button onClick={() => navigateTo('faq')} className="block hover:text-foreground transition">সাধারণ জিজ্ঞাসা</button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">তথ্য</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <button onClick={() => navigateTo('privacy')} className="block hover:text-foreground transition">গোপনীয়তা নীতি</button>
                <button onClick={() => navigateTo('contact')} className="block hover:text-foreground transition">যোগাযোগ</button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">অনুসরণ করুন</h4>
              <div className="flex gap-3">
                <span className="p-2 rounded-lg bg-accent hover:bg-accent/80 cursor-pointer transition"><i className="bi bi-facebook"></i></span>
                <span className="p-2 rounded-lg bg-accent hover:bg-accent/80 cursor-pointer transition"><i className="bi bi-twitter-x"></i></span>
                <span className="p-2 rounded-lg bg-accent hover:bg-accent/80 cursor-pointer transition"><i className="bi bi-youtube"></i></span>
                <span className="p-2 rounded-lg bg-accent hover:bg-accent/80 cursor-pointer transition"><i className="bi bi-telegram"></i></span>
              </div>
              <p className="text-xs text-muted-foreground mt-4">প্রযুক্তি: Next.js · Tailwind CSS · Firebase · Unified Geo API</p>
            </div>
          </div>
          <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} গুঞ্জন (Gunjon) &mdash; সত্যের পক্ষে নীরব কণ্ঠস্বর। সর্বস্বত্ব সংরক্ষিত।
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ----------- Nav Components ----------- */
function NavBtn({ icon, label, onClick, active }: { icon: string; label: string; onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
        active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground hover:text-foreground'
      }`}
    >
      <i className={icon}></i> {label}
    </button>
  );
}

function MobileNavBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm hover:bg-accent transition w-full text-left">
      <i className={icon}></i> {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*                           HOME VIEW                                  */
/* ═══════════════════════════════════════════════════════════════════════ */
function HomeView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [division, setDivision] = useState('');
  const [outcome, setOutcome] = useState('');
  const [sort, setSort] = useState('latest');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [selectedPost, setSelectedPost] = useState<string | null>(null);

  const [divisionOptions, setDivisionOptions] = useState<Division[]>([]);
  useEffect(() => {
    fetchDivisions().then(setDivisionOptions).catch(() => setDivisionOptions([]));
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [postRecords, commentRecords] = await Promise.all([
        getAll('posts'),
        getAll('comments'),
      ]);
      const allComments = commentRecords.map(toComment);
      let list = postRecords.map(toPost).filter((p) => p.status === 'approved');

      if (category && category !== '_all') list = list.filter((p) => p.category === category);
      if (division && division !== '_all') list = list.filter((p) => p.division === division);
      if (outcome && outcome !== '_all') list = list.filter((p) => p.outcome === outcome);
      if (search) {
        const q = search.toLowerCase();
        list = list.filter((p) => p.title?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q));
      }

      if (sort === 'popular') list.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
      else if (sort === 'highest') list.sort((a, b) => (b.amount || 0) - (a.amount || 0));
      else list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      const limit = 8;
      const startIndex = (page - 1) * limit;
      const paginated = list.slice(startIndex, startIndex + limit);

      const withCounts = paginated.map((p) => {
        const cCount = allComments.filter((c) => c.postId === p.id && c.status === 'approved').length;
        return { ...p, _count: { comments: cCount } };
      });

      setPosts(withCounts);
    } catch (err: any) {
      setLoadError(err?.message || 'রিপোর্ট লোড করতে সমস্যা হয়েছে');
      setPosts([]);
    }
    setLoading(false);
  }, [page, sort, search, category, division, outcome]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const totalPages = Math.ceil(posts.length / 8) || 1;

  const handleUpvote = async (id: string) => {
    try {
      const current = posts.find((p) => p.id === id)?.upvotes || 0;
      await update('posts', id, { upvotes: current + 1 });
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, upvotes: current + 1 } : p)));
      toast.success('সমর্থন যোগ করা হয়েছে');
    } catch (err: any) {
      toast.error(err?.message || 'সমর্থন করতে সমস্যা হয়েছে');
    }
  };

  if (selectedPost) {
    return <PostDetail postId={selectedPost} onBack={() => setSelectedPost(null)} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <section className="text-center py-8 sm:py-12 mb-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
          কথা আছে, কিন্তু <mark className="bg-primary/20 text-primary rounded px-1">ভয়</mark> আছে?{' '}
          <span className="text-primary">এবার লিখে দিন গুঞ্জনে।</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
          পরিচয় গোপন রেখে চাঁদাবাজি, ঘুষ, দুর্নীতি, হয়রানি সহ সকল অনিয়মের রিপোর্ট করুন।
          প্যাটার্ন উপেক্ষা করা কঠিন হয়ে ওঠে।
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => onNavigate('create')} className="gap-2"><i className="bi bi-pen-fill"></i> রিপোর্ট করুন</Button>
          <Button variant="outline" onClick={() => onNavigate('dashboard')} className="gap-2"><i className="bi bi-bar-chart-fill"></i> ড্যাশবোর্ড</Button>
          <Button variant="outline" onClick={() => onNavigate('faq')} className="gap-2"><i className="bi bi-question-circle"></i> কীভাবে কাজ করে</Button>
        </div>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard icon="bi-file-earmark-text-fill" value={String(posts.length)} label="প্রদর্শিত রিপোর্ট" />
        <StatCard icon="bi-check-circle-fill" value="৮" label="বিভাগ" color="text-emerald-600" />
        <StatCard icon="bi-pin-map-fill" value="১২" label="বিষয়" color="text-amber-600" />
        <StatCard icon="bi-shield-lock-fill" value="১০০%" label="বেনামী" color="text-rose-600" />
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2 relative">
              <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"></i>
              <Input
                placeholder="খুঁজুন..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={(v) => { setCategory(v === '_all' ? '' : v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="সকল বিষয়" /></SelectTrigger>
              <SelectContent><SelectItem value="_all">সকল বিষয়</SelectItem>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={division} onValueChange={(v) => { setDivision(v === '_all' ? '' : v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="সকল বিভাগ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">সকল বিভাগ</SelectItem>
                {divisionOptions.map((d) => <SelectItem key={d.id} value={d.bn_name}>{d.bn_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={outcome} onValueChange={(v) => { setOutcome(v === '_all' ? '' : v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="ফলাফল" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">সকল</SelectItem>
                {OUTCOMES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">সর্বশেষ</SelectItem>
                <SelectItem value="popular">জনপ্রিয়</SelectItem>
                <SelectItem value="highest">সর্বোচ্চ পরিমাণ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-sm text-muted-foreground">মোট {posts.length}টি পাওয়া গেছে</p>
            <div className="flex gap-1">
              <button onClick={() => setViewMode('card')} className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-accent' : ''}`}><i className="bi bi-grid-3x3-gap-fill"></i></button>
              <button onClick={() => setViewMode('table')} className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-accent' : ''}`}><i className="bi bi-list-ul"></i></button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-6"><div className="space-y-3 animate-pulse"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-full" /><div className="h-3 bg-muted rounded w-1/2" /></div></CardContent></Card>
          ))}
        </div>
      ) : loadError ? (
        <Card className="text-center py-16">
          <i className="bi bi-exclamation-triangle-fill text-5xl text-destructive mb-4 block"></i>
          <h3 className="text-lg font-semibold mb-2">রিপোর্ট লোড করা যায়নি</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">{loadError}</p>
          <Button onClick={fetchPosts} variant="outline" className="gap-2"><i className="bi bi-arrow-clockwise"></i> আবার চেষ্টা করুন</Button>
        </Card>
      ) : posts.length === 0 ? (
        <Card className="text-center py-16">
          <i className="bi bi-inbox text-5xl text-muted-foreground mb-4 block"></i>
          <h3 className="text-lg font-semibold mb-2">কোনো রিপোর্ট পাওয়া যায়নি</h3>
          <p className="text-muted-foreground mb-4">প্রথম রিপোর্টটি করুন এবং পরিবর্তন আনুন!</p>
          <Button onClick={() => onNavigate('create')}><i className="bi bi-pen-fill mr-2"></i>রিপোর্ট করুন</Button>
        </Card>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onClick={() => setSelectedPost(post.id)} onUpvote={() => handleUpvote(post.id)} />
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">#</th>
                  <th className="text-left p-3 font-medium">শিরোনাম</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">বিভাগ</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">অবস্থান</th>
                  <th className="text-left p-3 font-medium">পরিমাণ</th>
                  <th className="text-left p-3 font-medium">সমর্থন</th>
                  <th className="text-left p-3 font-medium">তারিখ</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post, i) => (
                  <tr key={post.id} className="border-b hover:bg-accent/50 cursor-pointer transition" onClick={() => setSelectedPost(post.id)}>
                    <td className="p-3 text-muted-foreground">#{(page - 1) * 8 + i + 1}</td>
                    <td className="p-3 font-medium max-w-xs truncate">{post.title}</td>
                    <td className="p-3 hidden sm:table-cell"><Badge variant="secondary">{post.category}</Badge></td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell">{post.division || '—'}</td>
                    <td className="p-3 font-semibold">{formatAmount(post.amount)}</td>
                    <td className="p-3"><span className="text-primary"><i className="bi bi-hand-thumbs-up-fill"></i> {post.upvotes}</span></td>
                    <td className="p-3 text-muted-foreground text-xs">{formatDate(post.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><i className="bi bi-chevron-left"></i></Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><i className="bi bi-chevron-right"></i></Button>
        </div>
      )}

      <section className="mt-16 mb-8">
        <h2 className="text-2xl font-bold text-center mb-8">কীভাবে কাজ করে?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StepCard num="০১" icon="bi-incognito" title="বেনামী" desc="কোনো অ্যাকাউন্ট বা পরিচয় লাগবে না। শুধু আপনার অভিজ্ঞতাটি লিখুন।" />
          <StepCard num="০২" icon="bi-pencil-square" title="যাচাই করা হয়" desc="প্রতিটি রিপোর্ট অ্যাডমিন পর্যালোচনা করে যাচাই-বাছাই করে।" />
          <StepCard num="০৩" icon="bi-globe" title="প্রকাশিত হয়" desc="অনুমোদিত রিপোর্ট সবার জন্য দৃশ্যমান হয় এবং প্যাটার্ন তৈরি হয়।" />
        </div>
      </section>
    </div>
  );
}

/* ----------- Stat Card ----------- */
function StatCard({ icon, value, label, color }: { icon: string; value: string; label: string; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <i className={`${icon} text-2xl ${color || 'text-primary'} mb-2 block`}></i>
      <div className={`text-2xl font-bold ${color || 'text-foreground'}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}

function StepCard({ num, icon, title, desc }: { num: string; icon: string; title: string; desc: string }) {
  return (
    <Card className="p-6 text-center hover:shadow-md transition">
      <div className="text-3xl font-bold text-primary/30 mb-2">{num}</div>
      <i className={`${icon} text-4xl text-primary mb-3 block`}></i>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </Card>
  );
}

function PostCard({ post, onClick, onUpvote }: { post: Post; onClick: () => void; onUpvote: () => void }) {
  const outcomeInfo = OUTCOMES.find((o) => o.value === post.outcome);
  return (
    <Card className="hover:shadow-lg transition-all cursor-pointer group overflow-hidden" onClick={onClick}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1"><i className={CATEGORY_ICONS[post.category] || 'bi-tag-fill'}></i> {post.category}</Badge>
            {outcomeInfo && <span className={`text-xs px-2 py-0.5 rounded-full ${outcomeInfo.color}`}>{outcomeInfo.label}</span>}
            {post.offender?.type && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"><i className="bi bi-person-x-fill mr-0.5"></i>{post.offender.type}</span>}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">#{shortHash(post.hashedId)}</span>
        </div>
        <h3 className="font-semibold text-base sm:text-lg mb-2 group-hover:text-primary transition line-clamp-2">{post.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{post.content}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {post.division && <span><i className="bi bi-geo-alt-fill"></i> {post.division}</span>}
            {post.amount && <span className="font-semibold text-foreground">{formatAmount(post.amount)}</span>}
            <span><i className="bi bi-eye"></i> {post.viewCount}</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onUpvote(); }} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <i className="bi bi-hand-thumbs-up-fill"></i> {post.upvotes} সমর্থন
          </button>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
          <span><i className="bi bi-clock"></i> {formatDate(post.createdAt)}</span>
          {post._count && <span><i className="bi bi-chat-dots"></i> {post._count.comments} মন্তব্য</span>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*                          POST DETAIL VIEW                            */
/* ═══════════════════════════════════════════════════════════════════════ */
function PostDetail({ postId, onBack }: { postId: string; onBack: () => void }) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPost = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [postRecords, commentRecords] = await Promise.all([
        getAll('posts'),
        getAll('comments'),
      ]);
      const found = postRecords.map(toPost).find((p) => p.id === postId);
      if (!found) {
        setError('পোস্ট পাওয়া যায়নি');
        setLoading(false);
        return;
      }
      const newViewCount = (found.viewCount || 0) + 1;
      update('posts', postId, { viewCount: newViewCount }).catch(() => {});

      const approvedComms = commentRecords
        .map(toComment)
        .filter((c) => c.postId === postId && c.status === 'approved')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      setPost({ ...found, viewCount: newViewCount });
      setComments(approvedComms);
    } catch (err: any) {
      setError(err?.message || 'পোস্ট লোড করতে সমস্যা');
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => { fetchPost(); }, [fetchPost]);

  const handleUpvote = async () => {
    if (!post) return;
    try {
      const newCount = (post.upvotes || 0) + 1;
      await update('posts', post.id, { upvotes: newCount });
      setPost((prev) => (prev ? { ...prev, upvotes: newCount } : null));
      toast.success('সমর্থন যোগ করা হয়েছে');
    } catch (err: any) {
      toast.error(err?.message || 'সমর্থন করতে সমস্যা');
    }
  };

  const handleComment = async () => {
    if (!newComment.trim() || newComment.trim().length < 5) {
      toast.error('মন্তব্য কমপক্ষে ৫ অক্ষরের হতে হবে');
      return;
    }
    setSubmitting(true);
    try {
      await create('comments', {
        postId,
        content: newComment.trim(),
        status: 'pending',
        upvotes: 0,
        createdAt: new Date().toISOString(),
      });
      toast.success('আপনার মন্তব্য জমা হয়েছে। অ্যাডমিন অনুমোদনের পর প্রকাশিত হবে।');
      setNewComment('');
    } catch (err: any) {
      toast.error(err?.message || 'মন্তব্য জমা করতে সমস্যা');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8"><div className="animate-pulse space-y-4"><div className="h-6 bg-muted rounded w-3/4" /><div className="h-4 bg-muted rounded w-full" /><div className="h-4 bg-muted rounded w-2/3" /></div></div>;
  if (error || !post) return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-center">
      <i className="bi bi-exclamation-triangle-fill text-5xl text-destructive mb-4 block"></i>
      <p className="mb-4">{error || 'পোস্ট পাওয়া যায়নি'}</p>
      <Button onClick={onBack} variant="outline"><i className="bi bi-arrow-left mr-2"></i> ফিরে যান</Button>
    </div>
  );

  const outcomeInfo = OUTCOMES.find((o) => o.value === post.outcome);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition">
        <i className="bi bi-arrow-left"></i> ফিরে যান
      </button>

      <Card>
        <CardContent className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="secondary" className="gap-1"><i className={CATEGORY_ICONS[post.category] || 'bi-tag-fill'}></i> {post.category}</Badge>
            {outcomeInfo && <span className={`text-xs px-2 py-0.5 rounded-full ${outcomeInfo.color}`}>{outcomeInfo.label}</span>}
            <Badge variant="outline" className="text-xs"><i className="bi bi-hash"></i>{shortHash(post.hashedId)}</Badge>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold mb-4">{post.title}</h1>
          <blockquote className="border-l-4 border-primary pl-4 text-muted-foreground mb-6 leading-relaxed whitespace-pre-wrap">{post.content}</blockquote>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {post.division && <InfoItem icon="bi-geo-alt-fill" label="বিভাগ" value={post.division} />}
            {post.district && <InfoItem icon="bi-pin-map-fill" label="জেলা" value={post.district} />}
            {post.upazila && <InfoItem icon="bi-diagram-3-fill" label="উপজেলা" value={post.upazila} />}
            {post.amount && <InfoItem icon="bi-cash-stack" label="পরিমাণ" value={formatAmount(post.amount)} />}
          </div>

          {post.union && (
            <div className="mb-3 text-sm text-muted-foreground">
              <i className="bi bi-diagram-3 mr-1"></i> ইউনিয়ন: <span className="font-medium text-foreground">{post.union}</span>
            </div>
          )}

          {post.location && (
            <div className="mb-6 p-3 bg-muted/50 rounded-lg text-sm">
              <span className="font-semibold block text-muted-foreground mb-1">বিস্তারিত অবস্থান:</span>
              <p>{post.location}</p>
            </div>
          )}

          {post.offender && (post.offender.type || post.offender.name || post.offender.description || post.offender.position || post.offender.group) && (
            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <h3 className="font-semibold text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-2">
                <i className="bi bi-person-x-fill"></i> অন্যায়কারীর তথ্য
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {post.offender.type && <div><span className="text-muted-foreground">ধরন:</span> <span className="font-medium">{post.offender.type}</span></div>}
                {post.offender.name && <div><span className="text-muted-foreground">নাম/ডাকনাম:</span> <span className="font-medium">{post.offender.name}</span></div>}
                {post.offender.position && <div><span className="text-muted-foreground">পেশা/পদবি:</span> <span className="font-medium">{post.offender.position}</span></div>}
                {post.offender.group && <div><span className="text-muted-foreground">দল/চক্র:</span> <span className="font-medium">{post.offender.group}</span></div>}
                {post.offender.description && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block mb-1">চেহারা/বিবরণ:</span>
                    <p className="whitespace-pre-wrap">{post.offender.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 pt-4 border-t">
            <button onClick={handleUpvote} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition text-sm font-medium">
              <i className="bi bi-hand-thumbs-up-fill"></i> সমর্থন করুন ({post.upvotes})
            </button>
            <span className="text-sm text-muted-foreground"><i className="bi bi-clock"></i> {formatDate(post.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4"><i className="bi bi-chat-dots mr-2"></i>মন্তব্য ({comments.length})</h3>

        <Card className="mb-4">
          <CardContent className="p-4">
            <Textarea placeholder="আপনার মন্তব্য লিখুন (বেনামী)..." value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={3} className="mb-3" />
            <Button onClick={handleComment} disabled={submitting || !newComment.trim()} className="gap-2"><i className="bi bi-send-fill"></i> মন্তব্য জমা করুন</Button>
            <p className="text-xs text-muted-foreground mt-2"><i className="bi bi-info-circle"></i> আপনার মন্তব্য অ্যাডমিন অনুমোদনের পর প্রকাশিত হবে।</p>
          </CardContent>
        </Card>

        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8"><i className="bi bi-chat-square text-3xl block mb-2"></i>এখনো কোনো মন্তব্য নেই। প্রথম মন্তব্যটি করুন!</p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <Card key={c.id}><CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                  <i className="bi bi-person-fill-gear"></i>
                  <span className="font-mono">#{shortHash(c.id)}</span>
                  <span>&middot;</span>
                  <span>{formatDate(c.createdAt)}</span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center">
      <i className={`${icon} text-primary block mb-1`}></i>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold text-sm truncate">{value}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*                         CREATE POST VIEW                              */
/* ═══════════════════════════════════════════════════════════════════════ */
function CreateView({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [amount, setAmount] = useState('');
  const [outcome, setOutcome] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);

  // Offender info (all optional)
  const [showOffender, setShowOffender] = useState(false);
  const [offenderType, setOffenderType] = useState('');
  const [offenderName, setOffenderName] = useState('');
  const [offenderDesc, setOffenderDesc] = useState('');
  const [offenderPosition, setOffenderPosition] = useState('');
  const [offenderGroup, setOffenderGroup] = useState('');

  const loc = useLocationCascade();

  const handleSubmit = async () => {
    if (!title || !content || !category) { toast.error('শিরোনাম, বিবরণ এবং বিষয় আবশ্যক'); return; }
    if (title.length < 10) { toast.error('শিরোনাম কমপক্ষে ১০ অক্ষরের হতে হবে'); return; }
    if (content.length < 20) { toast.error('বিবরণ কমপক্ষে ২০ অক্ষরের হতে হবে'); return; }
    if (!loc.selection.divisionId || !loc.selection.districtId || !loc.selection.upazilaId) {
      toast.error('বিভাগ, জেলা ও উপজেলা নির্বাচন আবশ্যক');
      return;
    }
    if (!consent) { toast.error('অনুমতি দিতে হবে'); return; }

    setSubmitting(true);
    try {
      const amountRaw = bnToEnDigits(amount).replace(/[^\d.]/g, '');

      // Build offender object only if any field is filled.
      const hasOffender = offenderType || offenderName.trim() || offenderDesc.trim() || offenderPosition.trim() || offenderGroup.trim();
      const offender = hasOffender ? {
        type: offenderType || null,
        name: offenderName.trim() || null,
        description: offenderDesc.trim() || null,
        position: offenderPosition.trim() || null,
        group: offenderGroup.trim() || null,
      } : null;

      await create('posts', {
        title: title.trim(),
        content: content.trim(),
        category,
        division: loc.selection.divisionName || null,
        district: loc.selection.districtName || null,
        upazila: loc.selection.upazilaName || null,
        union: loc.selection.unionName || null,
        location: location ? location.trim() : null,
        amount: amountRaw ? parseFloat(amountRaw) : null,
        outcome: outcome || null,
        offender,
        status: 'pending',
        upvotes: 0,
        viewCount: 0,
        hashedId: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success('আপনার রিপোর্ট জমা হয়েছে। অ্যাডমিন যাচাই করার পর প্রকাশিত হবে।');
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'জমা করতে সমস্যা হয়েছে');
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-2"><i className="bi bi-pen-fill text-primary mr-2"></i>রিপোর্ট করুন</h1>
      <p className="text-muted-foreground mb-6">আপনার পরিচয় সম্পূর্ণ গোপন থাকবে। সত্য ও নিরপেক্ষ তথ্য দিন।</p>

      <Card>
        <CardContent className="p-5 sm:p-7 space-y-5">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
            <p className="font-medium text-destructive mb-1"><i className="bi bi-shield-x-fill mr-1"></i>যা সংগ্রহ করা হয় না:</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span><i className="bi bi-x-circle"></i> নাম</span>
              <span><i className="bi bi-x-circle"></i> ইমেইল</span>
              <span><i className="bi bi-x-circle"></i> ফোন</span>
              <span><i className="bi bi-x-circle"></i> কাঁচা IP</span>
              <span><i className="bi bi-x-circle"></i> ডিভাইস ID</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">বিষয় <span className="text-destructive">*</span></label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="বিষয় নির্বাচন করুন" /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}><i className={`${CATEGORY_ICONS[c]} mr-2`}></i>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">শিরোনাম <span className="text-destructive">*</span></label>
            <Input placeholder="সংক্ষেপে কী ঘটেছে (কমপক্ষে ১০ অক্ষর)" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">বিবরণ <span className="text-destructive">*</span></label>
            <Textarea placeholder="বিস্তারিত লিখুন — কোথায়, কখন, কীভাবে ঘটেছে (কমপক্ষে ২০ অক্ষর)..." value={content} onChange={(e) => setContent(e.target.value)} rows={5} />
          </div>

          {/* Location Hierarchy */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold"><i className="bi bi-geo-alt-fill text-primary mr-1"></i>অবস্থান নির্বাচন</h3>
              <a
                href="https://unifiedapi.pages.dev/"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground hover:text-primary transition"
                title="Unified Bangladesh Geo API থেকে লোড হচ্ছে"
              >
                <i className="bi bi-cloud-arrow-down"></i> Unified Geo API
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">বিভাগ <span className="text-destructive">*</span></label>
                <Select value={loc.selection.divisionId} onValueChange={(v) => { void loc.selectDivision(v); }} disabled={loc.loadingDivisions}>
                  <SelectTrigger><SelectValue placeholder={loc.loadingDivisions ? 'লোড হচ্ছে...' : 'বিভাগ নির্বাচন'} /></SelectTrigger>
                  <SelectContent>{loc.divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.bn_name} ({d.name})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">জেলা <span className="text-destructive">*</span></label>
                <Select value={loc.selection.districtId} onValueChange={(v) => { void loc.selectDistrict(v); }} disabled={!loc.selection.divisionId || loc.loadingDistricts}>
                  <SelectTrigger><SelectValue placeholder={!loc.selection.divisionId ? 'প্রথমে বিভাগ নির্বাচন করুন' : loc.loadingDistricts ? 'লোড হচ্ছে...' : 'জেলা নির্বাচন'} /></SelectTrigger>
                  <SelectContent>{loc.districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.bn_name} ({d.name})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">উপজেলা / থানা <span className="text-destructive">*</span></label>
                <Select value={loc.selection.upazilaId} onValueChange={(v) => { void loc.selectUpazila(v); }} disabled={!loc.selection.districtId || loc.loadingUpazilas}>
                  <SelectTrigger><SelectValue placeholder={!loc.selection.districtId ? 'প্রথমে জেলা নির্বাচন করুন' : loc.loadingUpazilas ? 'লোড হচ্ছে...' : 'উপজেলা নির্বাচন'} /></SelectTrigger>
                  <SelectContent>{loc.upazilas.map((u) => <SelectItem key={u.id} value={u.id}>{u.bn_name} ({u.name})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">ইউনিয়ন / এলাকা</label>
                <Select value={loc.selection.unionId} onValueChange={loc.selectUnion} disabled={!loc.selection.upazilaId || loc.loadingUnions}>
                  <SelectTrigger><SelectValue placeholder={!loc.selection.upazilaId ? 'প্রথমে উপজেলা নির্বাচন করুন' : loc.loadingUnions ? 'লোড হচ্ছে...' : 'ইউনিয়ন নির্বাচন (ঐচ্ছিক)'} /></SelectTrigger>
                  <SelectContent>{loc.unions.map((u) => <SelectItem key={u.id} value={u.id}>{u.bn_name} ({u.name})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">অবস্থান (বিস্তারিত)</label>
              <Input placeholder="অফিসের নাম, ওয়ার্ড বা সুনির্দিষ্ট স্থান (ব্যক্তিগত ঠিকানা নয়)" value={location} onChange={(e) => setLocation(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">
                <i className="bi bi-info-circle"></i> উপরের চারটি স্তর Unified Geo API থেকে লোড হয়। এখানে সুনির্দিষ্ট অবস্থান লিখুন।
              </p>
            </div>

            {loc.error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive flex items-center justify-between gap-2">
                <span><i className="bi bi-exclamation-triangle-fill mr-1"></i>{loc.error}</span>
                <button onClick={loc.clearError} className="text-xs hover:underline">বন্ধ করুন</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">দাবিকৃত অর্থ (৳)</label>
              <Input type="text" inputMode="numeric" placeholder="পরিমাণ (যেমন: ৫০০০)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">ফলাফল</label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v === '_all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="ফলাফল নির্বাচন" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">নির্বাচন করুন</SelectItem>
                  {OUTCOMES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Offender info section — collapsible, all optional */}
          <div className="border-t pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showOffender}
                onChange={(e) => setShowOffender(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="font-medium"><i className="bi bi-person-x-fill text-purple-600 mr-1"></i>অন্যায়কারীর তথ্য (ঐচ্ছিক)</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  চাঁদাবাজ, চোর, ছিনতাইকারী বা অন্য অন্যায়কারীর তথ্য যদি জানেন বা সংগ্রহ করতে পারেন, এখানে দিন। এটি সম্পূর্ণ ঐচ্ছিক।
                </span>
              </span>
            </label>

            {showOffender && (
              <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg space-y-3">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-2 text-xs text-amber-800 dark:text-amber-300">
                  <i className="bi bi-exclamation-triangle-fill mr-1"></i>
                  সতর্কতা: শুধুমাত্র নিশ্চিত তথ্য দিন। মিথ্যা অভিযোগ বা প্রতিহিংসামূলক কন্টেন্ট অ্যাডমিন বাতিল করবেন।
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">অন্যায়কারীর ধরন</label>
                  <Select value={offenderType} onValueChange={(v) => setOffenderType(v === '_all' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="ধরন নির্বাচন (ঐচ্ছিক)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">নির্বাচন করুন</SelectItem>
                      {OFFENDER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">নাম / ডাকনাম (যদি জানা থাকে)</label>
                  <Input placeholder="যেমন: রহিম মাস্তান, কালা বাদশা" value={offenderName} onChange={(e) => setOffenderName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">পেশা / পদবি (যদি জানা থাকে)</label>
                  <Input placeholder="যেমন: স্থানীয় নেতা, ট্রাক চালক, দোকানদার" value={offenderPosition} onChange={(e) => setOffenderPosition(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">দল / চক্রের নাম (যদি থাকে)</label>
                  <Input placeholder="যেমন: উত্তর পাড়া গ্যাং, রাস্তা ছেলে গ্রুপ" value={offenderGroup} onChange={(e) => setOffenderGroup(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">চেহারা / বয়স / অন্যান্য বিবরণ</label>
                  <Textarea
                    placeholder="বয়স, উচ্চতা, গায়ের রঙ, চুল, দাগমাস, পরিচিত অভ্যাস ইত্যাদি — যা শনাক্তকরণে সাহায্য করবে"
                    value={offenderDesc}
                    onChange={(e) => setOffenderDesc(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
              <span className="text-sm text-muted-foreground">
                আমি কারো ব্যক্তিগত নাম বা পরিচয় উল্লেখ করিনি বলে নিশ্চিত। আমি বুঝতে পারছি এটি একটি প্রকাশ্য, অযাচাইকৃত অভিযোগ এবং আমার জমাদান মডারেশনের পর প্রকাশিত হবে।
              </span>
            </label>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2" size="lg">
            {submitting ? <><i className="bi bi-hourglass-split animate-spin"></i> জমা হচ্ছে...</> : <><i className="bi bi-send-fill"></i> রিপোর্ট জমা করুন</>}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            <i className="bi bi-info-circle"></i> আপনার রিপোর্ট অ্যাডমিন যাচাই করার পর প্রকাশিত হবে।
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*                        PUBLIC DASHBOARD VIEW                         */
/* ═══════════════════════════════════════════════════════════════════════ */
function DashboardView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [stats, setStats] = useState<{
    totalPosts: number;
    totalAmount: number;
    totalUpvotes: number;
    totalViews: number;
    byCategory: { name: string; count: number }[];
    byDivision: { name: string; count: number }[];
    byOutcome: { name: string; count: number }[];
    byOffenderType: { name: string; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await getAll('posts');
      const posts = records.map(toPost);
      const approved = posts.filter((p) => p.status === 'approved');

      const totalPosts = approved.length;
      const totalAmount = approved.reduce((s, p) => s + (p.amount || 0), 0);
      const totalUpvotes = approved.reduce((s, p) => s + (p.upvotes || 0), 0);
      const totalViews = approved.reduce((s, p) => s + (p.viewCount || 0), 0);

      const catMap: Record<string, number> = {};
      const divMap: Record<string, number> = {};
      const outMap: Record<string, number> = {};
      const offMap: Record<string, number> = {};

      approved.forEach((p) => {
        if (p.category) catMap[p.category] = (catMap[p.category] || 0) + 1;
        if (p.division) divMap[p.division] = (divMap[p.division] || 0) + 1;
        if (p.outcome) outMap[p.outcome] = (outMap[p.outcome] || 0) + 1;
        if (p.offender?.type) offMap[p.offender.type] = (offMap[p.offender.type] || 0) + 1;
      });

      setStats({
        totalPosts,
        totalAmount,
        totalUpvotes,
        totalViews,
        byCategory: Object.entries(catMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        byDivision: Object.entries(divMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        byOutcome: Object.entries(outMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        byOffenderType: Object.entries(offMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      });
    } catch (err: any) {
      setError(err?.message || 'ডেটা লোড করা যায়নি');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/2" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted rounded" />)}
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-center">
      <Card className="py-16">
        <CardContent>
          <i className="bi bi-exclamation-triangle-fill text-5xl text-destructive mb-4 block"></i>
          <h3 className="text-lg font-semibold mb-2">ডেটা লোড করা যায়নি</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">{error}</p>
          <Button onClick={fetchStats} variant="outline" className="gap-2"><i className="bi bi-arrow-clockwise"></i> আবার চেষ্টা করুন</Button>
        </CardContent>
      </Card>
    </div>
  );

  if (!stats) return null;

  const maxCat = Math.max(...stats.byCategory.map((c) => c.count), 1);
  const maxDiv = Math.max(...stats.byDivision.map((d) => d.count), 1);
  const maxOff = Math.max(...stats.byOffenderType.map((o) => o.count), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">ট্রান্সপারেন্সি লেজার</h1>
        <p className="text-muted-foreground">প্রকাশিত রিপোর্টের তথ্য বিশ্লেষণ</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard icon="bi-file-earmark-check-fill" value={String(stats.totalPosts)} label="প্রকাশিত রিপোর্ট" />
        <StatCard icon="bi-cash-stack" value={formatAmount(stats.totalAmount)} label="মোট দাবিকৃত অর্থ" color="text-amber-600" />
        <StatCard icon="bi-hand-thumbs-up-fill" value={String(stats.totalUpvotes)} label="মোট সমর্থন" color="text-emerald-600" />
        <StatCard icon="bi-eye-fill" value={String(stats.totalViews)} label="মোট দেখা" color="text-rose-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-lg"><i className="bi bi-tag-fill text-primary mr-2"></i>বিষয় অনুযায়ী</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stats.byCategory.length === 0 && <p className="text-sm text-muted-foreground">তথ্য নেই</p>}
            {stats.byCategory.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-sm mb-1"><span>{item.name}</span><span className="font-semibold">{item.count}</span></div>
                <Progress value={(item.count / maxCat) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg"><i className="bi bi-geo-alt-fill text-primary mr-2"></i>বিভাগ অনুযায়ী</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stats.byDivision.length === 0 && <p className="text-sm text-muted-foreground">তথ্য নেই</p>}
            {stats.byDivision.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-sm mb-1"><span>{item.name}</span><span className="font-semibold">{item.count}</span></div>
                <Progress value={(item.count / maxDiv) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {stats.byOffenderType.length > 0 && (
        <Card className="mb-8">
          <CardHeader><CardTitle className="text-lg"><i className="bi bi-person-x-fill text-purple-600 mr-2"></i>অন্যায়কারীর ধরন অনুযায়ী</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stats.byOffenderType.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-sm mb-1"><span>{item.name}</span><span className="font-semibold">{item.count}</span></div>
                <Progress value={(item.count / maxOff) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {stats.byOutcome.length > 0 && (
        <Card className="mb-8">
          <CardHeader><CardTitle className="text-lg"><i className="bi bi-pie-chart-fill text-primary mr-2"></i>ফলাফল বিশ্লেষণ</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.byOutcome.map((item) => {
                const info = OUTCOMES.find((o) => o.value === item.name);
                return (
                  <div key={item.name} className={`rounded-lg p-4 text-center ${info?.color || ''}`}>
                    <div className="text-2xl font-bold">{item.count}</div>
                    <div className="text-sm mt-1">{info?.label || item.name}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-4"><i className="bi bi-info-circle"></i> এই তথ্য শুধুমাত্র প্রকাশিত রিপোর্টের উপর ভিত্তি করে। প্যাটার্ন বোঝার জন্য বিতরণ গুরুত্বপূর্ণ।</p>
        <Button onClick={() => onNavigate('create')} className="gap-2"><i className="bi bi-pen-fill"></i> রিপোর্ট করুন</Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*                          ADMIN VIEW & SETUP                          */
/* ═══════════════════════════════════════════════════════════════════════ */
function AdminView({
  token, setToken, setName, setRole, name, role,
}: {
  token: string;
  setToken: (t: string) => void;
  setName: (n: string) => void;
  setRole: (r: AdminRole) => void;
  name: string;
  role: AdminRole;
}) {
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [adminExistsState, setAdminExistsState] = useState<boolean | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const [setupUser, setSetupUser] = useState('');
  const [setupPass, setSetupPass] = useState('');
  const [setupName, setSetupName] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [tab, setTab] = useState<'posts' | 'comments' | 'stats' | 'users'>('posts');
  const [postStatus, setPostStatus] = useState('pending');
  const [commentStatus, setCommentStatus] = useState('pending');
  const [stats, setStats] = useState<any>(null);

  const checkAdminStatus = useCallback(async () => {
    setCheckingAdmin(true);
    setCheckError(null);
    try {
      const exists = await adminExists();
      setAdminExistsState(exists);
    } catch (err: any) {
      setAdminExistsState(false);
      setCheckError(err?.message || 'অ্যাডমিন অবস্থা যাচাই করা যায়নি');
    }
    setCheckingAdmin(false);
  }, []);

  useEffect(() => { checkAdminStatus(); }, [checkAdminStatus]);

  const handleSetupAdmin = async () => {
    if (!setupUser.trim() || !setupPass.trim() || !setupName.trim()) {
      toast.error('সকল তথ্য পূরণ করুন');
      return;
    }
    if (setupPass.length < 6) {
      toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }
    setSetupLoading(true);
    try {
      await setupAdmin({ username: setupUser, password: setupPass, name: setupName });
      toast.success('সুপার অ্যাডমিন সফলভাবে সেটআপ হয়েছে! এখন লগইন করুন।');
      setAdminExistsState(true);
      setUsername(setupUser.trim());
      setPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'সেটআপ করতে সমস্যা হয়েছে');
    }
    setSetupLoading(false);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error('ইউজারনেম এবং পাসওয়ার্ড দিন');
      return;
    }
    setLoginLoading(true);
    try {
      const result = await loginAdmin({ username, password });
      setToken(btoa(`${username}:${Date.now()}`));
      setName(result.name);
      setRole(result.role);
      toast.success(`লগইন সফল (${roleLabel(result.role)})`);
    } catch (err: any) {
      toast.error(err?.message || 'লগইন ব্যর্থ');
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    clearPersistedAdmin();
    setToken('');
    setName('');
    setRole('posts_moderator');
    toast.success('লগআউট হয়েছে');
  };

  const fetchStats = async () => {
    try {
      const [postRecords, commentRecords, contactRecords] = await Promise.all([
        getAll('posts'),
        getAll('comments'),
        getAll('contactMessages'),
      ]);
      const posts = postRecords.map(toPost);
      const comments = commentRecords.map((r) => ({ id: r.id, status: (r.status as string) || 'pending', createdAt: (r.createdAt as string) || '', postId: (r.postId as string) || '' }));
      const contacts = contactRecords.map((r) => ({ isRead: !!r.isRead }));

      const totalPosts = posts.length;
      const pendingPosts = posts.filter((p) => p.status === 'pending').length;
      const approvedPosts = posts.filter((p) => p.status === 'approved').length;
      const rejectedPosts = posts.filter((p) => p.status === 'rejected').length;

      const totalComments = comments.length;
      const pendingComments = comments.filter((c) => c.status === 'pending').length;

      let totalUpvotes = 0, totalViews = 0, totalAmount = 0;
      const categoryMap: Record<string, number> = {};
      posts.forEach((p) => {
        totalUpvotes += p.upvotes || 0;
        totalViews += p.viewCount || 0;
        if (p.status === 'approved') {
          if (p.amount) totalAmount += Number(p.amount) || 0;
          if (p.category) categoryMap[p.category] = (categoryMap[p.category] || 0) + 1;
        }
      });

      setStats({
        overview: {
          totalPosts, pendingPosts, approvedPosts, rejectedPosts,
          totalComments, pendingComments, totalUpvotes, totalViews, totalAmount,
          contactUnread: contacts.filter((c) => !c.isRead).length,
        },
        byCategory: Object.entries(categoryMap).map(([name, count]) => ({ name, count })),
      });
    } catch (err: any) {
      toast.error(err?.message || 'পরিসংখ্যান লোড করা যায়নি');
    }
  };

  useEffect(() => { if (token && tab === 'stats') fetchStats(); }, [token, tab]);

  if (checkingAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4 mx-auto" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (checkError && adminExistsState === null) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <Card>
          <CardContent className="p-6 text-center">
            <i className="bi bi-exclamation-triangle-fill text-4xl text-destructive block mb-2"></i>
            <h3 className="font-semibold mb-2">অ্যাডমিন অবস্থা যাচাই করা যায়নি</h3>
            <p className="text-xs text-muted-foreground mb-4">{checkError}</p>
            <Button onClick={checkAdminStatus} variant="outline" className="gap-2"><i className="bi bi-arrow-clockwise"></i> আবার চেষ্টা করুন</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (adminExistsState === false) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <Card>
          <CardHeader className="text-center">
            <i className="bi bi-shield-fill-exclamation text-4xl text-amber-500 block mb-2"></i>
            <CardTitle>প্রথমবার সুপার অ্যাডমিন সেটআপ</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              এই সেটআপ একবারই করা যাবে। সুপার অ্যাডমিন পরে অন্যান্য রোল-ভিত্তিক ইউজার তৈরি করতে পারবেন।
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1 block">পূর্ণ নাম</label>
              <Input placeholder="অ্যাডমিনের নাম" value={setupName} onChange={(e) => setSetupName(e.target.value)} autoComplete="name" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">ইউজারনেম</label>
              <Input placeholder="যেমন: admin" value={setupUser} onChange={(e) => setSetupUser(e.target.value)} autoComplete="username" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)</label>
              <Input type="password" placeholder="গোপন পাসওয়ার্ড" value={setupPass} onChange={(e) => setSetupPass(e.target.value)} autoComplete="new-password" onKeyDown={(e) => e.key === 'Enter' && handleSetupAdmin()} />
            </div>
            <Button onClick={handleSetupAdmin} disabled={setupLoading} className="w-full gap-2">
              {setupLoading ? <><i className="bi bi-hourglass-split animate-spin"></i> সংরক্ষণ হচ্ছে...</> : <><i className="bi bi-check-circle-fill"></i> সুপার অ্যাডমিন সেটআপ সম্পন্ন করুন</>}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              <i className="bi bi-info-circle"></i> এই সেটআপ সম্পন্ন হলে পরে আর কেউ নতুন সুপার অ্যাডমিন সেটআপ করতে পারবে না।
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <Card>
          <CardHeader className="text-center">
            <i className="bi bi-shield-lock-fill text-4xl text-primary block mb-2"></i>
            <CardTitle>অ্যাডমিন লগইন</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">আপনার সেটআপ করা ইউজারনেম ও পাসওয়ার্ড দিয়ে প্রবেশ করুন</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="ইউজারনেম" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            <Input type="password" placeholder="পাসওয়ার্ড" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} autoComplete="current-password" />
            <Button onClick={handleLogin} disabled={loginLoading} className="w-full gap-2">
              {loginLoading ? <><i className="bi bi-hourglass-split animate-spin"></i> লগইন হচ্ছে...</> : <><i className="bi bi-box-arrow-in-right"></i> লগইন</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter tabs based on role.
  const visibleTabs: Array<'posts' | 'comments' | 'stats' | 'users'> = (['posts', 'comments', 'stats', 'users'] as const).filter((t) => canAccessTab(role, t));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold"><i className="bi bi-gear-fill text-primary mr-2"></i>অ্যাডমিন প্যানেল</h1>
          <p className="text-sm text-muted-foreground">
            স্বাগতম, <span className="font-medium text-foreground">{name}</span>
            <Badge variant="outline" className="ml-2 text-xs">{roleLabel(role)}</Badge>
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="gap-2"><i className="bi bi-box-arrow-right"></i> লগআউট</Button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {visibleTabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${tab === t ? 'bg-primary text-primary-foreground' : 'bg-accent hover:bg-accent/80'}`}>
            <i className={`bi ${t === 'posts' ? 'bi-file-earmark-text' : t === 'comments' ? 'bi-chat-dots' : t === 'stats' ? 'bi-bar-chart' : 'bi-people-fill'}`}></i>
            {t === 'posts' ? ' পোস্ট ম্যানেজমেন্ট' : t === 'comments' ? ' মন্তব্য ম্যানেজমেন্ট' : t === 'stats' ? ' পরিসংখ্যান' : ' ইউজার ম্যানেজমেন্ট'}
          </button>
        ))}
      </div>

      {/* If user's current tab is not in visibleTabs (e.g. after role change), default to first visible. */}
      {!visibleTabs.includes(tab) && visibleTabs.length > 0 && (
        <p className="text-sm text-muted-foreground mb-4">আপনার রোলের জন্য এই ট্যাব অনুমোদিত নয়। অন্য ট্যাব নির্বাচন করুন।</p>
      )}

      {tab === 'posts' && canAccessTab(role, 'posts') && <AdminPosts status={postStatus} setStatus={setPostStatus} />}
      {tab === 'comments' && canAccessTab(role, 'comments') && <AdminComments status={commentStatus} setStatus={setCommentStatus} />}
      {tab === 'stats' && <AdminStats stats={stats} loading={!stats} onRetry={fetchStats} />}
      {tab === 'users' && canAccessTab(role, 'users') && <AdminUsers />}
    </div>
  );
}

/* -- Admin Posts (with full edit) -- */
function AdminPosts({ status, setStatus }: { status: string; setStatus: (s: string) => void }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [editing, setEditing] = useState<any | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [postRecords, commentRecords] = await Promise.all([
        getAll('posts'),
        getAll('comments'),
      ]);
      const allPosts = postRecords.map(toPost);
      const allComments = commentRecords.map(toComment);

      const pendingCount = allPosts.filter((p) => p.status === 'pending').length;
      const approvedCount = allPosts.filter((p) => p.status === 'approved').length;
      const rejectedCount = allPosts.filter((p) => p.status === 'rejected').length;
      setCounts({ pending: pendingCount, approved: approvedCount, rejected: rejectedCount });

      let filtered = allPosts;
      if (status !== 'all') {
        filtered = allPosts.filter((p) => p.status === status);
      }
      filtered = filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      const postsWithCounts = filtered.map((p) => {
        const cCount = allComments.filter((c) => c.postId === p.id).length;
        return { ...p, _count: { comments: cCount } };
      });

      setPosts(postsWithCounts);
    } catch (err: any) {
      setError(err?.message || 'পোস্ট লোড করা যায়নি');
      setPosts([]);
    }
    setLoading(false);
  }, [status]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const updatePost = async (id: string, newStatus: string) => {
    try {
      await update('posts', id, { status: newStatus, updatedAt: new Date().toISOString() });
      toast.success('অবস্থা আপডেট হয়েছে');
      fetchPosts();
    } catch (err: any) {
      toast.error(err?.message || 'আপডেট ব্যর্থ');
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই পোস্ট মুছে ফেলতে চান?')) return;
    try {
      const allComments = await getAll('comments');
      const postComments = allComments.filter((c) => c.postId === id);
      await Promise.all(postComments.map((c) => remove('comments', c.id)));
      await remove('posts', id);
      toast.success('মুছে ফেলা হয়েছে');
      fetchPosts();
    } catch (err: any) {
      toast.error(err?.message || 'মুছতে সমস্যা হয়েছে');
    }
  };

  if (loading) return <div className="space-y-3 animate-pulse"><div className="h-20 bg-muted rounded" /><div className="h-20 bg-muted rounded" /></div>;
  if (error) return (
    <Card><CardContent className="p-6 text-center">
      <i className="bi bi-exclamation-triangle-fill text-4xl text-destructive block mb-2"></i>
      <p className="text-sm text-muted-foreground mb-4">{error}</p>
      <Button onClick={fetchPosts} variant="outline" className="gap-2"><i className="bi bi-arrow-clockwise"></i> আবার চেষ্টা করুন</Button>
    </CardContent></Card>
  );

  if (editing) {
    return <EditPostDialog post={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); fetchPosts(); }} />;
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {['pending', 'approved', 'rejected', 'all'].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${status === s ? 'bg-primary text-primary-foreground' : 'bg-accent'}`}>
            {s === 'pending' ? `পেন্ডিং (${counts.pending})` : s === 'approved' ? `প্রকাশিত (${counts.approved})` : s === 'rejected' ? `বাতিল (${counts.rejected})` : 'সকল'}
          </button>
        ))}
      </div>

      {posts.length === 0 ? <p className="text-center text-muted-foreground py-8">কোনো পোস্ট নেই</p> : (
        <div className="space-y-3 max-h-[70vh] overflow-y-auto scrollbar-thin">
          {posts.map((p: any) => {
            const sInfo = STATUS_MAP[p.status] || STATUS_MAP.pending;
            const oInfo = OUTCOMES.find((o) => o.value === p.outcome);
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge className={sInfo.color}>{sInfo.label}</Badge>
                    <Badge variant="secondary">{p.category}</Badge>
                    {oInfo && <Badge variant="outline">{oInfo.label}</Badge>}
                    {p.offender?.type && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">{p.offender.type}</span>}
                    <span className="text-xs text-muted-foreground">#{shortHash(p.hashedId)}</span>
                    {p.updatedAt && <span className="text-xs text-muted-foreground"><i className="bi bi-pencil"></i> সম্পাদিত</span>}
                  </div>
                  <h3 className="font-semibold mb-1">{p.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{p.content}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                    {p.division && <span><i className="bi bi-geo-alt-fill"></i> {p.division}</span>}
                    {p.district && <span><i className="bi bi-pin-map"></i> {p.district}</span>}
                    {p.upazila && <span><i className="bi bi-diagram-3"></i> {p.upazila}</span>}
                    {p.union && <span><i className="bi bi-diagram-3-fill"></i> {p.union}</span>}
                    {p.amount && <span className="font-semibold text-foreground">{formatAmount(p.amount)}</span>}
                    <span><i className="bi bi-hand-thumbs-up"></i> {p.upvotes}</span>
                    <span><i className="bi bi-eye"></i> {p.viewCount}</span>
                    <span><i className="bi bi-chat-dots"></i> {p._count?.comments || 0}</span>
                    <span><i className="bi bi-clock"></i> {formatDate(p.createdAt)}</span>
                  </div>
                  {p.location && (
                    <div className="text-xs text-muted-foreground mb-2">
                      <i className="bi bi-geo-alt mr-1"></i> বিস্তারিত: <span className="text-foreground">{p.location}</span>
                    </div>
                  )}
                  {p.offender && (p.offender.type || p.offender.name || p.offender.description || p.offender.position || p.offender.group) && (
                    <div className="text-xs text-muted-foreground mb-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                      <i className="bi bi-person-x-fill text-purple-600 mr-1"></i>
                      <span className="font-medium">অন্যায়কারী:</span>{' '}
                      {[
                        p.offender.type,
                        p.offender.name,
                        p.offender.position,
                        p.offender.group,
                      ].filter(Boolean).join(' · ')}
                      {p.offender.description && <span className="block mt-1">{p.offender.description}</span>}
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {p.status !== 'approved' && <Button size="sm" className="gap-1" onClick={() => updatePost(p.id, 'approved')}><i className="bi bi-check-lg"></i> অনুমোদন</Button>}
                    {p.status !== 'rejected' && <Button size="sm" variant="destructive" className="gap-1" onClick={() => updatePost(p.id, 'rejected')}><i className="bi bi-x-lg"></i> বাতিল</Button>}
                    {p.status !== 'pending' && <Button size="sm" variant="outline" className="gap-1" onClick={() => updatePost(p.id, 'pending')}><i className="bi bi-arrow-counterclockwise"></i> পেন্ডিং</Button>}
                    <Button size="sm" variant="secondary" className="gap-1" onClick={() => setEditing(p)}><i className="bi bi-pencil-fill"></i> সম্পাদনা</Button>
                    <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => deletePost(p.id)}><i className="bi bi-trash3-fill"></i> মুছুন</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -- Edit Post Dialog (inline) -- */
function EditPostDialog({ post, onClose, onSaved }: { post: any; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(post.title || '');
  const [content, setContent] = useState(post.content || '');
  const [category, setCategory] = useState(post.category || '');
  const [amount, setAmount] = useState(post.amount ? String(post.amount) : '');
  const [outcome, setOutcome] = useState(post.outcome || '');
  const [location, setLocation] = useState(post.location || '');
  const [division, setDivision] = useState(post.division || '');
  const [district, setDistrict] = useState(post.district || '');
  const [upazila, setUpazila] = useState(post.upazila || '');
  const [union, setUnion] = useState(post.union || '');
  const [offenderType, setOffenderType] = useState(post.offender?.type || '');
  const [offenderName, setOffenderName] = useState(post.offender?.name || '');
  const [offenderDesc, setOffenderDesc] = useState(post.offender?.description || '');
  const [offenderPosition, setOffenderPosition] = useState(post.offender?.position || '');
  const [offenderGroup, setOffenderGroup] = useState(post.offender?.group || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || !category) {
      toast.error('শিরোনাম, বিবরণ ও বিষয় আবশ্যক');
      return;
    }
    setSaving(true);
    try {
      const amountRaw = bnToEnDigits(amount).replace(/[^\d.]/g, '');
      const hasOffender = offenderType || offenderName.trim() || offenderDesc.trim() || offenderPosition.trim() || offenderGroup.trim();
      const offender = hasOffender ? {
        type: offenderType || null,
        name: offenderName.trim() || null,
        description: offenderDesc.trim() || null,
        position: offenderPosition.trim() || null,
        group: offenderGroup.trim() || null,
      } : null;

      await update('posts', post.id, {
        title: title.trim(),
        content: content.trim(),
        category,
        amount: amountRaw ? parseFloat(amountRaw) : null,
        outcome: outcome || null,
        location: location.trim() || null,
        division: division || null,
        district: district || null,
        upazila: upazila || null,
        union: union || null,
        offender,
        updatedAt: new Date().toISOString(),
      });
      toast.success('পোস্ট সম্পাদনা সম্পন্ন হয়েছে');
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || 'সম্পাদনা ব্যর্থ');
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span><i className="bi bi-pencil-fill text-primary mr-2"></i>পোস্ট সম্পাদনা</span>
          <Button size="sm" variant="ghost" onClick={onClose}><i className="bi bi-x-lg"></i></Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-medium mb-1 block">বিষয়</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="বিষয়" /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">শিরোনাম</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">বিবরণ</label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block">বিভাগ</label>
            <Input value={division} onChange={(e) => setDivision(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">জেলা</label>
            <Input value={district} onChange={(e) => setDistrict(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">উপজেলা</label>
            <Input value={upazila} onChange={(e) => setUpazila(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">ইউনিয়ন</label>
            <Input value={union} onChange={(e) => setUnion(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">বিস্তারিত অবস্থান</label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block">দাবিকৃত অর্থ (৳)</label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">ফলাফল</label>
            <Select value={outcome} onValueChange={(v) => setOutcome(v === '_all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="ফলাফল" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">নির্বাচন করুন</SelectItem>
                {OUTCOMES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="border-t pt-3">
          <h4 className="text-xs font-semibold mb-2 text-purple-700 dark:text-purple-300"><i className="bi bi-person-x-fill mr-1"></i>অন্যায়কারীর তথ্য</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select value={offenderType} onValueChange={(v) => setOffenderType(v === '_all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="ধরন" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">নির্বাচন করুন</SelectItem>
                {OFFENDER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="নাম / ডাকনাম" value={offenderName} onChange={(e) => setOffenderName(e.target.value)} />
            <Input placeholder="পেশা / পদবি" value={offenderPosition} onChange={(e) => setOffenderPosition(e.target.value)} />
            <Input placeholder="দল / চক্রের নাম" value={offenderGroup} onChange={(e) => setOffenderGroup(e.target.value)} />
          </div>
          <Textarea className="mt-3" placeholder="চেহারা / বিবরণ" value={offenderDesc} onChange={(e) => setOffenderDesc(e.target.value)} rows={2} />
        </div>
        <div className="flex gap-2 pt-3 border-t">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <><i className="bi bi-hourglass-split animate-spin"></i> সংরক্ষণ...</> : <><i className="bi bi-check-lg"></i> সংরক্ষণ করুন</>}
          </Button>
          <Button variant="outline" onClick={onClose} className="gap-2"><i className="bi bi-x-lg"></i> বাতিল</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* -- Admin Comments (with full edit) -- */
function AdminComments({ status, setStatus }: { status: string; setStatus: (s: string) => void }) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [commentRecords, postRecords] = await Promise.all([
        getAll('comments'),
        getAll('posts'),
      ]);
      const allComms = commentRecords.map(toComment);
      const allPosts = postRecords.map(toPost);

      let filtered = allComms;
      if (status !== 'all') {
        filtered = allComms.filter((c) => c.status === status);
      }
      filtered = filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      const withPost = filtered.map((c) => {
        const post = allPosts.find((p) => p.id === c.postId);
        return {
          ...c,
          post: post ? { id: post.id, title: post.title, hashedId: post.hashedId || post.id } : null,
        };
      });

      setComments(withPost);
    } catch (err: any) {
      setError(err?.message || 'মন্তব্য লোড করা যায়নি');
      setComments([]);
    }
    setLoading(false);
  }, [status]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const updateComment = async (id: string, newStatus: string) => {
    try {
      await update('comments', id, { status: newStatus });
      toast.success('আপডেট হয়েছে');
      fetchComments();
    } catch (err: any) {
      toast.error(err?.message || 'আপডেট ব্যর্থ');
    }
  };

  const saveEdit = async (id: string) => {
    if (!editText.trim()) {
      toast.error('মন্তব্য খালি হতে পারবে না');
      return;
    }
    try {
      await update('comments', id, { content: editText.trim() });
      toast.success('মন্তব্য সম্পাদনা হয়েছে');
      setEditingId(null);
      setEditText('');
      fetchComments();
    } catch (err: any) {
      toast.error(err?.message || 'সম্পাদনা ব্যর্থ');
    }
  };

  const deleteComment = async (id: string) => {
    if (!confirm('মন্তব্য মুছে ফেলতে চান?')) return;
    try {
      await remove('comments', id);
      toast.success('মুছে ফেলা হয়েছে');
      fetchComments();
    } catch (err: any) {
      toast.error(err?.message || 'মুছতে সমস্যা');
    }
  };

  if (loading) return <div className="animate-pulse space-y-3"><div className="h-16 bg-muted rounded" /><div className="h-16 bg-muted rounded" /></div>;
  if (error) return (
    <Card><CardContent className="p-6 text-center">
      <i className="bi bi-exclamation-triangle-fill text-4xl text-destructive block mb-2"></i>
      <p className="text-sm text-muted-foreground mb-4">{error}</p>
      <Button onClick={fetchComments} variant="outline" className="gap-2"><i className="bi bi-arrow-clockwise"></i> আবার চেষ্টা করুন</Button>
    </CardContent></Card>
  );

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['pending', 'approved', 'rejected', 'all'].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${status === s ? 'bg-primary text-primary-foreground' : 'bg-accent'}`}>
            {s === 'pending' ? 'পেন্ডিং' : s === 'approved' ? 'প্রকাশিত' : s === 'rejected' ? 'বাতিল' : 'সকল'}
          </button>
        ))}
      </div>

      {comments.length === 0 ? <p className="text-center text-muted-foreground py-8">কোনো মন্তব্য নেই</p> : (
        <div className="space-y-3 max-h-[70vh] overflow-y-auto scrollbar-thin">
          {comments.map((c: any) => {
            const sInfo = STATUS_MAP[c.status] || STATUS_MAP.pending;
            const isEditing = editingId === c.id;
            return (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={sInfo.color}>{sInfo.label}</Badge>
                    <span className="text-xs text-muted-foreground font-mono">#{shortHash(c.id)}</span>
                    <span className="text-xs text-muted-foreground"><i className="bi bi-clock"></i> {formatDate(c.createdAt)}</span>
                  </div>
                  {isEditing ? (
                    <div className="space-y-2 mb-2">
                      <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(c.id)} className="gap-1"><i className="bi bi-check-lg"></i> সংরক্ষণ</Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditText(''); }} className="gap-1"><i className="bi bi-x-lg"></i> বাতিল</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm mb-2 whitespace-pre-wrap">{c.content}</p>
                  )}
                  {c.post && <p className="text-xs text-muted-foreground mb-3"><i className="bi bi-link-45deg"></i> পোস্ট: {c.post.title?.slice(0, 50)}...</p>}
                  <div className="flex gap-2 flex-wrap">
                    {c.status !== 'approved' && <Button size="sm" className="gap-1" onClick={() => updateComment(c.id, 'approved')}><i className="bi bi-check-lg"></i> অনুমোদন</Button>}
                    {c.status !== 'rejected' && <Button size="sm" variant="destructive" className="gap-1" onClick={() => updateComment(c.id, 'rejected')}><i className="bi bi-x-lg"></i> বাতিল</Button>}
                    {!isEditing && <Button size="sm" variant="secondary" className="gap-1" onClick={() => { setEditingId(c.id); setEditText(c.content); }}><i className="bi bi-pencil-fill"></i> সম্পাদনা</Button>}
                    <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => deleteComment(c.id)}><i className="bi bi-trash3-fill"></i> মুছুন</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -- Admin Stats -- */
function AdminStats({ stats, loading, onRetry }: { stats: any; loading: boolean; onRetry: () => void }) {
  if (loading) return <div className="animate-pulse space-y-4"><div className="grid grid-cols-3 gap-4"><div className="h-24 bg-muted rounded" /><div className="h-24 bg-muted rounded" /><div className="h-24 bg-muted rounded" /></div></div>;
  if (!stats) return (
    <Card><CardContent className="p-6 text-center">
      <i className="bi bi-exclamation-triangle-fill text-4xl text-destructive block mb-2"></i>
      <p className="text-sm text-muted-foreground mb-4">পরিসংখ্যান লোড করা যায়নি</p>
      <Button onClick={onRetry} variant="outline" className="gap-2"><i className="bi bi-arrow-clockwise"></i> আবার চেষ্টা করুন</Button>
    </CardContent></Card>
  );

  const o = stats.overview;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon="bi-file-earmark-text-fill" value={String(o.totalPosts)} label="মোট পোস্ট" />
        <StatCard icon="bi-hourglass-split" value={String(o.pendingPosts)} label="পেন্ডিং পোস্ট" color="text-amber-600" />
        <StatCard icon="bi-check-circle-fill" value={String(o.approvedPosts)} label="প্রকাশিত" color="text-emerald-600" />
        <StatCard icon="bi-x-circle-fill" value={String(o.rejectedPosts)} label="বাতিল" color="text-red-600" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon="bi-chat-dots-fill" value={String(o.totalComments)} label="মোট মন্তব্য" />
        <StatCard icon="bi-hourglass-bottom" value={String(o.pendingComments)} label="পেন্ডিং মন্তব্য" color="text-amber-600" />
        <StatCard icon="bi-cash-stack" value={formatAmount(o.totalAmount)} label="মোট দাবিকৃত" color="text-rose-600" />
        <StatCard icon="bi-eye-fill" value={String(o.totalViews)} label="মোট ভিউ" />
      </div>

      {stats.byCategory.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">বিষয় অনুযায়ী</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.byCategory.map((c: any) => <div key={c.name} className="flex justify-between text-sm"><span>{c.name}</span><span className="font-semibold">{c.count}</span></div>)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* -- Admin Users (super_admin only) -- */
function AdminUsers() {
  const [users, setUsers] = useState<Array<{ id: string; username: string; name: string; role: AdminRole; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New user form
  const [showForm, setShowForm] = useState(false);
  const [nuName, setNuName] = useState('');
  const [nuUser, setNuUser] = useState('');
  const [nuPass, setNuPass] = useState('');
  const [nuRole, setNuRole] = useState<AdminRole>('posts_moderator');
  const [creating, setCreating] = useState(false);

  // Password reset
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPass, setNewPass] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listAdmins();
      list.sort((a, b) => (a.role === 'super_admin' ? -1 : 1) - (b.role === 'super_admin' ? -1 : 1) || a.createdAt.localeCompare(b.createdAt));
      setUsers(list);
    } catch (err: any) {
      setError(err?.message || 'ইউজার তালিকা লোড করা যায়নি');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async () => {
    if (!nuName.trim() || !nuUser.trim() || !nuPass) {
      toast.error('সকল তথ্য পূরণ করুন');
      return;
    }
    if (nuPass.length < 6) {
      toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }
    setCreating(true);
    try {
      await createSubAdmin({ name: nuName, username: nuUser, password: nuPass, role: nuRole });
      toast.success('নতুন ইউজার তৈরি হয়েছে');
      setNuName(''); setNuUser(''); setNuPass(''); setNuRole('posts_moderator');
      setShowForm(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || 'ইউজার তৈরি ব্যর্থ');
    }
    setCreating(false);
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`আপনি কি নিশ্চিত "${username}" ইউজারটি মুছে ফেলতে চান?`)) return;
    try {
      await deleteAdmin(id);
      toast.success('ইউজার মুছে ফেলা হয়েছে');
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || 'মুছতে সমস্যা');
    }
  };

  const handleReset = async () => {
    if (!resetId || !newPass) return;
    if (newPass.length < 6) {
      toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }
    setResetting(true);
    try {
      await resetAdminPassword(resetId, newPass);
      toast.success('পাসওয়ার্ড পরিবর্তন হয়েছে');
      setResetId(null);
      setNewPass('');
    } catch (err: any) {
      toast.error(err?.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ');
    }
    setResetting(false);
  };

  if (loading) return <div className="animate-pulse space-y-3"><div className="h-16 bg-muted rounded" /><div className="h-16 bg-muted rounded" /></div>;
  if (error) return (
    <Card><CardContent className="p-6 text-center">
      <i className="bi bi-exclamation-triangle-fill text-4xl text-destructive block mb-2"></i>
      <p className="text-sm text-muted-foreground mb-4">{error}</p>
      <Button onClick={fetchUsers} variant="outline" className="gap-2"><i className="bi bi-arrow-clockwise"></i> আবার চেষ্টা করুন</Button>
    </CardContent></Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold"><i className="bi bi-people-fill text-primary mr-2"></i>অ্যাডমিন ইউজার তালিকা</h3>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <i className={`bi ${showForm ? 'bi-x-lg' : 'bi-plus-lg'}`}></i> {showForm ? 'বাতিল' : 'নতুন ইউজার'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">নতুন ইউজার তৈরি</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">পূর্ণ নাম</label>
                <Input value={nuName} onChange={(e) => setNuName(e.target.value)} placeholder="ইউজারের নাম" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">ইউজারনেম</label>
                <Input value={nuUser} onChange={(e) => setNuUser(e.target.value)} placeholder="যেমন: post.mod" autoComplete="off" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)</label>
                <Input type="password" value={nuPass} onChange={(e) => setNuPass(e.target.value)} autoComplete="new-password" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">রোল</label>
                <Select value={nuRole} onValueChange={(v) => setNuRole(v as AdminRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ADMIN_ROLES.filter((r) => r.value !== 'super_admin').map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {nuRole && <p className="text-xs text-muted-foreground"><i className="bi bi-info-circle"></i> {roleDesc(nuRole)}</p>}
            <Button onClick={handleCreate} disabled={creating} className="gap-2">
              {creating ? <><i className="bi bi-hourglass-split animate-spin"></i> তৈরি হচ্ছে...</> : <><i className="bi bi-check-lg"></i> ইউজার তৈরি করুন</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {users.length === 0 ? <p className="text-center text-muted-foreground py-8">কোনো ইউজার নেই</p> : (
        <div className="space-y-3">
          {users.map((u) => {
            const isSuperAdmin = u.role === 'super_admin';
            return (
              <Card key={u.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <i className={`bi ${isSuperAdmin ? 'bi-shield-fill-check text-amber-500' : 'bi-person-fill text-muted-foreground'}`}></i>
                        <span className="font-semibold">{u.name}</span>
                        <span className="text-xs text-muted-foreground">@{u.username}</span>
                        <Badge variant={isSuperAdmin ? 'default' : 'outline'} className="text-xs">{roleLabel(u.role)}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <i className="bi bi-clock mr-1"></i>{formatDate(u.createdAt)}
                        <span className="mx-2">·</span>
                        <i className="bi bi-hash mr-1"></i>{shortHash(u.id)}
                      </div>
                    </div>
                    {!isSuperAdmin && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setResetId(resetId === u.id ? null : u.id); setNewPass(''); }} className="gap-1">
                          <i className="bi bi-key"></i> পাসওয়ার্ড
                        </Button>
                        <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => handleDelete(u.id, u.username)}>
                          <i className="bi bi-trash3-fill"></i>
                        </Button>
                      </div>
                    )}
                  </div>
                  {resetId === u.id && (
                    <div className="mt-3 pt-3 border-t flex gap-2 flex-wrap">
                      <Input
                        type="password"
                        placeholder="নতুন পাসওয়ার্ড"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        className="flex-1 min-w-[200px]"
                        autoComplete="new-password"
                      />
                      <Button size="sm" onClick={handleReset} disabled={resetting} className="gap-1">
                        {resetting ? <><i className="bi bi-hourglass-split animate-spin"></i>...</> : <><i className="bi bi-check-lg"></i> পরিবর্তন</>}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setResetId(null); setNewPass(''); }}>বাতিল</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="bg-muted/30">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground mb-1"><i className="bi bi-info-circle mr-1"></i>রোল ব্যাখ্যা:</p>
          {ADMIN_ROLES.map((r) => (
            <p key={r.value}><span className="font-medium">{r.label}:</span> {r.desc}</p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*                         PRIVACY VIEW                                 */
/* ═══════════════════════════════════════════════════════════════════════ */
function PrivacyView() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6"><i className="bi bi-shield-check text-primary mr-2"></i>গোপনীয়তা নীতি</h1>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold text-lg mb-3"><i className="bi bi-database-x text-destructive mr-2"></i>যা সংগ্রহ করা হয় না</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {['নাম', 'ইমেইল', 'ফোন নম্বর', 'কাঁচা IP ঠিকানা', 'অ্যানালিটিক্স কুকি', 'বিজ্ঞাপন ID', 'ডিভাইস ফিঙ্গারপ্রিন্ট', 'অ্যাকাউন্ট তথ্য'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm"><i className="bi bi-x-circle-fill text-destructive"></i> {item}</div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold text-lg mb-3"><i className="bi bi-database-check text-primary mr-2"></i>যা সংগ্রহ করা হয়</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><i className="bi bi-check-circle-fill text-primary mr-2"></i>রিপোর্টের বিষয়বস্তু (শিরোনাম, বিবরণ, বিভাগ, অবস্থান)</li>
              <li><i className="bi bi-check-circle-fill text-primary mr-2"></i>ঐচ্ছিক অন্যায়কারীর তথ্য (নাম, চেহারা, পেশা, দল)</li>
              <li><i className="bi bi-check-circle-fill text-primary mr-2"></i>দাবিকৃত অর্থের পরিমাণ (ঐচ্ছিক)</li>
              <li><i className="bi bi-check-circle-fill text-primary mr-2"></i>অ্যাডমিন ক্রেডেনশিয়াল (bcrypt দিয়ে হ্যাশ করা)</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold text-lg mb-3"><i className="bi bi-shield-exclamation text-amber-500 mr-2"></i>নিরাপত্তা নিয়ম</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><i className="bi bi-dash-circle mr-2"></i>সেবা বা প্রক্রিয়া বর্ণনা করতে হবে, ব্যক্তিকে নয়</li>
              <li><i className="bi bi-dash-circle mr-2"></i>সকল জমা মডারেশনের মধ্য দিয়ে যায়</li>
              <li><i className="bi bi-dash-circle mr-2"></i>ব্যক্তিগত পরিচয় সহ কন্টেন্ট বাতিল করা হয়</li>
              <li><i className="bi bi-dash-circle mr-2"></i>ভুয়া বা মিথ্যা তথ্য সরানো হয়</li>
              <li><i className="bi bi-dash-circle mr-2"></i>অন্যায়কারীর তথ্য শুধুমাত্র নির্ভুল ও নিশ্চিত হলে দিন</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*                         CONTACT VIEW                                 */
/* ═══════════════════════════════════════════════════════════════════════ */
function ContactView() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.subject || !form.message) { toast.error('নাম, বিষয় ও বার্তা আবশ্যক'); return; }
    setSubmitting(true);
    try {
      await create('contactMessages', {
        name: form.name.trim(),
        email: form.email?.trim() || null,
        subject: form.subject.trim(),
        message: form.message.trim(),
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      toast.success('বার্তা পাঠানো হয়েছে');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      toast.error(err?.message || 'বার্তা পাঠাতে সমস্যা');
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6"><i className="bi bi-envelope text-primary mr-2"></i>যোগাযোগ</h1>
      <Card>
        <CardContent className="p-5 sm:p-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium mb-1.5 block">নাম <span className="text-destructive">*</span></label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="আপনার নাম" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">ইমেইল</label><Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="ঐচ্ছিক" /></div>
          </div>
          <div><label className="text-sm font-medium mb-1.5 block">বিষয় <span className="text-destructive">*</span></label><Input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder="বিষয়" /></div>
          <div><label className="text-sm font-medium mb-1.5 block">বার্তা <span className="text-destructive">*</span></label><Textarea value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} placeholder="আপনার বার্তা লিখুন..." rows={5} /></div>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">{submitting ? <><i className="bi bi-hourglass-split animate-spin"></i> পাঠানো হচ্ছে...</> : <><i className="bi bi-send-fill"></i> পাঠান</>}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*                           FAQ VIEW                                   */
/* ═══════════════════════════════════════════════════════════════════════ */
function FAQView() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2"><i className="bi bi-question-circle text-primary mr-2"></i>সাধারণ জিজ্ঞাসা</h1>
        <p className="text-muted-foreground">গুঞ্জন সম্পর্কে সাধারণ প্রশ্ন ও উত্তর</p>
      </div>
      <Accordion type="single" collapsible className="space-y-3">
        {FAQS.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4">
            <AccordionTrigger className="text-left text-sm font-medium hover:no-underline py-4">{faq.q}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">{faq.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
