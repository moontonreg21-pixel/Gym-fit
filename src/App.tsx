import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, Dumbbell, Menu, Play, ShieldCheck, Youtube, X, LogOut, Plus, Pencil, Trash2, Search, FolderOpen, BookOpen } from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type Category = { id: string; name: string; slug: string; description: string };
type Video = { id: string; title: string; description: string; youtube_url: string; category_id: string; difficulty: string; created_at?: string };
type Exercise = { id: string; name: string; category_id: string; instructions: string; sets_reps: string; difficulty: string };

const seedCategories: Category[] = [
  { id: "chest", name: "Chest", slug: "chest", description: "Latihan untuk membangun otot dada." },
  { id: "back", name: "Back", slug: "back", description: "Latihan untuk memperkuat punggung." },
  { id: "shoulder", name: "Shoulder", slug: "shoulder", description: "Latihan otot bahu dan stabilitas." },
  { id: "arms", name: "Arms", slug: "arms", description: "Latihan biceps dan triceps." },
  { id: "abs", name: "Abs", slug: "abs", description: "Latihan inti dan otot perut." },
  { id: "legs", name: "Legs", slug: "legs", description: "Latihan kaki dan tubuh bagian bawah." }
];

const seedVideos: Video[] = [
  { id: "v1", title: "Push Up untuk Pemula", description: "Pelajari teknik dasar push up dengan posisi tubuh yang benar.", youtube_url: "https://www.youtube.com/watch?v=IODxDxX7oi4", category_id: "chest", difficulty: "Pemula" },
  { id: "v2", title: "Latihan Punggung di Gym", description: "Panduan dasar gerakan untuk melatih otot punggung.", youtube_url: "https://www.youtube.com/watch?v=CAwf7n6luuc", category_id: "back", difficulty: "Menengah" },
  { id: "v3", title: "Leg Day Basics", description: "Gerakan dasar untuk melatih otot kaki.", youtube_url: "https://www.youtube.com/watch?v=U3HlEF_E9fo", category_id: "legs", difficulty: "Pemula" }
];

const seedExercises: Exercise[] = [
  { id: "e1", name: "Push Up", category_id: "chest", instructions: "1. Posisikan telapak tangan sedikit lebih lebar dari bahu.\n2. Luruskan tubuh dari kepala hingga tumit.\n3. Turunkan dada secara terkontrol, lalu dorong kembali.", sets_reps: "3 set × 8–12 repetisi", difficulty: "Pemula" },
  { id: "e2", name: "Bodyweight Squat", category_id: "legs", instructions: "1. Berdiri dengan kaki selebar bahu.\n2. Dorong pinggul ke belakang dan tekuk lutut.\n3. Turun sesuai kemampuan, lalu berdiri kembali.", sets_reps: "3 set × 10–15 repetisi", difficulty: "Pemula" },
  { id: "e3", name: "Plank", category_id: "abs", instructions: "1. Topang tubuh dengan siku dan ujung kaki.\n2. Jaga tubuh tetap lurus dan perut aktif.\n3. Bernapas normal selama menahan posisi.", sets_reps: "3 set × 20–40 detik", difficulty: "Pemula" }
];

function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1);
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) return parsed.pathname.split("/")[2];
      return parsed.searchParams.get("v");
    }
  } catch { return null; }
  return null;
}
function thumbnail(url: string) {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}
function embedUrl(url: string) {
  const id = youtubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
}

const getInitialPage = (): "home" | "guide" | "videos" | "admin" => {
  const path = window.location.pathname.toLowerCase().replace(/\/$/, "");
  if (path === "/admin") return "admin";
  if (path === "/guide") return "guide";
  if (path === "/videos") return "videos";
  return "home";
};

export default function App() {
  const [categories, setCategories] = useState<Category[]>(seedCategories);
  const [videos, setVideos] = useState<Video[]>(seedVideos);
  const [exercises, setExercises] = useState<Exercise[]>(seedExercises);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState<"home" | "guide" | "videos" | "admin">(getInitialPage);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Video form
  const [form, setForm] = useState({ id: "", title: "", description: "", youtube_url: "", category_id: "chest", difficulty: "Pemula" });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  // Admin tab: videos | categories | exercises
  const [adminTab, setAdminTab] = useState<"videos" | "categories" | "exercises">("videos");

  // Category form
  const [catForm, setCatForm] = useState({ id: "", name: "", slug: "", description: "" });
  const [catEditing, setCatEditing] = useState(false);
  const [catSaving, setCatSaving] = useState(false);

  // Exercise form
  const [exForm, setExForm] = useState({ id: "", name: "", category_id: "chest", difficulty: "Pemula", instructions: "", sets_reps: "" });
  const [exEditing, setExEditing] = useState(false);
  const [exSaving, setExSaving] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/$/, "");
      if (path === "/admin") setPage("admin");
      else if (path === "/guide") setPage("guide");
      else if (path === "/videos") setPage("videos");
      else setPage("home");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, current) => setSession(current));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const load = async () => {
      const [c, v, e] = await Promise.all([
        supabase!.from("categories").select("*").order("name"),
        supabase!.from("videos").select("*").eq("is_published", true).order("created_at", { ascending: false }),
        supabase!.from("exercises").select("*").order("name")
      ]);
      if (c.data?.length) setCategories(c.data);
      if (v.data) setVideos(v.data);
      if (e.data) setExercises(e.data);
    };
    load();
  }, []);

  async function reloadCategories() {
    if (!supabase) return;
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data);
  }

  async function reloadExercises() {
    if (!supabase) return;
    const { data } = await supabase.from("exercises").select("*").order("name");
    if (data) setExercises(data);
  }

  const filteredVideos = useMemo(() => videos.filter(v =>
    (activeCategory === "all" || v.category_id === activeCategory) &&
    `${v.title} ${v.description}`.toLowerCase().includes(search.toLowerCase())
  ), [videos, activeCategory, search]);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setLoginError("");
    if (!supabase) { setLoginError("Hubungkan Supabase terlebih dahulu melalui file .env."); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) setLoginError(error.message);
    else { nav("admin"); setNotice("Berhasil login."); }
  }
  async function logout() {
    await supabase?.auth.signOut(); setSession(null); nav("home");
  }

  // ---- Video CRUD ----
  async function saveVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!youtubeId(form.youtube_url)) { setNotice("Masukkan URL YouTube yang valid."); return; }
    if (!supabase) { setNotice("Hubungkan Supabase terlebih dahulu untuk menyimpan data."); return; }
    setSaving(true);
    const payload = { title: form.title, description: form.description, youtube_url: form.youtube_url, category_id: form.category_id, difficulty: form.difficulty, is_published: true };
    const result = editing
      ? await supabase.from("videos").update(payload).eq("id", form.id)
      : await supabase.from("videos").insert(payload);
    setSaving(false);
    if (result.error) { setNotice(result.error.message); return; }
    const { data } = await supabase.from("videos").select("*").eq("is_published", true).order("created_at", { ascending: false });
    if (data) setVideos(data);
    setForm({ id: "", title: "", description: "", youtube_url: "", category_id: categories[0]?.id ?? "chest", difficulty: "Pemula" });
    setEditing(false); setNotice("Video berhasil disimpan.");
  }
  async function deleteVideo(id: string) {
    if (!supabase || !confirm("Hapus video ini?")) return;
    const { error } = await supabase.from("videos").delete().eq("id", id);
    if (error) setNotice(error.message);
    else setVideos(prev => prev.filter(v => v.id !== id));
  }
  function editVideo(video: Video) {
    setForm({ id: video.id, title: video.title, description: video.description, youtube_url: video.youtube_url, category_id: video.category_id, difficulty: video.difficulty });
    setEditing(true); setAdminTab("videos"); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---- Category CRUD ----
  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setNotice("Hubungkan Supabase terlebih dahulu."); return; }
    setCatSaving(true);
    const slug = catForm.slug || catForm.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const payload = { name: catForm.name, slug, description: catForm.description };

    if (catEditing) {
      const result = await supabase.from("categories").update(payload).eq("id", catForm.id);
      setCatSaving(false);
      if (result.error) { setNotice(result.error.message); return; }
      setNotice("Kategori berhasil diperbarui.");
    } else {
      const id = slug;
      const result = await supabase.from("categories").insert({ id, ...payload });
      setCatSaving(false);
      if (result.error) { setNotice(result.error.message); return; }
      setNotice("Kategori berhasil ditambahkan.");
    }

    await reloadCategories();
    setCatForm({ id: "", name: "", slug: "", description: "" });
    setCatEditing(false);
  }

  function editCategory(cat: Category) {
    setCatForm({ id: cat.id, name: cat.name, slug: cat.slug, description: cat.description });
    setCatEditing(true); setAdminTab("categories"); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteCategory(id: string) {
    if (!supabase || !confirm("Hapus kategori ini? Video dan exercise dengan kategori ini akan kehilangan referensinya.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { setNotice(error.message); return; }
    setNotice("Kategori berhasil dihapus.");
    await reloadCategories();
  }

  // ---- Exercise (Panduan Gerakan) CRUD ----
  async function saveExercise(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setNotice("Hubungkan Supabase terlebih dahulu."); return; }
    setExSaving(true);
    const payload = {
      name: exForm.name,
      category_id: exForm.category_id,
      difficulty: exForm.difficulty,
      instructions: exForm.instructions,
      sets_reps: exForm.sets_reps
    };

    if (exEditing) {
      const result = await supabase.from("exercises").update(payload).eq("id", exForm.id);
      setExSaving(false);
      if (result.error) { setNotice(result.error.message); return; }
      setNotice("Panduan latihan berhasil diperbarui.");
    } else {
      const result = await supabase.from("exercises").insert(payload);
      setExSaving(false);
      if (result.error) { setNotice(result.error.message); return; }
      setNotice("Panduan latihan berhasil ditambahkan.");
    }

    await reloadExercises();
    setExForm({ id: "", name: "", category_id: categories[0]?.id ?? "chest", difficulty: "Pemula", instructions: "", sets_reps: "" });
    setExEditing(false);
  }

  function editExercise(ex: Exercise) {
    setExForm({
      id: ex.id,
      name: ex.name,
      category_id: ex.category_id,
      difficulty: ex.difficulty,
      instructions: ex.instructions,
      sets_reps: ex.sets_reps
    });
    setExEditing(true);
    setAdminTab("exercises");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteExercise(id: string) {
    if (!supabase || !confirm("Hapus panduan latihan ini?")) return;
    const { error } = await supabase.from("exercises").delete().eq("id", id);
    if (error) { setNotice(error.message); return; }
    setNotice("Panduan latihan berhasil dihapus.");
    await reloadExercises();
  }

  const categoryName = (id: string) => categories.find(c => c.id === id)?.name ?? "Workout";
  const nav = (target: typeof page) => {
    setPage(target);
    setMobileMenu(false);
    const targetPath = target === "home" ? "/" : `/${target}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
    window.scrollTo(0, 0);
  };

  return <div className="min-h-screen bg-[#101010] text-white">
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#101010]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <button onClick={() => nav("home")} className="flex items-center gap-2 text-xl font-black tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#ef233c]"><Dumbbell size={20} /></span>FIT<span className="text-[#ef233c]">ZONE</span></button>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-zinc-300 md:flex">
          <button onClick={() => nav("home")} className={page === "home" ? "text-white" : "hover:text-white"}>Beranda</button>
          <button onClick={() => nav("guide")} className={page === "guide" ? "text-white" : "hover:text-white"}>Panduan Latihan</button>
          <button onClick={() => nav("videos")} className={page === "videos" ? "text-white" : "hover:text-white"}>Video Workout</button>
        </nav>
        <button className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Buka menu">{mobileMenu ? <X /> : <Menu />}</button>
      </div>
      {mobileMenu && <div className="grid gap-3 border-t border-white/10 px-5 py-4 md:hidden"><button onClick={() => nav("home")}>Beranda</button><button onClick={() => nav("guide")}>Panduan Latihan</button><button onClick={() => nav("videos")}>Video Workout</button></div>}
    </header>

    {page === "home" && <>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_75%_40%,rgba(239,35,60,.23),transparent_45%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:py-28">
          <div><p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ef233c]/40 bg-[#ef233c]/10 px-4 py-2 text-xs font-bold uppercase tracking-[.2em] text-red-300"> Train smarter, get stronger</p>
            <h1 className="max-w-xl text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">BUILD YOUR BODY. <span className="text-[#ef233c]">BUILD YOUR CONFIDENCE.</span></h1>
            <p className="mt-6 max-w-lg leading-7 text-zinc-400">Temukan panduan latihan otot, pelajari teknik gerakan yang benar, dan mulai perjalanan fitness kamu bersama FitZone.</p>
            <div className="mt-8 flex flex-wrap gap-3"><button onClick={() => nav("guide")} className="flex items-center gap-2 rounded-full bg-[#ef233c] px-6 py-3 font-bold hover:bg-red-600">Mulai Latihan <ArrowRight size={18} /></button><button onClick={() => nav("videos")} className="flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 font-bold hover:bg-white/10"><Play size={17} /> Lihat Video</button></div>
            <div className="mt-12 flex gap-10"><div><p className="text-3xl font-black">{categories.length}+</p><p className="text-xs text-zinc-500">Kategori latihan</p></div><div><p className="text-3xl font-black">{videos.length}+</p><p className="text-xs text-zinc-500">Video workout</p></div><div><p className="text-3xl font-black">100%</p><p className="text-xs text-zinc-500">Semangat latihan</p></div></div>
          </div>
          <div className="relative"><div className="absolute -inset-5 rounded-[2rem] bg-[#ef233c]/20 blur-3xl" /><img className="relative h-[430px] w-full rounded-[2rem] object-cover grayscale-[20%]" src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=85" alt="Suasana gym" /><div className="absolute bottom-5 left-5 rounded-xl border border-white/10 bg-black/70 p-4 backdrop-blur"><p className="text-xs uppercase tracking-widest text-red-300">Your fitness journey</p><p className="mt-1 font-bold">Stronger every day.</p></div></div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16"><div className="mb-8 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#ef233c]">Explore workout</p><h2 className="mt-2 text-3xl font-black md:text-4xl">Pilih Fokus Latihan</h2></div><button onClick={() => nav("guide")} className="hidden text-sm font-bold text-red-300 md:block">Semua panduan →</button></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{categories.map((c, i) => <button key={c.id} onClick={() => { setActiveCategory(c.id); nav("guide"); }} className="group rounded-2xl border border-white/10 bg-white/[.03] p-6 text-left transition hover:-translate-y-1 hover:border-[#ef233c]/60"><div className="mb-6 flex items-center justify-between"><span className="text-3xl font-black text-[#ef233c]">0{i + 1}</span><Dumbbell className="text-zinc-500 group-hover:text-[#ef233c]" /></div><h3 className="text-xl font-extrabold">{c.name}</h3><p className="mt-2 text-sm text-zinc-500">{c.description}</p></button>)}</div></section>
      <section className="border-y border-white/10 bg-white/[.025]"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 md:grid-cols-3">{[{ icon: <Dumbbell />, title: "Latihan Terarah", desc: "Panduan gerakan berdasarkan kelompok otot." }, { icon: <Play />, title: "Video Tutorial", desc: "Tonton demonstrasi gerakan dari YouTube." }, { icon: <ShieldCheck />, title: "Teknik Lebih Aman", desc: "Pelajari langkah dasar dan sesuaikan dengan kemampuan." }].map(x => <div key={x.title} className="flex gap-4"><span className="text-[#ef233c]">{x.icon}</span><div><h3 className="font-bold">{x.title}</h3><p className="mt-1 text-sm text-zinc-500">{x.desc}</p></div></div>)}</div></section>
    </>}

    {page === "guide" && <main className="mx-auto max-w-7xl px-5 py-14"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#ef233c]">Workout library</p><h1 className="mt-2 text-4xl font-black">Panduan Latihan Otot</h1><p className="mt-3 text-zinc-400">Pelajari gerakan, teknik dasar, dan rekomendasi repetisi.</p><div className="my-8 flex flex-wrap gap-2"><button onClick={() => setActiveCategory("all")} className={`rounded-full px-4 py-2 text-sm ${activeCategory === "all" ? "bg-[#ef233c]" : "bg-white/10"}`}>Semua</button>{categories.map(c => <button key={c.id} onClick={() => setActiveCategory(c.id)} className={`rounded-full px-4 py-2 text-sm ${activeCategory === c.id ? "bg-[#ef233c]" : "bg-white/10"}`}>{c.name}</button>)}</div><div className="grid gap-4 md:grid-cols-2">{exercises.filter(e => activeCategory === "all" || e.category_id === activeCategory).map(e => <article key={e.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-widest text-red-300">{categoryName(e.category_id)}</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{e.difficulty}</span></div><h2 className="mt-3 text-2xl font-extrabold">{e.name}</h2><p className="mt-2 whitespace-pre-line text-sm leading-7 text-zinc-400">{e.instructions}</p><p className="mt-4 border-t border-white/10 pt-4 text-sm font-bold text-white">{e.sets_reps}</p></article>)}</div>{exercises.length === 0 && <p className="text-zinc-400">Belum ada panduan latihan.</p>}</main>}

    {page === "videos" && <main className="mx-auto max-w-7xl px-5 py-14"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#ef233c]">Watch & learn</p><h1 className="mt-2 text-4xl font-black">Video Workout</h1><p className="mt-3 text-zinc-400">Temukan video tutorial sesuai target latihanmu.</p><div className="my-8 flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-4 top-3.5 text-zinc-500" size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari video atau gerakan..." className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 outline-none focus:border-[#ef233c]" /></div><select value={activeCategory} onChange={e => setActiveCategory(e.target.value)} className="rounded-xl border border-white/10 bg-[#1c1c1c] px-4 py-3"><option value="all">Semua kategori</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{filteredVideos.map(v => <article key={v.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]"><div className="aspect-video bg-black"><iframe className="h-full w-full" src={embedUrl(v.youtube_url)} title={v.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div><div className="p-5"><div className="flex items-center justify-between text-xs"><span className="font-bold uppercase tracking-widest text-red-300">{categoryName(v.category_id)}</span><span className="rounded-full bg-white/10 px-2 py-1">{v.difficulty}</span></div><h2 className="mt-3 text-lg font-extrabold">{v.title}</h2><p className="mt-2 text-sm leading-6 text-zinc-400">{v.description}</p><a className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-red-300 hover:text-white" href={v.youtube_url} target="_blank" rel="noreferrer"><Youtube size={17} /> Buka di YouTube</a></div></article>)}</div>{filteredVideos.length === 0 && <p className="rounded-xl border border-white/10 p-8 text-center text-zinc-400">Video tidak ditemukan.</p>}</main>}

    {page === "admin" && <main className="mx-auto max-w-7xl px-5 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#ef233c]">Management area</p>
          <h1 className="mt-2 text-4xl font-black">Dashboard Admin</h1>
        </div>
        {session && <button onClick={logout} className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm"><LogOut size={16} /> Keluar</button>}
      </div>

      {!session ? (
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[.03] p-7">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ef233c]"><ShieldCheck /></div>
          <h2 className="text-2xl font-black">Login Admin</h2>
          <p className="mt-2 text-sm text-zinc-400">Masuk untuk mengelola FitZone.</p>
          {!isSupabaseConfigured && <p className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-200">Supabase belum dikonfigurasi. Salin .env.example menjadi .env dan isi kredensial proyek Supabase.</p>}
          <form onSubmit={login} className="mt-6 grid gap-4">
            <label className="text-sm font-semibold">Email<input required type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-[#ef233c]" /></label>
            <label className="text-sm font-semibold">Password<input required type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-[#ef233c]" /></label>
            {loginError && <p className="text-sm text-red-300">{loginError}</p>}
            <button className="rounded-lg bg-[#ef233c] py-3 font-bold hover:bg-red-600">Masuk</button>
          </form>
        </div>
      ) : (
        <>
          {/* Admin Tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setAdminTab("videos")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${adminTab === "videos" ? "bg-[#ef233c] text-white" : "bg-white/10 text-zinc-300 hover:bg-white/15"}`}
            >
              <Youtube size={16} /> Video Workout
            </button>
            <button
              onClick={() => setAdminTab("exercises")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${adminTab === "exercises" ? "bg-[#ef233c] text-white" : "bg-white/10 text-zinc-300 hover:bg-white/15"}`}
            >
              <BookOpen size={16} /> Panduan Latihan
            </button>
            <button
              onClick={() => setAdminTab("categories")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${adminTab === "categories" ? "bg-[#ef233c] text-white" : "bg-white/10 text-zinc-300 hover:bg-white/15"}`}
            >
              <FolderOpen size={16} /> Kategori Otot
            </button>
          </div>

          {/* Notice */}
          {notice && <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-200">{notice}</p>}

          {/* ========== VIDEO TAB ========== */}
          {adminTab === "videos" && (
            <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
              <section className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
                <h2 className="mb-5 text-xl font-extrabold">{editing ? "Edit Video" : "Tambah Video YouTube"}</h2>
                <form onSubmit={saveVideo} className="grid gap-4">
                  <label className="text-sm font-semibold">Judul video<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="field mt-2" /></label>
                  <label className="text-sm font-semibold">Kategori<select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="field mt-2">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                  <label className="text-sm font-semibold">Deskripsi<textarea required rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="field mt-2" /></label>
                  <label className="text-sm font-semibold">URL YouTube<input required type="url" placeholder="https://www.youtube.com/watch?v=..." value={form.youtube_url} onChange={e => setForm({ ...form, youtube_url: e.target.value })} className="field mt-2" /></label>
                  {youtubeId(form.youtube_url) && <img src={thumbnail(form.youtube_url)} alt="Thumbnail YouTube" className="aspect-video w-full rounded-lg object-cover" />}
                  <label className="text-sm font-semibold">Tingkat kesulitan<select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} className="field mt-2"><option>Pemula</option><option>Menengah</option><option>Profesional</option></select></label>
                  <div className="flex gap-2">
                    <button disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#ef233c] py-3 font-bold disabled:opacity-50"><Plus size={17} />{saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Simpan Video"}</button>
                    {editing && <button type="button" onClick={() => { setEditing(false); setForm({ id: "", title: "", description: "", youtube_url: "", category_id: categories[0]?.id ?? "chest", difficulty: "Pemula" }); }} className="rounded-lg border border-white/15 px-4">Batal</button>}
                  </div>
                </form>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-extrabold">Video Tersimpan</h2>
                  <span className="rounded-full bg-[#ef233c]/15 px-3 py-1 text-sm text-red-200">{videos.length} video</span>
                </div>
                <div className="grid gap-3">
                  {videos.map(v => <div key={v.id} className="flex gap-3 rounded-xl border border-white/10 p-3">
                    <img src={thumbnail(v.youtube_url)} alt="" className="h-20 w-28 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{v.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">{categoryName(v.category_id)} · {v.difficulty}</p>
                      <div className="mt-2 flex gap-3">
                        <button onClick={() => editVideo(v)} className="flex items-center gap-1 text-xs text-red-300"><Pencil size={13} /> Edit</button>
                        <button onClick={() => deleteVideo(v.id)} className="flex items-center gap-1 text-xs text-zinc-400"><Trash2 size={13} /> Hapus</button>
                      </div>
                    </div>
                  </div>)}
                </div>
              </section>
            </div>
          )}

          {/* ========== EXERCISE (PANDUAN LATIHAN) TAB ========== */}
          {adminTab === "exercises" && (
            <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
              {/* Exercise Form */}
              <section className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
                <h2 className="mb-5 text-xl font-extrabold">{exEditing ? "Edit Panduan Gerakan" : "Tambah Panduan Gerakan Baru"}</h2>
                <form onSubmit={saveExercise} className="grid gap-4">
                  <label className="text-sm font-semibold">
                    Nama Gerakan
                    <input
                      required
                      value={exForm.name}
                      onChange={e => setExForm({ ...exForm, name: e.target.value })}
                      placeholder="contoh: Plank, Push Up, Bench Press..."
                      className="field mt-2"
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    Kategori Otot
                    <select
                      value={exForm.category_id}
                      onChange={e => setExForm({ ...exForm, category_id: e.target.value })}
                      className="field mt-2"
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">
                    Tingkat Kesulitan
                    <select
                      value={exForm.difficulty}
                      onChange={e => setExForm({ ...exForm, difficulty: e.target.value })}
                      className="field mt-2"
                    >
                      <option>Pemula</option>
                      <option>Menengah</option>
                      <option>Profesional</option>
                    </select>
                  </label>
                  <label className="text-sm font-semibold">
                    Instruksi Gerakan (Langkah-langkah)
                    <textarea
                      required
                      rows={5}
                      value={exForm.instructions}
                      onChange={e => setExForm({ ...exForm, instructions: e.target.value })}
                      placeholder={"1. Topang tubuh dengan siku dan ujung kaki.\n2. Jaga tubuh tetap lurus dan perut aktif.\n3. Bernapas normal selama menahan posisi."}
                      className="field mt-2"
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    Target Set & Repetisi / Durasi
                    <input
                      required
                      value={exForm.sets_reps}
                      onChange={e => setExForm({ ...exForm, sets_reps: e.target.value })}
                      placeholder="contoh: 3 set × 20–40 detik atau 3 set × 8–12 repetisi"
                      className="field mt-2"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      disabled={exSaving}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#ef233c] py-3 font-bold disabled:opacity-50"
                    >
                      <Plus size={17} />
                      {exSaving ? "Menyimpan..." : exEditing ? "Simpan Perubahan" : "Tambah Gerakan"}
                    </button>
                    {exEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setExEditing(false);
                          setExForm({ id: "", name: "", category_id: categories[0]?.id ?? "chest", difficulty: "Pemula", instructions: "", sets_reps: "" });
                        }}
                        className="rounded-lg border border-white/15 px-4"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>
              </section>

              {/* Exercise List */}
              <section className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-extrabold">Panduan Gerakan Tersimpan</h2>
                  <span className="rounded-full bg-[#ef233c]/15 px-3 py-1 text-sm text-red-200">{exercises.length} gerakan</span>
                </div>
                <div className="grid gap-4">
                  {exercises.map(e => (
                    <div key={e.id} className="rounded-xl border border-white/10 bg-white/[.02] p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-red-300">{categoryName(e.category_id)}</span>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-300">{e.difficulty}</span>
                          </div>
                          <h3 className="mt-2 text-lg font-bold">{e.name}</h3>
                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-400">{e.instructions}</p>
                          <p className="mt-3 border-t border-white/10 pt-3 text-sm font-semibold text-white">{e.sets_reps}</p>
                        </div>
                        <div className="flex shrink-0 gap-3">
                          <button onClick={() => editExercise(e)} className="flex items-center gap-1 text-xs text-red-300 hover:text-red-200">
                            <Pencil size={13} /> Edit
                          </button>
                          <button onClick={() => deleteExercise(e.id)} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-300">
                            <Trash2 size={13} /> Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {exercises.length === 0 && <p className="py-4 text-center text-sm text-zinc-500">Belum ada panduan gerakan.</p>}
                </div>
              </section>
            </div>
          )}

          {/* ========== CATEGORY TAB ========== */}
          {adminTab === "categories" && (
            <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
              {/* Category Form */}
              <section className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
                <h2 className="mb-5 text-xl font-extrabold">{catEditing ? "Edit Kategori" : "Tambah Kategori Baru"}</h2>
                <form onSubmit={saveCategory} className="grid gap-4">
                  <label className="text-sm font-semibold">
                    Nama Kategori
                    <input
                      required
                      value={catForm.name}
                      onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                      placeholder="contoh: Chest, Legs, Cardio..."
                      className="field mt-2"
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    Slug
                    <input
                      value={catForm.slug}
                      onChange={e => setCatForm({ ...catForm, slug: e.target.value })}
                      placeholder={catForm.name ? catForm.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") : "otomatis dari nama"}
                      className="field mt-2"
                    />
                    <span className="mt-1 block text-xs text-zinc-500">Kosongkan untuk generate otomatis dari nama</span>
                  </label>
                  <label className="text-sm font-semibold">
                    Deskripsi
                    <textarea
                      required
                      rows={3}
                      value={catForm.description}
                      onChange={e => setCatForm({ ...catForm, description: e.target.value })}
                      placeholder="Deskripsi singkat tentang kategori latihan ini..."
                      className="field mt-2"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      disabled={catSaving}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#ef233c] py-3 font-bold disabled:opacity-50"
                    >
                      <Plus size={17} />
                      {catSaving ? "Menyimpan..." : catEditing ? "Simpan Perubahan" : "Tambah Kategori"}
                    </button>
                    {catEditing && (
                      <button
                        type="button"
                        onClick={() => { setCatEditing(false); setCatForm({ id: "", name: "", slug: "", description: "" }); }}
                        className="rounded-lg border border-white/15 px-4"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>
              </section>

              {/* Category List */}
              <section className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-extrabold">Kategori Tersimpan</h2>
                  <span className="rounded-full bg-[#ef233c]/15 px-3 py-1 text-sm text-red-200">{categories.length} kategori</span>
                </div>
                <div className="grid gap-3">
                  {categories.map(c => (
                    <div key={c.id} className="rounded-xl border border-white/10 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold">{c.name}</h3>
                            <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-zinc-400">{c.slug}</span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-500">{c.description}</p>
                        </div>
                        <div className="flex shrink-0 gap-3">
                          <button onClick={() => editCategory(c)} className="flex items-center gap-1 text-xs text-red-300 hover:text-red-200">
                            <Pencil size={13} /> Edit
                          </button>
                          <button onClick={() => deleteCategory(c.id)} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-300">
                            <Trash2 size={13} /> Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {categories.length === 0 && <p className="py-4 text-center text-sm text-zinc-500">Belum ada kategori.</p>}
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </main>}

    <footer className="border-t border-white/10 bg-black/30"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-5 py-8 text-sm text-zinc-500 md:flex-row"><p><span className="font-black text-white">FIT<span className="text-[#ef233c]">ZONE</span></span> — Build your body, build your confidence.</p><p>© {new Date().getFullYear()} FitZone. Latihan dengan teknik yang benar.</p></div></footer>
  </div>;
}
