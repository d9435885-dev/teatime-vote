import React, { useState, useMemo, useEffect } from "react";
import {
  Coffee,
  Pizza,
  Users,
  Table,
  Check,
  Plus,
  UtensilsCrossed,
  AlertCircle,
  Pencil,
  Trash2,
  Save,
  X,
  ExternalLink,
  Crown,
  UserMinus,
  Settings,
  History,
  SaveAll,
  FilePlus,
  Loader2,
} from "lucide-react";

// --- Firebase 雲端資料庫設定 ---
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBf3sDIG804XV_o6SWLlRZ0l0vStC43t3s",
  authDomain: "teatime-vote.firebaseapp.com",
  projectId: "teatime-vote",
  storageBucket: "teatime-vote.firebasestorage.app",
  messagingSenderId: "1086661674493",
  appId: "1:1086661674493:web:986cd9d63acc73b275c594",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "my-teatime-app";

export default function App() {
  const [fbUser, setFbUser] = useState<any>(null);
  const [isDbReady, setIsDbReady] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("vote");
  const [currentUser, setCurrentUser] = useState<string>("");
  const [newUserName, setNewUserName] = useState<string>("");
  const [dialog, setDialog] = useState<any>({
    isOpen: false,
    type: "alert",
    message: "",
    onConfirm: null,
  });

  const [votes, setVotes] = useState<any>({});
  const [headerConfig, setHeaderConfig] = useState<any>({});
  const [drinkOptions, setDrinkOptions] = useState<any[]>([]);
  const [foodOptions, setFoodOptions] = useState<any[]>([]);
  const [optionUrls, setOptionUrls] = useState<any>({});
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);

  const [tempHeaderConfig, setTempHeaderConfig] = useState<any>({});
  const [isEditingHeader, setIsEditingHeader] = useState<boolean>(false);
  const [newDrinkName, setNewDrinkName] = useState<string>("");
  const [newDrinkUrl, setNewDrinkUrl] = useState<string>("");
  const [newFoodName, setNewFoodName] = useState<string>("");
  const [newFoodUrl, setNewFoodUrl] = useState<string>("");

  const users = Object.keys(votes);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, (user) => setFbUser(user));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!fbUser || !db) return;
    const stateDocRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "votingState",
      "currentState"
    );
    const unsubState = onSnapshot(stateDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setVotes(data.votes || {});
        setHeaderConfig(data.headerConfig || {});
        setDrinkOptions(data.drinkOptions || []);
        setFoodOptions(data.foodOptions || []);
        setOptionUrls(data.optionUrls || {});
        setIsDbReady(true);
      } else {
        setDoc(
          stateDocRef,
          {
            votes: { 翁瑞壕: { drinks: [], foods: [] } },
            headerConfig: {
              department: "2D一部",
              eventName: "第一次下午茶",
              eventDate: "2026-03-18",
              deadlineDate: "2026-03-16",
              notes:
                "外送限制：餐點皆請使用 Foodpanda 或 UberEats。\n發票資訊：抬頭請打「網銀國際股份有限公司職工福利委員會」，統編「39746822」。",
            },
            drinkOptions: ["烏弄", "八曜", "Mates", "大茗"],
            foodOptions: ["天使雞排", "自煮火鍋", "甜甜圈"],
            optionUrls: {},
          },
          { merge: true }
        ).then(() => setIsDbReady(true));
      }
    });

    const historyColRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "history"
    );
    const unsubHistory = onSnapshot(historyColRef, (snapshot) => {
      const recs: any[] = [];
      snapshot.forEach((doc) => recs.push({ id: doc.id, ...doc.data() }));
      recs.sort((a, b) => b.timestamp - a.timestamp);
      setHistoryRecords(recs);
    });
    return () => {
      unsubState();
      unsubHistory();
    };
  }, [fbUser]);

  const updateFirestore = async (updates: any) => {
    await setDoc(
      doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "votingState",
        "currentState"
      ),
      updates,
      { merge: true }
    );
  };

  const handleAddUser = async (e: any) => {
    e.preventDefault();
    const name = newUserName.trim();
    if (name && !votes[name]) {
      await updateFirestore({ [`votes.${name}`]: { drinks: [], foods: [] } });
      setCurrentUser(name);
      setNewUserName("");
    }
  };

  const toggleVote = async (category: any, option: any) => {
    if (!currentUser) return;
    const userVotes = votes[currentUser]?.[category] || [];
    const updated = userVotes.includes(option)
      ? userVotes.filter((i: any) => i !== option)
      : [...userVotes, option];
    await updateFirestore({ [`votes.${currentUser}.${category}`]: updated });
  };

  const handleDrinkSubmit = async (e: any) => {
    e.preventDefault();
    const name = newDrinkName.trim();
    if (!name) return;
    const urls = { ...optionUrls };
    if (newDrinkUrl) urls[name] = newDrinkUrl;
    await updateFirestore({
      drinkOptions: Array.from(new Set([...drinkOptions, name])),
      optionUrls: urls,
    });
    setNewDrinkName("");
    setNewDrinkUrl("");
  };

  const handleFoodSubmit = async (e: any) => {
    e.preventDefault();
    const name = newFoodName.trim();
    if (!name) return;
    const urls = { ...optionUrls };
    if (newFoodUrl) urls[name] = newFoodUrl;
    await updateFirestore({
      foodOptions: Array.from(new Set([...foodOptions, name])),
      optionUrls: urls,
    });
    setNewFoodName("");
    setNewFoodUrl("");
  };

  const calculateTotals = (category: any, options: any) => {
    const totals: any = {};
    options.forEach((opt: any) => {
      totals[opt] = 0;
    });
    Object.values(votes).forEach((v: any) => {
      if (v[category])
        v[category].forEach((i: any) => {
          if (totals[i] !== undefined) totals[i]++;
        });
    });
    return totals;
  };

  const drinkTotals = useMemo(
    () => calculateTotals("drinks", drinkOptions),
    [votes, drinkOptions]
  );
  const foodTotals = useMemo(
    () => calculateTotals("foods", foodOptions),
    [votes, foodOptions]
  );

  const topDrinks = useMemo(() => {
    const max = Math.max(...(Object.values(drinkTotals) as number[]), 0);
    return max === 0
      ? { items: [], votes: 0 }
      : {
          items: Object.keys(drinkTotals).filter((k) => drinkTotals[k] === max),
          votes: max,
        };
  }, [drinkTotals]);

  const topFoods = useMemo(() => {
    const max = Math.max(...(Object.values(foodTotals) as number[]), 0);
    return max === 0
      ? { items: [], votes: 0 }
      : {
          items: Object.keys(foodTotals).filter((k) => foodTotals[k] === max),
          votes: max,
        };
  }, [foodTotals]);

  const unvotedUsers = useMemo(
    () =>
      users.filter((u) => !votes[u].drinks?.length && !votes[u].foods?.length),
    [votes, users]
  );

  if (!isDbReady)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
        <Loader2 className="animate-spin text-emerald-500 w-12 h-12" />
        <p className="font-bold text-slate-500">
          正在同步 2D一部 下午茶資料...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* 標題區 */}
      <div className="bg-white border-b shadow-sm p-6 mb-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-800">
                  🎨 {headerConfig.department}
                </h1>
                <button
                  onClick={() => setIsEditingHeader(!isEditingHeader)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              <h2 className="text-lg text-slate-600 mt-1 font-bold">
                🍰 {headerConfig.eventName}
              </h2>
              <div className="flex gap-2 mt-3 text-[11px] font-bold">
                <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md border border-blue-100 flex items-center gap-1 shadow-sm">
                  🗓️ 活動日：{headerConfig.eventDate || "未設定"}
                </span>
                <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-md border border-rose-100 flex items-center gap-1 shadow-sm">
                  ⏳ 截單日：{headerConfig.deadlineDate || "未設定"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <div className="bg-sky-50 p-3 rounded-xl border border-sky-100 flex-1 md:flex-none md:min-w-[140px] shadow-sm">
                <p className="text-[10px] font-bold text-sky-700 flex items-center gap-1">
                  <Crown className="w-3 h-3" /> 飲料領先
                </p>
                <p className="text-sm font-bold truncate mt-1 text-sky-900">
                  {topDrinks.items.join(", ") || "尚未投票"}
                </p>
              </div>
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex-1 md:flex-none md:min-w-[140px] shadow-sm">
                <p className="text-[10px] font-bold text-orange-700 flex items-center gap-1">
                  <Crown className="w-3 h-3" /> 餐點領先
                </p>
                <p className="text-sm font-bold truncate mt-1 text-orange-900">
                  {topFoods.items.join(", ") || "尚未投票"}
                </p>
              </div>
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 flex-1 md:flex-none md:min-w-[140px] group relative cursor-help shadow-sm">
                <p className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                  <Users className="w-3 h-3" /> 未投人數
                </p>
                <p className="text-sm font-bold mt-1 text-slate-800">
                  {unvotedUsers.length} 人
                </p>
                <div className="hidden group-hover:block absolute top-full right-0 mt-2 p-3 bg-slate-800 text-white text-[10px] rounded-lg z-50 w-48 shadow-xl">
                  <p className="font-bold mb-1 border-b border-slate-600 pb-1">
                    尚未投票名單：
                  </p>
                  {unvotedUsers.join(", ") || "大家都投完囉！👍"}
                </div>
              </div>
            </div>
          </div>

          {/* 注意事項 */}
          {headerConfig.notes && (
            <div className="mt-6 p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[13px] text-amber-900 leading-relaxed">
                <p className="font-bold mb-1">📌 點餐注意事項：</p>
                <p className="whitespace-pre-wrap opacity-80">
                  {headerConfig.notes}
                </p>
              </div>
            </div>
          )}

          {/* 快速編輯面板 */}
          {isEditingHeader && (
            <div className="mt-6 p-5 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 animate-in zoom-in-95">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">
                    部門/活動名稱
                  </label>
                  <input
                    type="text"
                    value={headerConfig.department}
                    onChange={(e) =>
                      updateFirestore({
                        "headerConfig.department": e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">
                    日期設定
                  </label>
                  <input
                    type="date"
                    value={headerConfig.eventDate}
                    onChange={(e) =>
                      updateFirestore({
                        "headerConfig.eventDate": e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500">
                    注意事項內容
                  </label>
                  <textarea
                    value={headerConfig.notes}
                    onChange={(e) =>
                      updateFirestore({ "headerConfig.notes": e.target.value })
                    }
                    className="w-full p-2 border rounded-lg text-sm h-10"
                  />
                </div>
              </div>
              <button
                onClick={() => setIsEditingHeader(false)}
                className="mt-4 w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold"
              >
                關閉編輯面板
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {/* 切換頁籤 */}
        <div className="flex bg-slate-200/50 p-1 rounded-xl mb-6 w-fit shadow-inner">
          <button
            onClick={() => setActiveTab("vote")}
            className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === "vote"
                ? "bg-white text-emerald-700 shadow-md"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            個人投票區
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === "summary"
                ? "bg-white text-emerald-700 shadow-md"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            統計總表
          </button>
        </div>

        {activeTab === "vote" ? (
          <div className="space-y-6">
            {/* 姓名選擇 */}
            <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row gap-3">
              <select
                value={currentUser}
                onChange={(e) => setCurrentUser(e.target.value)}
                className="flex-1 p-3 bg-slate-50 border-none rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 transition-all"
              >
                <option value="" disabled>
                  -- 點擊選擇您的姓名 --
                </option>
                {users.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <form onSubmit={handleAddUser} className="flex gap-2">
                <input
                  type="text"
                  placeholder="新增成員..."
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full sm:w-32 p-3 border rounded-xl text-sm"
                />
                <button
                  type="submit"
                  className="p-3 bg-slate-800 text-white rounded-xl hover:bg-black transition-colors shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </form>
            </div>

            {currentUser ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                {/* 飲料區 */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-sky-50 px-6 py-5 border-b font-bold text-sky-900 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-lg">
                      <Coffee className="w-6 h-6" /> 飲料區
                    </span>
                  </div>
                  <div className="p-6 grid grid-cols-2 gap-4 flex-1">
                    {drinkOptions.map((d) => (
                      <div
                        key={d}
                        onClick={() => toggleVote("drinks", d)}
                        className={`group relative p-4 rounded-2xl border-2 text-sm font-black cursor-pointer transition-all ${
                          votes[currentUser]?.drinks?.includes(d)
                            ? "border-sky-500 bg-sky-50 text-sky-700 shadow-md translate-y-[-2px]"
                            : "border-slate-50 hover:border-sky-100 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              votes[currentUser]?.drinks?.includes(d)
                                ? "bg-sky-500 border-sky-500 rotate-[360deg]"
                                : "border-slate-200"
                            }`}
                          >
                            {votes[currentUser]?.drinks?.includes(d) && (
                              <Check
                                className="w-3.5 h-3.5 text-white"
                                strokeWidth={5}
                              />
                            )}
                          </div>
                          {d}
                        </div>
                        {optionUrls[d] && (
                          <a
                            href={optionUrls[d]}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-2 right-2 p-2 hover:bg-sky-200 rounded-full text-sky-300 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  <form
                    onSubmit={handleDrinkSubmit}
                    className="p-6 border-t bg-slate-50/30 space-y-3"
                  >
                    <input
                      type="text"
                      placeholder="店家名稱..."
                      value={newDrinkName}
                      onChange={(e) => setNewDrinkName(e.target.value)}
                      className="w-full p-3 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="菜單連結 (選填)"
                        value={newDrinkUrl}
                        onChange={(e) => setNewDrinkUrl(e.target.value)}
                        className="flex-1 p-3 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                      <button
                        type="submit"
                        className="px-5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 shadow-md transition-all"
                      >
                        <Plus />
                      </button>
                    </div>
                  </form>
                </div>

                {/* 餐點區 */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-orange-50 px-6 py-5 border-b font-bold text-orange-900 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-lg">
                      <Pizza className="w-6 h-6" /> 餐點區
                    </span>
                  </div>
                  <div className="p-6 grid grid-cols-2 gap-4 flex-1">
                    {foodOptions.map((f) => (
                      <div
                        key={f}
                        onClick={() => toggleVote("foods", f)}
                        className={`group relative p-4 rounded-2xl border-2 text-sm font-black cursor-pointer transition-all ${
                          votes[currentUser]?.foods?.includes(f)
                            ? "border-orange-500 bg-orange-50 text-orange-700 shadow-md translate-y-[-2px]"
                            : "border-slate-50 hover:border-orange-100 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              votes[currentUser]?.foods?.includes(f)
                                ? "bg-orange-500 border-orange-500 rotate-[360deg]"
                                : "border-slate-200"
                            }`}
                          >
                            {votes[currentUser]?.foods?.includes(f) && (
                              <Check
                                className="w-3.5 h-3.5 text-white"
                                strokeWidth={5}
                              />
                            )}
                          </div>
                          {f}
                        </div>
                        {optionUrls[f] && (
                          <a
                            href={optionUrls[f]}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-2 right-2 p-2 hover:bg-orange-200 rounded-full text-orange-300 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  <form
                    onSubmit={handleFoodSubmit}
                    className="p-6 border-t bg-slate-50/30 space-y-3"
                  >
                    <input
                      type="text"
                      placeholder="食物名稱..."
                      value={newFoodName}
                      onChange={(e) => setNewFoodName(e.target.value)}
                      className="w-full p-3 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="菜單連結 (選填)"
                        value={newFoodUrl}
                        onChange={(e) => setNewFoodUrl(e.target.value)}
                        className="flex-1 p-3 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                      <button
                        type="submit"
                        className="px-5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 shadow-md transition-all"
                      >
                        <Plus />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="text-center p-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 animate-pulse">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="font-bold text-lg">
                  下午茶小天使你好！請先在上方選擇您的姓名來點餐 ✨
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
              <div className="bg-slate-800 p-5 px-8 flex justify-between items-center text-white">
                <h3 className="font-black flex items-center gap-2 text-lg">
                  <Table className="w-6 h-6" /> 飲料統計總表
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full border border-white/20">
                  即時更新中
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="p-5 text-left font-black text-slate-700 sticky left-0 bg-slate-50 z-10 border-r w-[120px]">
                        姓名
                      </th>
                      {drinkOptions.map((o) => (
                        <th
                          key={o}
                          className="p-4 text-center font-bold text-slate-500 min-w-[100px] border-r border-slate-100 last:border-none"
                        >
                          {o}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u}
                        className="border-b last:border-none hover:bg-sky-50/30 transition-colors"
                      >
                        <td className="p-4 px-5 font-black text-slate-800 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.02)] z-10 border-r">
                          {u}
                        </td>
                        {drinkOptions.map((o) => (
                          <td
                            key={o}
                            className="p-4 text-center border-r border-slate-100 last:border-none"
                          >
                            {votes[u]?.drinks?.includes(o) ? (
                              <div className="flex items-center justify-center">
                                <Check
                                  className="text-emerald-500 w-6 h-6"
                                  strokeWidth={4}
                                />
                              </div>
                            ) : (
                              <span className="opacity-10">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-sky-50/50 font-black border-t-2 border-sky-100">
                      <td className="p-5 text-sky-900 sticky left-0 bg-sky-50 shadow-sm z-10 border-r">
                        數量合計
                      </td>
                      {drinkOptions.map((o) => (
                        <td
                          key={o}
                          className="p-4 text-center text-sky-600 text-lg"
                        >
                          {drinkTotals[o] || 0}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
              <div className="bg-slate-800 p-5 px-8 flex justify-between items-center text-white">
                <h3 className="font-black flex items-center gap-2 text-lg">
                  <UtensilsCrossed className="w-6 h-6" /> 餐點統計總表
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full border border-white/20">
                  即時更新中
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="p-5 text-left font-black text-slate-700 sticky left-0 bg-slate-50 z-10 border-r w-[120px]">
                        姓名
                      </th>
                      {foodOptions.map((o) => (
                        <th
                          key={o}
                          className="p-4 text-center font-bold text-slate-500 min-w-[100px] border-r border-slate-100 last:border-none"
                        >
                          {o}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u}
                        className="border-b last:border-none hover:bg-orange-50/30 transition-colors"
                      >
                        <td className="p-4 px-5 font-black text-slate-800 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.02)] z-10 border-r">
                          {u}
                        </td>
                        {foodOptions.map((o) => (
                          <td
                            key={o}
                            className="p-4 text-center border-r border-slate-100 last:border-none"
                          >
                            {votes[u]?.foods?.includes(o) ? (
                              <div className="flex items-center justify-center">
                                <Check
                                  className="text-emerald-500 w-6 h-6"
                                  strokeWidth={4}
                                />
                              </div>
                            ) : (
                              <span className="opacity-10">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-orange-50/50 font-black border-t-2 border-orange-100">
                      <td className="p-5 text-orange-900 sticky left-0 bg-orange-50 shadow-sm z-10 border-r">
                        數量合計
                      </td>
                      {foodOptions.map((o) => (
                        <td
                          key={o}
                          className="p-4 text-center text-orange-600 text-lg"
                        >
                          {foodTotals[o] || 0}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
