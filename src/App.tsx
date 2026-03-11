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
  "冰沙",
  "鬆餅",
  "章魚燒",
  "銅鑼燒",
  "蛋糕",
  "瑪德蓮",
  "披薩",
  "豪華泡麵",
];
const INITIAL_VOTES: any = {
  翁瑞壕: { drinks: [], foods: [] },
  楊采蓁: { drinks: [], foods: [] },
};

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
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
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
            votes: INITIAL_VOTES,
            headerConfig: {
              department: "2D一部",
              eventName: "第一次下午茶",
              eventDate: "2026-03-18",
              deadlineDate: "2026-03-16",
              notes: "外送限制：餐點皆請使用 Foodpanda 或 UberEats...",
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
    const docRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "votingState",
      "currentState"
    );
    await setDoc(docRef, updates, { merge: true });
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
    const newUrls = { ...optionUrls };
    if (newDrinkUrl.trim()) newUrls[name] = newDrinkUrl.trim();
    await updateFirestore({
      drinkOptions: [...drinkOptions, name],
      optionUrls: newUrls,
    });
    setNewDrinkName("");
    setNewDrinkUrl("");
  };

  const handleFoodSubmit = async (e: any) => {
    e.preventDefault();
    const name = newFoodName.trim();
    if (!name) return;
    const newUrls = { ...optionUrls };
    if (newFoodUrl.trim()) newUrls[name] = newFoodUrl.trim();
    await updateFirestore({
      foodOptions: [...foodOptions, name],
      optionUrls: newUrls,
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

  const getTopItems = (totals: any) => {
    const max = Math.max(...(Object.values(totals) as number[]), 0);
    if (max === 0) return { items: [], votes: 0 };
    return {
      items: Object.keys(totals).filter((k) => totals[k] === max),
      votes: max,
    };
  };

  const topDrinks = useMemo(() => getTopItems(drinkTotals), [drinkTotals]);
  const topFoods = useMemo(() => getTopItems(foodTotals), [foodTotals]);
  const unvotedUsers = useMemo(
    () =>
      users.filter((u) => !votes[u].drinks?.length && !votes[u].foods?.length),
    [votes, users]
  );

  if (!isDbReady)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-emerald-500" />
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="bg-white border-b shadow-sm p-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🎨 {headerConfig.department}</h1>
            <h2 className="text-lg text-slate-600 mt-1">
              🍰 {headerConfig.eventName}
            </h2>
          </div>
          <div className="flex gap-4 text-center">
            <div className="bg-sky-50 p-2 px-4 rounded-lg border border-sky-100">
              <p className="text-xs font-bold text-sky-700">🥤 飲料領先</p>
              <p className="text-sm font-bold truncate max-w-[150px]">
                {topDrinks.items.join(", ") || "尚未投票"}
              </p>
            </div>
            <div className="bg-orange-50 p-2 px-4 rounded-lg border border-orange-100">
              <p className="text-xs font-bold text-orange-700">🍗 餐點領先</p>
              <p className="text-sm font-bold truncate max-w-[150px]">
                {topFoods.items.join(", ") || "尚未投票"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6">
        <div className="flex bg-slate-200/50 p-1 rounded-xl mb-6 w-fit">
          <button
            onClick={() => setActiveTab("vote")}
            className={`px-6 py-2 rounded-lg text-sm font-medium ${
              activeTab === "vote"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600"
            }`}
          >
            個人投票
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-6 py-2 rounded-lg text-sm font-medium ${
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
            <div className="bg-white p-5 rounded-xl border flex gap-3">
              <select
                value={currentUser}
                onChange={(e) => setCurrentUser(e.target.value)}
                className="flex-1 p-2 border rounded-lg"
              >
                <option value="" disabled>
                  -- 點擊選擇姓名 --
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
                  placeholder="新增姓名"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-32 p-2 border rounded-lg"
                />
                <button
                  type="submit"
                  className="p-2 bg-slate-800 text-white rounded-lg"
                >
                  <Plus />
                </button>
              </form>
            </div>

            {currentUser && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="bg-sky-50 p-4 border-b font-bold flex items-center gap-2">
                    <Coffee /> 飲料投票
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    {drinkOptions.map((d) => (
                      <div
                        key={d}
                        onClick={() => toggleVote("drinks", d)}
                        className={`relative p-3 rounded-lg border-2 text-sm font-bold cursor-pointer transition-all ${
                          votes[currentUser]?.drinks?.includes(d)
                            ? "border-sky-500 bg-sky-50 text-sky-700"
                            : "border-slate-100 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded-full border-2 ${
                              votes[currentUser]?.drinks?.includes(d)
                                ? "bg-sky-500 border-sky-500"
                                : "border-slate-300"
                            }`}
                          ></div>
                          {d}
                        </div>
                        {optionUrls[d] && (
                          <a
                            href={optionUrls[d]}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-2 right-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="bg-orange-50 p-4 border-b font-bold flex items-center gap-2">
                    <Pizza /> 餐點投票
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    {foodOptions.map((f) => (
                      <div
                        key={f}
                        onClick={() => toggleVote("foods", f)}
                        className={`relative p-3 rounded-lg border-2 text-sm font-bold cursor-pointer transition-all ${
                          votes[currentUser]?.foods?.includes(f)
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-slate-100 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded-full border-2 ${
                              votes[currentUser]?.foods?.includes(f)
                                ? "bg-orange-500 border-orange-500"
                                : "border-slate-300"
                            }`}
                          ></div>
                          {f}
                        </div>
                        {optionUrls[f] && (
                          <a
                            href={optionUrls[f]}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-2 right-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="bg-slate-50 p-4 border-b font-bold">
              飲料統計總表
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tr className="bg-slate-100 border-b">
                  <th className="p-3 text-left">姓名</th>
                  {drinkOptions.map((o) => (
                    <th key={o} className="p-3 text-center">
                      {o}
                    </th>
                  ))}
                </tr>
                {users.map((u) => (
                  <tr key={u} className="border-b">
                    <td className="p-3 font-medium">{u}</td>
                    {drinkOptions.map((o) => (
                      <td key={o} className="p-3 text-center">
                        {votes[u]?.drinks?.includes(o) ? (
                          <Check className="mx-auto text-emerald-500" />
                        ) : (
                          "-"
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
