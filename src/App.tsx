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
// ------------------------------

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
  翁瑞壕: {
    drinks: ["烏弄", "八曜", "Mates", "大茗", "特好喝", "南海茶道"],
    foods: ["天使雞排", "烙餅", "泡芙"],
  },
  吳柏浩: { drinks: [], foods: [] },
  張曉涵: {
    drinks: ["烏弄", "八曜", "Mates", "大茗"],
    foods: ["天使雞排", "泡芙", "打鐵豆花", "鬆餅", "章魚燒", "蛋糕", "披薩"],
  },
  張楓聖: {
    drinks: ["烏弄", "八曜", "Mates", "大茗", "特好喝", "南海茶道"],
    foods: ["打鐵豆花", "冰沙"],
  },
  周廷恩: { drinks: [], foods: [] },
  殷于喬: {
    drinks: ["烏弄", "八曜", "Mates", "大茗", "特好喝", "南海茶道"],
    foods: ["天使雞排", "自煮火鍋", "烙餅", "泡芙", "打鐵豆花"],
  },
  楊采蓁: {
    drinks: ["八曜", "Mates"],
    foods: ["天使雞排", "甜甜圈", "泡芙", "打鐵豆花"],
  },
  黃培韶: { drinks: [], foods: [] },
  陳心怡: {
    drinks: ["八曜", "Mates", "大茗"],
    foods: ["天使雞排", "打鐵豆花", "鬆餅", "披薩"],
  },
  林晏如: {
    drinks: ["南海茶道"],
    foods: [
      "天使雞排",
      "甜甜圈",
      "打鐵豆花",
      "章魚燒",
      "銅鑼燒",
      "蛋糕",
      "披薩",
    ],
  },
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
  const [isEditingUser, setIsEditingUser] = useState<boolean>(false);
  const [editUserName, setEditUserName] = useState<string>("");
  const [newDrinkName, setNewDrinkName] = useState<string>("");
  const [newDrinkUrl, setNewDrinkUrl] = useState<string>("");
  const [newFoodName, setNewFoodName] = useState<string>("");
  const [newFoodUrl, setNewFoodUrl] = useState<string>("");
  const [editingDrink, setEditingDrink] = useState<any>(null);
  const [editingFood, setEditingFood] = useState<any>(null);

  const users = Object.keys(votes);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
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
              notes:
                "外送限制：餐點皆請使用 Foodpanda 或 UberEats...\n發票資訊：抬頭請打「網銀國際...」",
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
      const records: any[] = [];
      snapshot.forEach((doc) => records.push({ id: doc.id, ...doc.data() }));
      records.sort((a, b) => b.timestamp - a.timestamp);
      setHistoryRecords(records);
    });

    return () => {
      unsubState();
      unsubHistory();
    };
  }, [fbUser]);

  const updateFirestore = async (updates: any) => {
    if (!fbUser || !db) return;
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

  const showAlert = (message: any) =>
    setDialog({ isOpen: true, type: "alert", message, onConfirm: null });
  const showConfirm = (message: any, onConfirm: any) =>
    setDialog({ isOpen: true, type: "confirm", message, onConfirm });
  const closeDialog = () =>
    setDialog((prev: any) => ({ ...prev, isOpen: false }));

  const formatDisplayDate = (dateStr: any, style = "underscore") => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
    const weekDay = weekDays[d.getDay()];
    return style === "brackets"
      ? `${month}/${day}(${weekDay})`
      : `${month}/${day}_${weekDay}`;
  };

  const saveToHistory = () => {
    const recordName = `${headerConfig.department}_${headerConfig.eventName}`;
    showConfirm(`確定要將目前的投票狀態儲存嗎？`, async () => {
      const colRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "history"
      );
      const docRef = doc(colRef, Date.now().toString());
      await setDoc(docRef, {
        name: recordName,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
        headerConfig,
        votes,
        drinkOptions,
        foodOptions,
        optionUrls,
      });
      showAlert("已成功同步存檔至雲端！");
    });
  };

  const loadHistory = (record: any) => {
    showConfirm(`確定要載入「${record.name}」嗎？`, async () => {
      await updateFirestore({
        headerConfig: record.headerConfig,
        votes: record.votes,
        drinkOptions: record.drinkOptions || INITIAL_DRINK_OPTIONS,
        foodOptions: record.foodOptions || INITIAL_FOOD_OPTIONS,
        optionUrls: record.optionUrls || {},
      });
      setShowHistoryModal(false);
      setCurrentUser("");
    });
  };

  const deleteHistory = (id: any, e: any) => {
    e.stopPropagation();
    showConfirm("確定要永久刪除這筆歷史紀錄嗎？", async () => {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "history",
        id
      );
      await deleteDoc(docRef);
    });
  };

  const startNewVoting = () => {
    showConfirm("這將清除所有人畫面上的投票資料，確定嗎？", async () => {
      const emptyVotes: any = {};
      Object.keys(votes).forEach((user) => {
        emptyVotes[user] = { drinks: [], foods: [] };
      });
      await updateFirestore({
        votes: emptyVotes,
        headerConfig: {
          ...headerConfig,
          eventName: "新下午茶活動",
          eventDate: "",
          deadlineDate: "",
        },
      });
      setShowHistoryModal(false);
      setCurrentUser("");
    });
  };

  const toggleVote = async (category: any, option: any) => {
    if (!currentUser) return;
    const userVotes = votes[currentUser][category] || [];
    const updatedCategoryVotes = userVotes.includes(option)
      ? userVotes.filter((item: any) => item !== option)
      : [...userVotes, option];

    await updateFirestore({
      [`votes.${currentUser}.${category}`]: updatedCategoryVotes,
    });
  };

  const handleAddUser = async (e: any) => {
    e.preventDefault();
    const trimmedName = newUserName.trim();
    if (trimmedName && !votes[trimmedName]) {
      await updateFirestore({
        [`votes.${trimmedName}`]: { drinks: [], foods: [] },
      });
      setCurrentUser(trimmedName);
      setNewUserName("");
    }
  };

  const handleDeleteUser = () => {
    if (!currentUser) return;
    showConfirm(`確定要刪除成員「${currentUser}」嗎？`, async () => {
      const newVotes = { ...votes };
      delete newVotes[currentUser];
      await updateFirestore({ votes: newVotes });
      setCurrentUser("");
    });
  };

  const startEditUser = () => {
    setEditUserName(currentUser);
    setIsEditingUser(true);
  };

  const saveEditUser = async () => {
    const trimmed = editUserName.trim();
    if (!trimmed) return setIsEditingUser(false);
    if (trimmed !== currentUser && votes[trimmed]) {
      return showAlert("此姓名已存在！");
    }
    if (trimmed !== currentUser) {
      const newVotes: any = {};
      Object.keys(votes).forEach((key) => {
        newVotes[key === currentUser ? trimmed : key] = votes[key];
      });
      await updateFirestore({ votes: newVotes });
      setCurrentUser(trimmed);
    }
    setIsEditingUser(false);
  };

  const startEditHeader = () => {
    setTempHeaderConfig(headerConfig);
    setIsEditingHeader(true);
  };

  const saveHeader = async () => {
    await updateFirestore({ headerConfig: tempHeaderConfig });
    setIsEditingHeader(false);
  };

  const handleDrinkSubmit = async (e: any) => {
    e.preventDefault();
    const trimmedName = newDrinkName.trim();
    const trimmedUrl = newDrinkUrl.trim();
    if (!trimmedName) return;

    if (editingDrink) {
      const newOptions = drinkOptions.map((d: any) =>
        d === editingDrink ? trimmedName : d
      );
      const newUrls = { ...optionUrls };
      if (trimmedName !== editingDrink) delete newUrls[editingDrink];
      if (trimmedUrl) newUrls[trimmedName] = trimmedUrl;
      else delete newUrls[trimmedName];

      const updates: any = { drinkOptions: newOptions, optionUrls: newUrls };
      if (trimmedName !== editingDrink) {
        const newVotes: any = {};
        Object.keys(votes).forEach((user) => {
          newVotes[user] = {
            ...votes[user],
            drinks: (votes[user].drinks || []).map((d: any) =>
              d === editingDrink ? trimmedName : d
            ),
          };
        });
        updates.votes = newVotes;
      }
      await updateFirestore(updates);
      setEditingDrink(null);
      setNewDrinkName("");
      setNewDrinkUrl("");
    } else {
      const newUrls = { ...optionUrls };
      if (trimmedUrl) newUrls[trimmedName] = trimmedUrl;
      await updateFirestore({
        drinkOptions: [...drinkOptions, trimmedName],
        optionUrls: newUrls,
      });
      setNewDrinkName("");
      setNewDrinkUrl("");
    }
  };

  const handleFoodSubmit = async (e: any) => {
    e.preventDefault();
    const trimmedName = newFoodName.trim();
    const trimmedUrl = newFoodUrl.trim();
    if (!trimmedName) return;

    if (editingFood) {
      const newOptions = foodOptions.map((f: any) =>
        f === editingFood ? trimmedName : f
      );
      const newUrls = { ...optionUrls };
      if (trimmedName !== editingFood) delete newUrls[editingFood];
      if (trimmedUrl) newUrls[trimmedName] = trimmedUrl;
      else delete newUrls[trimmedName];

      const updates: any = { foodOptions: newOptions, optionUrls: newUrls };
      if (trimmedName !== editingFood) {
        const newVotes: any = {};
        Object.keys(votes).forEach((user) => {
          newVotes[user] = {
            ...votes[user],
            foods: (votes[user].foods || []).map((f: any) =>
              f === editingFood ? trimmedName : f
            ),
          };
        });
        updates.votes = newVotes;
      }
      await updateFirestore(updates);
      setEditingFood(null);
      setNewFoodName("");
      setNewFoodUrl("");
    } else {
      const newUrls = { ...optionUrls };
      if (trimmedUrl) newUrls[trimmedName] = trimmedUrl;
      await updateFirestore({
        foodOptions: [...foodOptions, trimmedName],
        optionUrls: newUrls,
      });
      setNewFoodName("");
      setNewFoodUrl("");
    }
  };

  const calculateTotals = (category: any, options: any) => {
    const totals: any = {};
    options.forEach((opt: any) => {
      totals[opt] = 0;
    });
    Object.values(votes).forEach((userVote: any) => {
      if (userVote[category]) {
        userVote[category].forEach((item: any) => {
          if (totals[item] !== undefined) totals[item]++;
        });
      }
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

  const getTopItems = (totalsObj: any) => {
    const vals: any[] = Object.values(totalsObj);
    const maxVotes = Math.max(...vals, 0);
    if (maxVotes === 0) return { items: [], votes: 0 };
    const items = Object.keys(totalsObj).filter(
      (key) => totalsObj[key] === maxVotes
    );
    return { items, votes: maxVotes };
  };

  const topDrinks = useMemo(() => getTopItems(drinkTotals), [drinkTotals]);
  const topFoods = useMemo(() => getTopItems(foodTotals), [foodTotals]);

  const unvotedUsers = useMemo(() => {
    return users.filter(
      (user) =>
        (!votes[user].drinks || votes[user].drinks.length === 0) &&
        (!votes[user].foods || votes[user].foods.length === 0)
    );
  }, [votes, users]);

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
      <div
        className={`px-4 py-3 flex items-center gap-2 border-b border-slate-200 ${bgClass}`}
      >
        <Icon className={`w-5 h-5 ${colorClass}`} />
        <h3 className={`font-bold ${colorClass}`}>{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 font-semibold text-slate-700 sticky left-0 bg-slate-100 border-r border-slate-200 z-10 w-24">
                姓名
              </th>
              {options.map((opt: any) => (
                <th
                  key={opt}
                  className="px-3 py-3 font-semibold text-slate-600 text-center border-r border-slate-100 last:border-0 min-w-[80px]"
                >
                  {opt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-2 font-medium text-slate-700 sticky left-0 bg-white shadow-[1px_0_0_0_#e2e8f0] z-10">
                  {user}
                </td>
                {options.map((opt: any) => (
                  <td
                    key={opt}
                    className="px-3 py-2 text-center border-r border-slate-100 last:border-0"
                  >
                    {votes[user]?.[category]?.includes(opt) ? (
                      <Check
                        className="w-5 h-5 text-emerald-500 mx-auto"
                        strokeWidth={3}
                      />
                    ) : (
                      <span className="text-slate-200">-</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-sky-50 font-bold">
              <td className="px-4 py-3 text-sky-800 sticky left-0 bg-sky-100 border-r border-sky-200 z-10">
                總計
              </td>
              {options.map((opt: any) => (
                <td
                  key={opt}
                  className="px-3 py-3 text-center text-sky-700 border-r border-sky-100 last:border-0"
                >
                  {totals[opt]}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-600 font-bold text-lg animate-pulse">
          連線至雲端同步資料庫中...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12 relative">
      {dialog.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div
                className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                  dialog.type === "confirm"
                    ? "bg-amber-100 text-amber-600"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                系統提示
              </h3>
              <p className="text-slate-600 text-sm whitespace-pre-wrap">
                {dialog.message}
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-center">
              {dialog.type === "confirm" && (
                <button
                  onClick={closeDialog}
                  className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-medium flex-1"
                >
                  取消
                </button>
              )}
              <button
                onClick={() => {
                  if (dialog.onConfirm) dialog.onConfirm();
                  closeDialog();
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex-1"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" /> 歷史紀錄
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              {historyRecords.length > 0 ? (
                <div className="space-y-3">
                  {historyRecords.map((record) => (
                    <div
                      key={record.id}
                      onClick={() => loadHistory(record)}
                      className="group p-4 border border-slate-200 rounded-xl hover:border-emerald-300 cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <h4 className="font-bold text-slate-800">
                          {record.name}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          {record.date}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteHistory(record.id, e)}
                        className="p-2 text-slate-300 hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <p>尚未有任何歷史紀錄</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-slate-50">
              <button
                onClick={startNewVoting}
                className="w-full py-2 bg-white border rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                <FilePlus className="w-4 h-4" /> 建立全新投票
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-b border-slate-200 shadow-sm relative">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="absolute right-4 top-6 flex gap-2">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-emerald-50"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={saveToHistory}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-blue-50"
            >
              <SaveAll className="w-4 h-4" />
            </button>
            <button
              onClick={startEditHeader}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>

          {!isEditingHeader ? (
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold text-slate-800 flex items-center justify-center sm:justify-start gap-2">
                🎨 {headerConfig.department}
              </h1>
              <h2 className="text-lg font-bold text-slate-700 mt-3 flex items-center justify-center sm:justify-start gap-2">
                🍰 {headerConfig.eventName}
              </h2>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2 text-sm">
                <span className="px-3 py-1 bg-slate-100 rounded-lg">
                  🗓️ {formatDisplayDate(headerConfig.eventDate, "brackets")}
                </span>
                <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg">
                  ⏳ {formatDisplayDate(headerConfig.deadlineDate, "brackets")}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mt-10 sm:mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  value={tempHeaderConfig.department || ""}
                  onChange={(e) =>
                    setTempHeaderConfig((p: any) => ({
                      ...p,
                      department: e.target.value,
                    }))
                  }
                  className="p-2 border rounded-lg text-sm"
                  placeholder="部門名稱"
                />
                <input
                  type="text"
                  value={tempHeaderConfig.eventName || ""}
                  onChange={(e) =>
                    setTempHeaderConfig((p: any) => ({
                      ...p,
                      eventName: e.target.value,
                    }))
                  }
                  className="p-2 border rounded-lg text-sm"
                  placeholder="活動名稱"
                />
                <input
                  type="date"
                  value={tempHeaderConfig.eventDate || ""}
                  onChange={(e) =>
                    setTempHeaderConfig((p: any) => ({
                      ...p,
                      eventDate: e.target.value,
                    }))
                  }
                  className="p-2 border rounded-lg text-sm"
                />
                <input
                  type="date"
                  value={tempHeaderConfig.deadlineDate || ""}
                  onChange={(e) =>
                    setTempHeaderConfig((p: any) => ({
                      ...p,
                      deadlineDate: e.target.value,
                    }))
                  }
                  className="p-2 border rounded-lg text-sm"
                />
                <textarea
                  value={tempHeaderConfig.notes || ""}
                  onChange={(e) =>
                    setTempHeaderConfig((p: any) => ({
                      ...p,
                      notes: e.target.value,
                    }))
                  }
                  className="col-span-full p-2 border rounded-lg text-sm h-24"
                  placeholder="注意事項..."
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setIsEditingHeader(false)}
                  className="px-4 py-2 bg-slate-200 rounded-lg text-sm"
                >
                  取消
                </button>
                <button
                  onClick={saveHeader}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm"
                >
                  儲存
                </button>
              </div>
            </div>
          )}
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

        {activeTab === "vote" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border flex flex-col sm:flex-row gap-3">
              <select
                value={currentUser}
                onChange={(e) => setCurrentUser(e.target.value)}
                className="flex-1 p-2 border rounded-lg text-sm"
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
                  placeholder="新增姓名..."
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-32 p-2 border rounded-lg text-sm"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-slate-800 text-white rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>

            {currentUser ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="bg-sky-50 p-4 border-b font-bold text-sky-900 flex items-center gap-2">
                    <Coffee className="w-5 h-5" /> 飲料
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2">
                    {drinkOptions.map((d: any) => (
                      <div
                        key={d}
                        onClick={() => toggleVote("drinks", d)}
                        className={`p-3 rounded-lg border-2 text-sm font-bold cursor-pointer flex items-center gap-2 ${
                          votes[currentUser]?.drinks?.includes(d)
                            ? "border-sky-500 bg-sky-50"
                            : "border-slate-100"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            votes[currentUser]?.drinks?.includes(d)
                              ? "bg-sky-500 border-sky-500"
                              : "border-slate-300"
                          }`}
                        ></div>
                        {d}
                      </div>
                    ))}
                  </div>
                  <form
                    onSubmit={handleDrinkSubmit}
                    className="p-4 border-t flex gap-2"
                  >
                    <input
                      type="text"
                      placeholder="新增..."
                      value={newDrinkName}
                      onChange={(e) => setNewDrinkName(e.target.value)}
                      className="flex-1 p-2 border rounded-lg text-sm"
                    />
                    <button
                      type="submit"
                      className="px-3 bg-sky-600 text-white rounded-lg"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="bg-orange-50 p-4 border-b font-bold text-orange-900 flex items-center gap-2">
                    <Pizza className="w-5 h-5" /> 餐點
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2">
                    {foodOptions.map((f: any) => (
                      <div
                        key={f}
                        onClick={() => toggleVote("foods", f)}
                        className={`p-3 rounded-lg border-2 text-sm font-bold cursor-pointer flex items-center gap-2 ${
                          votes[currentUser]?.foods?.includes(f)
                            ? "border-orange-500 bg-orange-50"
                            : "border-slate-100"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            votes[currentUser]?.foods?.includes(f)
                              ? "bg-orange-500 border-orange-500"
                              : "border-slate-300"
                          }`}
                        ></div>
                        {f}
                      </div>
                    ))}
                  </div>
                  <form
                    onSubmit={handleFoodSubmit}
                    className="p-4 border-t flex gap-2"
                  >
                    <input
                      type="text"
                      placeholder="新增..."
                      value={newFoodName}
                      onChange={(e) => setNewFoodName(e.target.value)}
                      className="flex-1 p-2 border rounded-lg text-sm"
                    />
                    <button
                      type="submit"
                      className="px-3 bg-orange-600 text-white rounded-lg"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="text-center p-12 bg-white rounded-xl border border-dashed text-slate-400">
                <p>請先選擇您的姓名</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "summary" && (
          <div>
            <SummaryTable
              title="飲料統計"
              icon={Coffee}
              options={drinkOptions}
              category="drinks"
              totals={drinkTotals}
              colorClass="text-sky-800"
              bgClass="bg-sky-50"
            />
            <SummaryTable
              title="餐點統計"
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
