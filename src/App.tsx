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

// ！！！這裡已經替換成你的專屬金鑰！！！
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
const appId = "my-teatime-app"; // 簡化 appId
// ------------------------------

// 初始選項設定 (僅供資料庫初次建立時使用)
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
const INITIAL_VOTES = {
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
  // --- 雲端連線狀態 ---
  const [fbUser, setFbUser] = useState<any>(null);
  const [isDbReady, setIsDbReady] = useState(false);

  // --- 介面狀態 ---
  const [activeTab, setActiveTab] = useState("vote");
  const [currentUser, setCurrentUser] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [dialog, setDialog] = useState({
    isOpen: false,
    type: "alert",
    message: "",
    onConfirm: null,
  });

  // --- 雲端同步的資料狀態 ---
  const [votes, setVotes] = useState({});
  const [headerConfig, setHeaderConfig] = useState({});
  const [drinkOptions, setDrinkOptions] = useState([]);
  const [foodOptions, setFoodOptions] = useState([]);
  const [optionUrls, setOptionUrls] = useState({});
  const [historyRecords, setHistoryRecords] = useState([]);

  // --- 編輯專用的暫存狀態 ---
  const [tempHeaderConfig, setTempHeaderConfig] = useState({});
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editUserName, setEditUserName] = useState("");
  const [newDrinkName, setNewDrinkName] = useState("");
  const [newDrinkUrl, setNewDrinkUrl] = useState("");
  const [newFoodName, setNewFoodName] = useState("");
  const [newFoodUrl, setNewFoodUrl] = useState("");
  const [editingDrink, setEditingDrink] = useState(null);
  const [editingFood, setEditingFood] = useState(null);

  const users = Object.keys(votes);

  // --- Firebase 初始化與連線 ---
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
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  // --- 監聽雲端即時資料 ---
  useEffect(() => {
    if (!fbUser || !db) return;

    // 1. 監聽當前投票狀態
    const stateDocRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "votingState",
      "currentState"
    );
    const unsubState = onSnapshot(
      stateDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setVotes(data.votes || {});
          setHeaderConfig(data.headerConfig || {});
          setDrinkOptions(data.drinkOptions || []);
          setFoodOptions(data.foodOptions || []);
          setOptionUrls(data.optionUrls || {});
          setIsDbReady(true);
        } else {
          // 如果資料庫是空的，寫入初始預設值
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
                  "外送限制：餐點皆請使用 Foodpanda 或 UberEats，以方便索取統編與合法收據。\n發票資訊：抬頭請打「網銀國際股份有限公司職工福利委員會」，統編「39746822」。\n請款規則：可分次叫外送，但請款時須合併為同一筆辦理，請勿分次送單。\n截止日期：本次請款截止日為 2026/6/12，逾期一律不予請款，發票請依序浮貼於 A4 紙上。",
              },
              drinkOptions: INITIAL_DRINK_OPTIONS,
              foodOptions: INITIAL_FOOD_OPTIONS,
              optionUrls: {},
            },
            { merge: true }
          ).then(() => setIsDbReady(true));
        }
      },
      (err) => console.error("Sync error:", err)
    );

    // 2. 監聽歷史紀錄集合
    const historyColRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "history"
    );
    const unsubHistory = onSnapshot(
      historyColRef,
      (snapshot) => {
        const records = [];
        snapshot.forEach((doc) => records.push({ id: doc.id, ...doc.data() }));
        records.sort((a, b) => b.timestamp - a.timestamp); // 依時間新到舊排序
        setHistoryRecords(records);
      },
      (err) => console.error("History sync error:", err)
    );

    return () => {
      unsubState();
      unsubHistory();
    };
  }, [fbUser]);

  // 更新雲端資料的共用函數
  const updateFirestore = async (updates) => {
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

  // --- UI 與互動函數 ---
  const showAlert = (message) =>
    setDialog({ isOpen: true, type: "alert", message, onConfirm: null });
  const showConfirm = (message, onConfirm) =>
    setDialog({ isOpen: true, type: "confirm", message, onConfirm });
  const closeDialog = () => setDialog((prev) => ({ ...prev, isOpen: false }));

  const formatDisplayDate = (dateStr, style = "underscore") => {
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

  // --- 歷史紀錄功能 (雲端版) ---
  const saveToHistory = () => {
    const recordName = `${headerConfig.department}_${headerConfig.eventName}`;
    showConfirm(
      `確定要將目前的投票狀態儲存為「${recordName}」嗎？\n(存檔後所有人都能在歷史紀錄中看到)`,
      async () => {
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
      }
    );
  };

  const loadHistory = (record) => {
    showConfirm(
      `確定要載入「${record.name}」嗎？\n⚠️ 這會覆蓋所有人當前畫面上的資料！`,
      async () => {
        await updateFirestore({
          headerConfig: record.headerConfig,
          votes: record.votes,
          drinkOptions: record.drinkOptions || INITIAL_DRINK_OPTIONS,
          foodOptions: record.foodOptions || INITIAL_FOOD_OPTIONS,
          optionUrls: record.optionUrls || {},
        });
        setShowHistoryModal(false);
        setCurrentUser("");
      }
    );
  };

  const deleteHistory = (id, e) => {
    e.stopPropagation();
    showConfirm("確定要永久刪除這筆歷史紀錄嗎？(無法復原)", async () => {
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
    showConfirm(
      "這將清除所有人畫面上的投票資料 (保留人員名單與餐點選項)，確定要建立全新投票嗎？",
      async () => {
        const emptyVotes = {};
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
      }
    );
  };

  // --- 投票與名單功能 ---
  const toggleVote = async (category, option) => {
    if (!currentUser) return;
    const userVotes = votes[currentUser][category];
    const updatedCategoryVotes = userVotes.includes(option)
      ? userVotes.filter((item) => item !== option)
      : [...userVotes, option];

    // 透過點表示法僅更新特定使用者的特定欄位，避免其他人同時投票時覆蓋
    await updateFirestore({
      [`votes.${currentUser}.${category}`]: updatedCategoryVotes,
    });
  };

  const handleAddUser = async (e) => {
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
    showConfirm(
      `確定要刪除成員「${currentUser}」及其所有投票紀錄嗎？`,
      async () => {
        const newVotes = { ...votes };
        delete newVotes[currentUser];
        await updateFirestore({ votes: newVotes });
        setCurrentUser("");
      }
    );
  };

  const startEditUser = () => {
    setEditUserName(currentUser);
    setIsEditingUser(true);
  };

  const saveEditUser = async () => {
    const trimmed = editUserName.trim();
    if (!trimmed) return setIsEditingUser(false);
    if (trimmed !== currentUser && votes[trimmed]) {
      return showAlert("此姓名已存在，請使用其他名稱！");
    }
    if (trimmed !== currentUser) {
      const newVotes = {};
      Object.keys(votes).forEach((key) => {
        newVotes[key === currentUser ? trimmed : key] = votes[key];
      });
      await updateFirestore({ votes: newVotes });
      setCurrentUser(trimmed);
    }
    setIsEditingUser(false);
  };

  // --- 標題編輯 ---
  const startEditHeader = () => {
    setTempHeaderConfig(headerConfig);
    setIsEditingHeader(true);
  };

  const saveHeader = async () => {
    await updateFirestore({ headerConfig: tempHeaderConfig });
    setIsEditingHeader(false);
  };

  // --- 飲料與餐點選項管理 ---
  const handleDrinkSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = newDrinkName.trim();
    const trimmedUrl = newDrinkUrl.trim();
    if (!trimmedName) return;

    if (editingDrink) {
      if (trimmedName !== editingDrink && drinkOptions.includes(trimmedName))
        return showAlert("此選項名稱已存在！");

      const newOptions = drinkOptions.map((d) =>
        d === editingDrink ? trimmedName : d
      );
      const newUrls = { ...optionUrls };
      if (trimmedName !== editingDrink) delete newUrls[editingDrink];
      if (trimmedUrl) newUrls[trimmedName] = trimmedUrl;
      else delete newUrls[trimmedName];

      const updates = { drinkOptions: newOptions, optionUrls: newUrls };
      if (trimmedName !== editingDrink) {
        const newVotes = {};
        Object.keys(votes).forEach((user) => {
          newVotes[user] = {
            ...votes[user],
            drinks: votes[user].drinks.map((d) =>
              d === editingDrink ? trimmedName : d
            ),
          };
        });
        updates.votes = newVotes;
      }
      await updateFirestore(updates);
      cancelEditDrink();
    } else {
      if (drinkOptions.includes(trimmedName))
        return showAlert("此選項已存在！");
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

  const startEditDrink = (drink) => {
    setEditingDrink(drink);
    setNewDrinkName(drink);
    setNewDrinkUrl(optionUrls[drink] || "");
  };
  const cancelEditDrink = () => {
    setEditingDrink(null);
    setNewDrinkName("");
    setNewDrinkUrl("");
  };

  const handleDeleteDrink = (drink) => {
    showConfirm(
      `確定要刪除「${drink}」嗎？所有選擇此項的紀錄都會被一併移除。`,
      async () => {
        const newUrls = { ...optionUrls };
        delete newUrls[drink];
        const newVotes = {};
        Object.keys(votes).forEach((user) => {
          newVotes[user] = {
            ...votes[user],
            drinks: votes[user].drinks.filter((d) => d !== drink),
          };
        });
        await updateFirestore({
          drinkOptions: drinkOptions.filter((d) => d !== drink),
          optionUrls: newUrls,
          votes: newVotes,
        });
        if (editingDrink === drink) cancelEditDrink();
      }
    );
  };

  const handleFoodSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = newFoodName.trim();
    const trimmedUrl = newFoodUrl.trim();
    if (!trimmedName) return;

    if (editingFood) {
      if (trimmedName !== editingFood && foodOptions.includes(trimmedName))
        return showAlert("此選項名稱已存在！");

      const newOptions = foodOptions.map((f) =>
        f === editingFood ? trimmedName : f
      );
      const newUrls = { ...optionUrls };
      if (trimmedName !== editingFood) delete newUrls[editingFood];
      if (trimmedUrl) newUrls[trimmedName] = trimmedUrl;
      else delete newUrls[trimmedName];

      const updates = { foodOptions: newOptions, optionUrls: newUrls };
      if (trimmedName !== editingFood) {
        const newVotes = {};
        Object.keys(votes).forEach((user) => {
          newVotes[user] = {
            ...votes[user],
            foods: votes[user].foods.map((f) =>
              f === editingFood ? trimmedName : f
            ),
          };
        });
        updates.votes = newVotes;
      }
      await updateFirestore(updates);
      cancelEditFood();
    } else {
      if (foodOptions.includes(trimmedName)) return showAlert("此選項已存在！");
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

  const startEditFood = (food) => {
    setEditingFood(food);
    setNewFoodName(food);
    setNewFoodUrl(optionUrls[food] || "");
  };
  const cancelEditFood = () => {
    setEditingFood(null);
    setNewFoodName("");
    setNewFoodUrl("");
  };

  const handleDeleteFood = (food) => {
    showConfirm(
      `確定要刪除「${food}」嗎？所有選擇此項的紀錄都會被一併移除。`,
      async () => {
        const newUrls = { ...optionUrls };
        delete newUrls[food];
        const newVotes = {};
        Object.keys(votes).forEach((user) => {
          newVotes[user] = {
            ...votes[user],
            foods: votes[user].foods.filter((f) => f !== food),
          };
        });
        await updateFirestore({
          foodOptions: foodOptions.filter((f) => f !== food),
          optionUrls: newUrls,
          votes: newVotes,
        });
        if (editingFood === food) cancelEditFood();
      }
    );
  };

  // --- 計算總計區 ---
  const calculateTotals = (category, options) => {
    const totals = {};
    options.forEach((opt) => {
      totals[opt] = 0;
    });
    Object.values(votes).forEach((userVote) => {
      if (userVote[category]) {
        userVote[category].forEach((item) => {
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

  const getTopItems = (totalsObj) => {
    const maxVotes = Math.max(...Object.values(totalsObj), 0);
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

  // --- 元件渲染 ---
  const SummaryTable = ({
    title,
    icon: Icon,
    options,
    category,
    totals,
    colorClass,
    bgClass,
  }) => (
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
              {options.map((opt) => (
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
                {options.map((opt) => (
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
              {options.map((opt) => (
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

  // 如果資料庫還沒準備好，顯示載入畫面
  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-600 font-bold text-lg animate-pulse">
          連線至雲端同步資料庫中...
        </p>
        <p className="text-slate-400 text-sm mt-2">
          請稍候，正在載入大家的最新點餐紀錄
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12 relative">
      {/* 自訂對話框 */}
      {dialog.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
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
                  className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors flex-1"
                >
                  取消
                </button>
              )}
              <button
                onClick={() => {
                  if (dialog.onConfirm) dialog.onConfirm();
                  closeDialog();
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex-1"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 歷史紀錄管理 Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />{" "}
                雲端活動歷史紀錄
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-white">
              {historyRecords.length > 0 ? (
                <div className="space-y-3">
                  {historyRecords.map((record) => (
                    <div
                      key={record.id}
                      onClick={() => loadHistory(record)}
                      className="group p-4 border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-md hover:bg-emerald-50/30 cursor-pointer transition-all flex justify-between items-center"
                    >
                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                          {record.name}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          儲存時間: {record.date}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteHistory(record.id, e)}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                        title="刪除紀錄"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>目前雲端還沒有任何歷史紀錄喔！</p>
                </div>
              )}
            </div>
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex justify-between">
              <button
                onClick={startNewVoting}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-lg text-sm font-medium transition-colors shadow-sm w-full justify-center"
              >
                <FilePlus className="w-4 h-4" /> 建立全新投票
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 標題區 */}
      <div className="bg-white border-b border-slate-200 shadow-sm transition-all relative">
        <div className="max-w-5xl mx-auto px-4 py-6 relative group">
          <div className="absolute right-4 top-6 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-10">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 rounded-lg shadow-sm transition-all text-sm font-medium"
              title="查看歷史紀錄"
            >
              <History className="w-4 h-4" /> 歷史
            </button>
            <button
              onClick={saveToHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200 rounded-lg shadow-sm transition-all text-sm font-medium"
              title="同步儲存當前進度到雲端"
            >
              <SaveAll className="w-4 h-4" /> 存檔
            </button>
            <button
              onClick={startEditHeader}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg shadow-sm transition-all text-sm font-medium"
              title="編輯活動資訊"
            >
              <Pencil className="w-4 h-4" /> 編輯
            </button>
          </div>

          {!isEditingHeader ? (
            <div className="text-center sm:text-left pt-12 sm:pt-0 pr-0 sm:pr-48">
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center justify-center sm:justify-start gap-2">
                <span className="text-3xl">🎨</span> {headerConfig.department}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 mt-3">
                <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                  <span className="text-2xl">🍰</span> {headerConfig.eventName}
                </h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <label
                    className="relative flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium cursor-pointer transition-colors shadow-sm"
                    title="點擊更改活動日期"
                  >
                    🗓️ 活動日：
                    {headerConfig.eventDate
                      ? formatDisplayDate(headerConfig.eventDate, "brackets")
                      : "選擇日期"}
                    <input
                      type="date"
                      value={headerConfig.eventDate}
                      onChange={async (e) =>
                        await updateFirestore({
                          headerConfig: {
                            ...headerConfig,
                            eventDate: e.target.value,
                          },
                        })
                      }
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                  <label
                    className="relative flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium cursor-pointer transition-colors shadow-sm"
                    title="點擊更改截單日期"
                  >
                    ⏳ 截單日：
                    {headerConfig.deadlineDate
                      ? formatDisplayDate(headerConfig.deadlineDate, "brackets")
                      : "未設定"}
                    <input
                      type="date"
                      value={headerConfig.deadlineDate}
                      onChange={async (e) =>
                        await updateFirestore({
                          headerConfig: {
                            ...headerConfig,
                            deadlineDate: e.target.value,
                          },
                        })
                      }
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 mt-10 sm:mt-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-500" />
                  編輯活動資訊 (將同步給所有人)
                </h3>
                <button
                  onClick={() => setIsEditingHeader(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-600">
                    部門名稱
                  </label>
                  <input
                    type="text"
                    value={tempHeaderConfig.department || ""}
                    onChange={(e) =>
                      setTempHeaderConfig((p) => ({
                        ...p,
                        department: e.target.value,
                      }))
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-600">
                    活動名稱
                  </label>
                  <input
                    type="text"
                    value={tempHeaderConfig.eventName || ""}
                    onChange={(e) =>
                      setTempHeaderConfig((p) => ({
                        ...p,
                        eventName: e.target.value,
                      }))
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-600">
                    活動日期
                  </label>
                  <input
                    type="date"
                    value={tempHeaderConfig.eventDate || ""}
                    onChange={(e) =>
                      setTempHeaderConfig((p) => ({
                        ...p,
                        eventDate: e.target.value,
                      }))
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-600">
                    截單日期
                  </label>
                  <input
                    type="date"
                    value={tempHeaderConfig.deadlineDate || ""}
                    onChange={(e) =>
                      setTempHeaderConfig((p) => ({
                        ...p,
                        deadlineDate: e.target.value,
                      }))
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2 md:col-span-4 mt-2">
                  <label className="text-sm font-semibold text-slate-600">
                    注意事項 (每一行會自動顯示為一個項目點)
                  </label>
                  <textarea
                    value={tempHeaderConfig.notes || ""}
                    onChange={(e) =>
                      setTempHeaderConfig((p) => ({
                        ...p,
                        notes: e.target.value,
                      }))
                    }
                    className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none min-h-[120px] leading-relaxed"
                    placeholder="請輸入訂餐或請款注意事項，按 Enter 換行..."
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setIsEditingHeader(false)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors text-sm font-medium"
                >
                  取消
                </button>
                <button
                  onClick={saveHeader}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> 儲存變更
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6">
        {/* 注意事項提醒區塊 */}
        {headerConfig.notes && headerConfig.notes.trim() !== "" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 mb-6 shadow-sm group relative">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900 w-full">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-base text-amber-800">
                    📌 訂餐與請款注意事項
                  </h3>
                  <button
                    onClick={startEditHeader}
                    className="p-1.5 bg-amber-100/50 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center gap-1 text-xs font-medium"
                    title="編輯注意事項"
                  >
                    <Pencil className="w-3.5 h-3.5" /> 編輯內容
                  </button>
                </div>
                <ul className="list-disc list-inside space-y-1.5 ml-1 leading-relaxed">
                  {(headerConfig.notes || "").split("\n").map((line, idx) => {
                    if (!line.trim()) return null;
                    const match = line.match(/^([^：]+：)(.*)$/);
                    if (match)
                      return (
                        <li key={idx}>
                          <strong>{match[1]}</strong>
                          {match[2]}
                        </li>
                      );
                    return <li key={idx}>{line}</li>;
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 即時戰況看板 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-3 bg-sky-50/80 p-4 rounded-xl border border-sky-200 shadow-sm transition-all hover:shadow-md">
            <div className="p-2.5 bg-sky-100 rounded-lg shrink-0">
              <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-sky-700 mb-0.5">飲料領先</p>
              <div
                className="text-sm text-sky-900 font-bold truncate"
                title={topDrinks.items.join("、") || "尚未投票"}
              >
                {topDrinks.items.join("、") || "尚未投票"}
                {topDrinks.votes > 0 && (
                  <span className="text-sky-600 text-xs ml-1 font-medium">
                    ({topDrinks.votes}票)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-orange-50/80 p-4 rounded-xl border border-orange-200 shadow-sm transition-all hover:shadow-md">
            <div className="p-2.5 bg-orange-100 rounded-lg shrink-0">
              <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-orange-700 mb-0.5">
                餐點領先
              </p>
              <div
                className="text-sm text-orange-900 font-bold truncate"
                title={topFoods.items.join("、") || "尚未投票"}
              >
                {topFoods.items.join("、") || "尚未投票"}
                {topFoods.votes > 0 && (
                  <span className="text-orange-600 text-xs ml-1 font-medium">
                    ({topFoods.votes}票)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-100/80 p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className="p-2.5 bg-slate-200 rounded-lg shrink-0">
              <UserMinus className="w-6 h-6 text-slate-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-600 mb-0.5">
                尚未投票
              </p>
              <div
                className="text-sm text-slate-900 font-bold truncate"
                title={
                  unvotedUsers.length > 0
                    ? unvotedUsers.join("、")
                    : "皆已完成 🎉"
                }
              >
                {unvotedUsers.length > 0
                  ? unvotedUsers.join("、")
                  : "皆已完成 🎉"}
                {unvotedUsers.length > 0 && (
                  <span className="text-slate-500 text-xs ml-1 font-medium">
                    ({unvotedUsers.length}人)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 導覽分頁按鈕 */}
        <div className="flex bg-slate-200/50 p-1 rounded-xl mb-6 w-full sm:w-fit">
          <button
            onClick={() => setActiveTab("vote")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "vote"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" /> 個人投票區
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "summary"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Table className="w-4 h-4" /> 統計總表
          </button>
        </div>

        {/* 投票介面 */}
        {activeTab === "vote" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />{" "}
                請選擇您的姓名以進行投票：
              </label>
              <div className="flex flex-col lg:flex-row gap-3">
                {isEditingUser ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editUserName}
                      onChange={(e) => setEditUserName(e.target.value)}
                      className="flex-1 p-3 bg-white border border-emerald-400 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
                      autoFocus
                    />
                    <button
                      onClick={saveEditUser}
                      className="p-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors shrink-0"
                      title="儲存"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsEditingUser(false)}
                      className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors shrink-0"
                      title="取消"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex gap-2">
                    <select
                      value={currentUser}
                      onChange={(e) => setCurrentUser(e.target.value)}
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
                    >
                      <option value="" disabled>
                        -- 點擊選擇姓名 --
                      </option>
                      {users.map((user) => (
                        <option key={user} value={user}>
                          {user}
                        </option>
                      ))}
                    </select>
                    {currentUser && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={startEditUser}
                          className="p-3 bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 rounded-lg transition-colors"
                          title="修改姓名"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleDeleteUser}
                          className="p-3 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"
                          title="刪除姓名"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <form
                  onSubmit={handleAddUser}
                  className="flex gap-2 w-full lg:w-auto"
                >
                  <input
                    type="text"
                    placeholder="新增其他姓名..."
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full sm:w-32 p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                  <button
                    type="submit"
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors shrink-0"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>

            {currentUser ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* 飲料選擇區 */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-sky-50 px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                    <Coffee className="w-5 h-5 text-sky-600" />
                    <h3 className="font-bold text-sky-900">飲料投票</h3>
                  </div>
                  <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {drinkOptions.map((drink) => {
                      const isSelected =
                        votes[currentUser]?.drinks?.includes(drink);
                      return (
                        <div
                          key={drink}
                          onClick={() => toggleVote("drinks", drink)}
                          className={`relative group p-3 rounded-lg border-2 text-sm font-bold flex flex-col items-center justify-center gap-2 transition-all overflow-hidden cursor-pointer select-none ${
                            isSelected
                              ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm scale-[1.02]"
                              : "border-slate-100 bg-white text-slate-500 hover:border-sky-200 hover:bg-sky-50/50"
                          }`}
                        >
                          <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all z-10">
                            {optionUrls[drink] && (
                              <a
                                href={optionUrls[drink]}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 bg-sky-100 text-sky-600 rounded-full hover:bg-sky-500 hover:text-white transition-colors"
                                title="查看菜單網頁"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditDrink(drink);
                              }}
                              className="p-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-emerald-500 hover:text-white transition-colors"
                              title="編輯選項"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDrink(drink);
                              }}
                              className="p-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-rose-500 hover:text-white transition-colors"
                              title="刪除選項"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-3 lg:mt-0 ${
                              isSelected
                                ? "border-sky-500 bg-sky-500"
                                : "border-slate-300"
                            }`}
                          >
                            {isSelected && (
                              <Check
                                className="w-3 h-3 text-white"
                                strokeWidth={4}
                              />
                            )}
                          </div>
                          {drink}
                        </div>
                      );
                    })}
                  </div>
                  <div
                    className={`px-5 pb-5 transition-colors ${
                      editingDrink ? "bg-sky-50/50 rounded-b-xl" : ""
                    }`}
                  >
                    <form
                      onSubmit={handleDrinkSubmit}
                      className={`flex flex-col sm:flex-row gap-2 border-t pt-4 ${
                        editingDrink ? "border-emerald-200" : "border-sky-100"
                      }`}
                    >
                      <input
                        type="text"
                        placeholder={
                          editingDrink ? "修改名稱(必填)" : "新增名稱(必填)"
                        }
                        value={newDrinkName}
                        onChange={(e) => setNewDrinkName(e.target.value)}
                        className={`w-full sm:w-1/3 p-2.5 bg-white border rounded-lg outline-none focus:ring-2 text-sm ${
                          editingDrink
                            ? "border-emerald-300 focus:ring-emerald-500"
                            : "border-sky-200 focus:ring-sky-500 bg-sky-50/50"
                        }`}
                        required
                      />
                      <input
                        type="url"
                        placeholder="貼上網址(選填)..."
                        value={newDrinkUrl}
                        onChange={(e) => setNewDrinkUrl(e.target.value)}
                        className={`flex-1 p-2.5 bg-white border rounded-lg outline-none focus:ring-2 text-sm ${
                          editingDrink
                            ? "border-emerald-300 focus:ring-emerald-500"
                            : "border-sky-200 focus:ring-sky-500 bg-sky-50/50"
                        }`}
                      />
                      {editingDrink ? (
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            type="submit"
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-1"
                          >
                            <Save className="w-4 h-4" /> 儲存
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditDrink}
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-400 hover:bg-slate-500 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-1"
                          >
                            <X className="w-4 h-4" /> 取消
                          </button>
                        </div>
                      ) : (
                        <button
                          type="submit"
                          className="w-full sm:w-auto px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors text-sm font-medium shrink-0 flex items-center justify-center gap-1"
                        >
                          <Plus className="w-4 h-4" /> 新增
                        </button>
                      )}
                    </form>
                  </div>
                </div>

                {/* 餐點選擇區 */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-orange-50 px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                    <Pizza className="w-5 h-5 text-orange-600" />
                    <h3 className="font-bold text-orange-900">餐點投票</h3>
                  </div>
                  <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {foodOptions.map((food) => {
                      const isSelected =
                        votes[currentUser]?.foods?.includes(food);
                      return (
                        <div
                          key={food}
                          onClick={() => toggleVote("foods", food)}
                          className={`relative group p-3 rounded-lg border-2 text-sm font-bold flex flex-col items-center justify-center gap-2 transition-all overflow-hidden cursor-pointer select-none ${
                            isSelected
                              ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm scale-[1.02]"
                              : "border-slate-100 bg-white text-slate-500 hover:border-orange-200 hover:bg-orange-50/50"
                          }`}
                        >
                          <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all z-10">
                            {optionUrls[food] && (
                              <a
                                href={optionUrls[food]}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-500 hover:text-white transition-colors"
                                title="查看菜單網頁"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditFood(food);
                              }}
                              className="p-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-emerald-500 hover:text-white transition-colors"
                              title="編輯選項"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFood(food);
                              }}
                              className="p-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-rose-500 hover:text-white transition-colors"
                              title="刪除選項"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-3 lg:mt-0 ${
                              isSelected
                                ? "border-orange-500 bg-orange-500"
                                : "border-slate-300"
                            }`}
                          >
                            {isSelected && (
                              <Check
                                className="w-3 h-3 text-white"
                                strokeWidth={4}
                              />
                            )}
                          </div>
                          {food}
                        </div>
                      );
                    })}
                  </div>
                  <div
                    className={`px-5 pb-5 transition-colors ${
                      editingFood ? "bg-orange-50/50 rounded-b-xl" : ""
                    }`}
                  >
                    <form
                      onSubmit={handleFoodSubmit}
                      className={`flex flex-col sm:flex-row gap-2 border-t pt-4 ${
                        editingFood ? "border-emerald-200" : "border-orange-100"
                      }`}
                    >
                      <input
                        type="text"
                        placeholder={
                          editingFood ? "修改名稱(必填)" : "新增名稱(必填)"
                        }
                        value={newFoodName}
                        onChange={(e) => setNewFoodName(e.target.value)}
                        className={`w-full sm:w-1/3 p-2.5 bg-white border rounded-lg outline-none focus:ring-2 text-sm ${
                          editingFood
                            ? "border-emerald-300 focus:ring-emerald-500"
                            : "border-orange-200 focus:ring-orange-500 bg-orange-50/50"
                        }`}
                        required
                      />
                      <input
                        type="url"
                        placeholder="貼上網址(選填)..."
                        value={newFoodUrl}
                        onChange={(e) => setNewFoodUrl(e.target.value)}
                        className={`flex-1 p-2.5 bg-white border rounded-lg outline-none focus:ring-2 text-sm ${
                          editingFood
                            ? "border-emerald-300 focus:ring-emerald-500"
                            : "border-orange-200 focus:ring-orange-500 bg-orange-50/50"
                        }`}
                      />
                      {editingFood ? (
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            type="submit"
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-1"
                          >
                            <Save className="w-4 h-4" /> 儲存
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditFood}
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-400 hover:bg-slate-500 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-1"
                          >
                            <X className="w-4 h-4" /> 取消
                          </button>
                        </div>
                      ) : (
                        <button
                          type="submit"
                          className="w-full sm:w-auto px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm font-medium shrink-0 flex items-center justify-center gap-1"
                        >
                          <Plus className="w-4 h-4" /> 新增
                        </button>
                      )}
                    </form>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-slate-200 border-dashed text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>請先在上方選擇您的姓名，解鎖您的專屬選單</p>
              </div>
            )}
          </div>
        )}

        {/* 總表檢視 */}
        {activeTab === "summary" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <SummaryTable
              title="飲料投票總表"
              icon={Coffee}
              options={drinkOptions}
              category="drinks"
              totals={drinkTotals}
              colorClass="text-sky-800"
              bgClass="bg-sky-50"
            />
            <SummaryTable
              title="餐點投票總表"
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
