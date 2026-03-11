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

// 初始預設值
const INITIAL_DRINK_OPTIONS = [
  "烏弄",
  "八曜",
  "Mates",
  "大茗",
  "特好喝",
  "南海茶道",
];
const INITIAL_FOOD_OPTIONS = [
  "天使雞排",
  "自煮火鍋",
  "烙餅",
  "甜甜圈",
  "泡芙",
  "KFC炸雞",
  "打鐵豆花",
  "鬆餅",
  "章魚燒",
];

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

  // 編輯暫存狀態
  const [tempHeaderConfig, setTempHeaderConfig] = useState<any>({});
  const [isEditingHeader, setIsEditingHeader] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [newDrinkName, setNewDrinkName] = useState<string>("");
  const [newDrinkUrl, setNewDrinkUrl] = useState<string>("");
  const [newFoodName, setNewFoodName] = useState<string>("");
  const [newFoodUrl, setNewFoodUrl] = useState<string>("");
  const [editingDrink, setEditingDrink] = useState<any>(null);
  const [editingFood, setEditingFood] = useState<any>(null);

  const users = Object.keys(votes);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsub = onAuthStateChanged(auth, (user) => setFbUser(user));
    return () => unsub();
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
              notes: "請確認統編資訊。",
            },
            drinkOptions: INITIAL_DRINK_OPTIONS,
            foodOptions: INITIAL_FOOD_OPTIONS,
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
    const current = votes[currentUser]?.[category] || [];
    const updated = current.includes(option)
      ? current.filter((i: any) => i !== option)
      : [...current, option];
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

  const SummaryTable = ({
    title,
    icon: Icon,
    options,
    category,
    totals,
    colorClass,
    bgClass,
  }: any) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
      <div className={`px-4 py-3 flex items-center gap-2 border-b ${bgClass}`}>
        <Icon className={`w-5 h-5 ${colorClass}`} />
        <h3 className={`font-bold ${colorClass}`}>{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="px-4 py-3 font-semibold text-slate-700 sticky left-0 bg-slate-100 z-10">
                姓名
              </th>
              {options.map((opt: any) => (
                <th
                  key={opt}
                  className="px-3 py-3 font-semibold text-center min-w-[80px]"
                >
                  {opt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user} className="border-b hover:bg-slate-50">
                <td className="px-4 py-2 font-medium sticky left-0 bg-white shadow-sm z-10">
                  {user}
                </td>
                {options.map((opt: any) => (
                  <td
                    key={opt}
                    className="px-3 py-2 text-center border-r last:border-0"
                  >
                    {votes[user]?.[category]?.includes(opt) ? (
                      <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                    ) : (
                      "-"
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-bold">
              <td className="px-4 py-3 sticky left-0 bg-slate-100 z-10">
                總計
              </td>
              {options.map((opt: any) => (
                <td key={opt} className="px-3 py-3 text-center">
                  {totals[opt]}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  if (!isDbReady)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-emerald-500" />
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* 頂部標題與戰況 */}
      <div className="bg-white border-b shadow-sm p-6 mb-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 justify-center md:justify-start">
              🎨 {headerConfig.department}
            </h1>
            <h2 className="text-lg text-slate-600 mt-1 flex items-center gap-2 justify-center md:justify-start">
              🍰 {headerConfig.eventName}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
            <div className="bg-sky-50 p-3 rounded-xl border border-sky-100 min-w-[120px]">
              <p className="text-[10px] font-bold text-sky-700 uppercase">
                🥤 飲料領先
              </p>
              <p className="text-sm font-bold truncate mt-1">
                {topDrinks.items.join(", ") || "尚未投票"}
              </p>
            </div>
            <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 min-w-[120px]">
              <p className="text-[10px] font-bold text-orange-700 uppercase">
                🍗 餐點領先
              </p>
              <p className="text-sm font-bold truncate mt-1">
                {topFoods.items.join(", ") || "尚未投票"}
              </p>
            </div>
            <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 hidden sm:block">
              <p className="text-[10px] font-bold text-slate-500 uppercase">
                👥 未投人數
              </p>
              <p className="text-sm font-bold mt-1">
                {
                  users.filter(
                    (u) => !votes[u].drinks?.length && !votes[u].foods?.length
                  ).length
                }{" "}
                人
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {/* 分頁切換 */}
        <div className="flex bg-slate-200/50 p-1 rounded-xl mb-6 w-fit">
          <button
            onClick={() => setActiveTab("vote")}
            className={`px-8 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "vote"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600"
            }`}
          >
            個人投票區
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-8 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "summary"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600"
            }`}
          >
            統計總表
          </button>
        </div>

        {activeTab === "vote" ? (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border flex flex-col sm:flex-row gap-3 shadow-sm">
              <select
                value={currentUser}
                onChange={(e) => setCurrentUser(e.target.value)}
                className="flex-1 p-3 bg-slate-50 border-none rounded-lg font-medium"
              >
                <option value="" disabled>
                  -- 請選擇您的姓名 --
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
                  placeholder="新增姓名..."
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full sm:w-32 p-3 border rounded-lg text-sm"
                />
                <button
                  type="submit"
                  className="p-3 bg-slate-800 text-white rounded-lg"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </form>
            </div>

            {currentUser && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 飲料區 */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-sky-50 px-5 py-4 border-b font-bold text-sky-900 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Coffee className="w-5 h-5" /> 飲料投票
                    </span>
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-3">
                    {drinkOptions.map((d) => (
                      <div
                        key={d}
                        onClick={() => toggleVote("drinks", d)}
                        className={`relative p-4 rounded-xl border-2 text-sm font-bold cursor-pointer transition-all ${
                          votes[currentUser]?.drinks?.includes(d)
                            ? "border-sky-500 bg-sky-50 text-sky-700 shadow-inner"
                            : "border-slate-100 hover:border-sky-200 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              votes[currentUser]?.drinks?.includes(d)
                                ? "bg-sky-500 border-sky-500"
                                : "border-slate-300"
                            }`}
                          >
                            {votes[currentUser]?.drinks?.includes(d) && (
                              <Check
                                className="w-3 h-3 text-white"
                                strokeWidth={4}
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
                            className="absolute top-2 right-2 p-1.5 hover:bg-sky-100 rounded-full text-sky-400"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  <form
                    onSubmit={handleDrinkSubmit}
                    className="p-5 border-t bg-slate-50/50 flex flex-col gap-2"
                  >
                    <input
                      type="text"
                      placeholder="新增飲料選項..."
                      value={newDrinkName}
                      onChange={(e) => setNewDrinkName(e.target.value)}
                      className="w-full p-2.5 border rounded-lg text-sm bg-white"
                    />
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="菜單網址 (選填)"
                        value={newDrinkUrl}
                        onChange={(e) => setNewDrinkUrl(e.target.value)}
                        className="flex-1 p-2.5 border rounded-lg text-sm bg-white"
                      />
                      <button
                        type="submit"
                        className="px-4 bg-sky-600 text-white rounded-lg"
                      >
                        <Plus />
                      </button>
                    </div>
                  </form>
                </div>

                {/* 餐點區 */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-orange-50 px-5 py-4 border-b font-bold text-orange-900 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Pizza className="w-5 h-5" /> 餐點投票
                    </span>
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-3">
                    {foodOptions.map((f) => (
                      <div
                        key={f}
                        onClick={() => toggleVote("foods", f)}
                        className={`relative p-4 rounded-xl border-2 text-sm font-bold cursor-pointer transition-all ${
                          votes[currentUser]?.foods?.includes(f)
                            ? "border-orange-500 bg-orange-50 text-orange-700 shadow-inner"
                            : "border-slate-100 hover:border-orange-200 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              votes[currentUser]?.foods?.includes(f)
                                ? "bg-orange-500 border-orange-500"
                                : "border-slate-300"
                            }`}
                          >
                            {votes[currentUser]?.foods?.includes(f) && (
                              <Check
                                className="w-3 h-3 text-white"
                                strokeWidth={4}
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
                            className="absolute top-2 right-2 p-1.5 hover:bg-orange-100 rounded-full text-orange-400"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  <form
                    onSubmit={handleFoodSubmit}
                    className="p-5 border-t bg-slate-50/50 flex flex-col gap-2"
                  >
                    <input
                      type="text"
                      placeholder="新增餐點選項..."
                      value={newFoodName}
                      onChange={(e) => setNewFoodName(e.target.value)}
                      className="w-full p-2.5 border rounded-lg text-sm bg-white"
                    />
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="菜單網址 (選填)"
                        value={newFoodUrl}
                        onChange={(e) => setNewFoodUrl(e.target.value)}
                        className="flex-1 p-2.5 border rounded-lg text-sm bg-white"
                      />
                      <button
                        type="submit"
                        className="px-4 bg-orange-600 text-white rounded-lg"
                      >
                        <Plus />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <SummaryTable
              title="飲料投票明細"
              icon={Coffee}
              options={drinkOptions}
              category="drinks"
              totals={drinkTotals}
              colorClass="text-sky-800"
              bgClass="bg-sky-50"
            />
            <SummaryTable
              title="餐點投票明細"
              icon={Pizza}
              options={foodOptions}
              category="foods"
              totals={foodTotals}
              colorClass="text-orange-800"
              bgClass="bg-orange-50"
            />
          </div>
        )}
      </div>
    </div>
  );
}
