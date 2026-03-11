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
  Settings,
  ExternalLink,
  Crown,
  Loader2,
  UserMinus,
} from "lucide-react";

// --- Firebase 雲端資料庫設定 ---
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
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

  const [votes, setVotes] = useState<any>({});
  const [headerConfig, setHeaderConfig] = useState<any>({});
  const [drinkOptions, setDrinkOptions] = useState<any[]>([]);
  const [foodOptions, setFoodOptions] = useState<any[]>([]);
  const [optionUrls, setOptionUrls] = useState<any>({});

  const [isEditingHeader, setIsEditingHeader] = useState<boolean>(false);
  const [tempHeaderConfig, setTempHeaderConfig] = useState<any>({});
  const [newDrinkName, setNewDrinkName] = useState<string>("");
  const [newDrinkUrl, setNewDrinkUrl] = useState<string>("");
  const [newFoodName, setNewFoodName] = useState<string>("");
  const [newFoodUrl, setNewFoodUrl] = useState<string>("");

  // 編輯既有選項的狀態
  const [editingOption, setEditingOption] = useState<any>({
    type: null,
    oldName: "",
    name: "",
    url: "",
  });

  // 過濾掉可能因為之前 Bug 產生的錯誤資料格式
  const users = Object.keys(votes).filter((k) => !k.includes("."));

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsub = onAuthStateChanged(auth, (user) => setFbUser(user));
    return () => unsub();
  }, []);

  useEffect(() => {
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
    const unsubData = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setVotes(d.votes || {});
        setHeaderConfig(d.headerConfig || {});
        setDrinkOptions(d.drinkOptions || []);
        setFoodOptions(d.foodOptions || []);
        setOptionUrls(d.optionUrls || {});
        setIsDbReady(true);
      } else {
        setDoc(docRef, {
          votes: { 測試人員: { drinks: [], foods: [] } },
          headerConfig: {
            department: "2D一部",
            eventName: "第一次下午茶",
            eventDate: "",
            deadlineDate: "",
            notes: "",
          },
          drinkOptions: ["烏弄", "八曜"],
          foodOptions: ["天使雞排"],
          optionUrls: {},
        }).then(() => setIsDbReady(true));
      }
    });
    return () => unsubData();
  }, [fbUser]);

  // ⭐️ 真正解決寫入問題的引擎
  const updateRemote = async (updates: any) => {
    const docRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "votingState",
      "currentState"
    );
    try {
      await updateDoc(docRef, updates);
    } catch (err) {
      await setDoc(docRef, updates, { merge: true });
    }
  };

  // 標題編輯
  const startEditHeader = () => {
    setTempHeaderConfig(headerConfig);
    setIsEditingHeader(true);
  };
  const saveHeader = async () => {
    await updateRemote({ headerConfig: tempHeaderConfig });
    setIsEditingHeader(false);
  };

  // 人員管理
  const handleAddUser = async (e: any) => {
    e.preventDefault();
    const name = newUserName.trim();
    if (name && !votes[name]) {
      await updateRemote({ [`votes.${name}`]: { drinks: [], foods: [] } });
      setCurrentUser(name);
      setNewUserName("");
    }
  };
  const handleDeleteUser = async () => {
    if (!currentUser) return;
    if (window.confirm(`確定要刪除成員「${currentUser}」的所有資料嗎？`)) {
      const newVotes = { ...votes };
      delete newVotes[currentUser];
      await updateRemote({ votes: newVotes });
      setCurrentUser("");
    }
  };

  // 投票邏輯
  const toggleVote = async (category: string, option: string) => {
    if (!currentUser) return;
    const currentList = votes[currentUser]?.[category] || [];
    const updatedList = currentList.includes(option)
      ? currentList.filter((i: any) => i !== option)
      : [...currentList, option];
    await updateRemote({ [`votes.${currentUser}.${category}`]: updatedList });
  };

  // 選項管理 (新增)
  const handleOptionSubmit = async (e: any, type: "drinks" | "foods") => {
    e.preventDefault();
    const name = type === "drinks" ? newDrinkName.trim() : newFoodName.trim();
    const url = type === "drinks" ? newDrinkUrl.trim() : newFoodUrl.trim();
    if (!name) return;

    const options = type === "drinks" ? drinkOptions : foodOptions;
    const newUrls = { ...optionUrls };
    if (url) newUrls[name] = url;

    await updateRemote({
      [type === "drinks" ? "drinkOptions" : "foodOptions"]: Array.from(
        new Set([...options, name])
      ),
      optionUrls: newUrls,
    });

    if (type === "drinks") {
      setNewDrinkName("");
      setNewDrinkUrl("");
    } else {
      setNewFoodName("");
      setNewFoodUrl("");
    }
  };

  // ⭐️ 選項管理 (儲存編輯)
  const saveEditOption = async () => {
    const { type, oldName, name, url } = editingOption;
    const trimmedName = name.trim();
    if (!trimmedName) return setEditingOption({ type: null });

    const isDrink = type === "drinks";
    const options = isDrink ? drinkOptions : foodOptions;
    const newOptions = options.map((o) => (o === oldName ? trimmedName : o));

    const newUrls = { ...optionUrls };
    delete newUrls[oldName];
    if (url.trim()) newUrls[trimmedName] = url.trim();

    const updates: any = {
      [isDrink ? "drinkOptions" : "foodOptions"]: newOptions,
      optionUrls: newUrls,
    };

    // 同步更新大家的投票紀錄，才不會有人投了舊選項變孤兒
    const newVotes = { ...votes };
    Object.keys(newVotes).forEach((user) => {
      const cat = isDrink ? "drinks" : "foods";
      if (newVotes[user][cat]?.includes(oldName)) {
        newVotes[user][cat] = newVotes[user][cat].map((i: any) =>
          i === oldName ? trimmedName : i
        );
      }
    });
    updates.votes = newVotes;

    await updateRemote(updates);
    setEditingOption({ type: null });
  };

  // ⭐️ 選項管理 (刪除)
  const deleteOption = async (type: "drinks" | "foods", optionName: string) => {
    if (
      window.confirm(
        `確定要刪除選項「${optionName}」嗎？這會移除所有人投給它的票喔！`
      )
    ) {
      const isDrink = type === "drinks";
      const options = isDrink ? drinkOptions : foodOptions;
      const newOptions = options.filter((o) => o !== optionName);

      const newUrls = { ...optionUrls };
      delete newUrls[optionName];

      const updates: any = {
        [isDrink ? "drinkOptions" : "foodOptions"]: newOptions,
        optionUrls: newUrls,
      };

      const newVotes = { ...votes };
      Object.keys(newVotes).forEach((user) => {
        const cat = isDrink ? "drinks" : "foods";
        if (newVotes[user][cat]?.includes(optionName)) {
          newVotes[user][cat] = newVotes[user][cat].filter(
            (i: any) => i !== optionName
          );
        }
      });
      updates.votes = newVotes;

      await updateRemote(updates);
    }
  };

  const drinkTotals = useMemo(() => {
    const t: any = {};
    drinkOptions.forEach((o) => (t[o] = 0));
    Object.values(votes).forEach((v: any) =>
      v.drinks?.forEach((i: any) => t[i] !== undefined && t[i]++)
    );
    return t;
  }, [votes, drinkOptions]);

  const foodTotals = useMemo(() => {
    const t: any = {};
    foodOptions.forEach((o) => (t[o] = 0));
    Object.values(votes).forEach((v: any) =>
      v.foods?.forEach((i: any) => t[i] !== undefined && t[i]++)
    );
    return t;
  }, [votes, foodOptions]);

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

  const unvotedUsers = users.filter(
    (u) => !votes[u]?.drinks?.length && !votes[u]?.foods?.length
  );

  if (!isDbReady)
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 bg-slate-50">
        <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans">
      <div className="bg-white border-b shadow-sm p-4 md:p-6 mb-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="text-center md:text-left w-full md:w-auto">
            <h1 className="text-2xl font-black text-slate-800 flex items-center justify-center md:justify-start gap-2">
              🎨 {headerConfig.department || "部門名稱"}{" "}
              <button
                onClick={startEditHeader}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </h1>
            <p className="font-bold text-slate-500 text-lg mt-1">
              🍰 {headerConfig.eventName || "活動名稱"}
            </p>
            <div className="flex gap-2 justify-center md:justify-start mt-3">
              <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold rounded shadow-sm border border-blue-100">
                活動日：{headerConfig.eventDate || "未設"}
              </span>
              <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[11px] font-bold rounded shadow-sm border border-rose-100">
                截單日：{headerConfig.deadlineDate || "未設"}
              </span>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <div className="bg-sky-50 p-3 rounded-xl border border-sky-100 min-w-[110px]">
              <p className="text-[10px] font-bold text-sky-600">🥤 飲料領先</p>
              <p className="text-sm font-black truncate">
                {topDrinks.items[0] || "-"}
              </p>
            </div>
            <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 min-w-[110px]">
              <p className="text-[10px] font-bold text-orange-600">
                🍗 餐點領先
              </p>
              <p className="text-sm font-black truncate">
                {topFoods.items[0] || "-"}
              </p>
            </div>
            <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 min-w-[110px] group relative cursor-help">
              <p className="text-[10px] font-bold text-slate-500">
                👥 未投人數
              </p>
              <p className="text-sm font-black">{unvotedUsers.length} 人</p>
              <div className="hidden group-hover:block absolute top-full right-0 mt-2 p-3 bg-slate-800 text-white text-[11px] rounded-lg z-50 w-48 shadow-xl">
                {unvotedUsers.join(", ") || "已全數完成"}
              </div>
            </div>
          </div>
        </div>

        {/* 標題與日期編輯面板 */}
        {isEditingHeader && (
          <div className="max-w-5xl mx-auto mt-4 p-5 bg-slate-50 rounded-xl border-2 border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  部門名稱
                </label>
                <input
                  className="w-full p-2 border rounded"
                  value={tempHeaderConfig.department || ""}
                  onChange={(e) =>
                    setTempHeaderConfig({
                      ...tempHeaderConfig,
                      department: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  活動名稱
                </label>
                <input
                  className="w-full p-2 border rounded"
                  value={tempHeaderConfig.eventName || ""}
                  onChange={(e) =>
                    setTempHeaderConfig({
                      ...tempHeaderConfig,
                      eventName: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  活動日期
                </label>
                <input
                  type="date"
                  className="w-full p-2 border rounded"
                  value={tempHeaderConfig.eventDate || ""}
                  onChange={(e) =>
                    setTempHeaderConfig({
                      ...tempHeaderConfig,
                      eventDate: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  截單日期
                </label>
                <input
                  type="date"
                  className="w-full p-2 border rounded"
                  value={tempHeaderConfig.deadlineDate || ""}
                  onChange={(e) =>
                    setTempHeaderConfig({
                      ...tempHeaderConfig,
                      deadlineDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="col-span-2 md:col-span-4">
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  注意事項
                </label>
                <textarea
                  className="w-full p-2 border rounded h-16"
                  value={tempHeaderConfig.notes || ""}
                  onChange={(e) =>
                    setTempHeaderConfig({
                      ...tempHeaderConfig,
                      notes: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveHeader}
                className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg"
              >
                儲存設定
              </button>
              <button
                onClick={() => setIsEditingHeader(false)}
                className="px-6 py-2 bg-slate-300 font-bold rounded-lg"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4">
        <div className="flex bg-slate-200/50 p-1 rounded-xl mb-6 w-fit shadow-inner">
          <button
            onClick={() => setActiveTab("vote")}
            className={`px-6 py-2 rounded-lg text-sm font-black ${
              activeTab === "vote"
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-slate-500"
            }`}
          >
            投票區
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-6 py-2 rounded-lg text-sm font-black ${
              activeTab === "summary"
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-slate-500"
            }`}
          >
            總表
          </button>
        </div>

        {activeTab === "vote" ? (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex gap-2">
                <select
                  value={currentUser}
                  onChange={(e) => setCurrentUser(e.target.value)}
                  className="flex-1 p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
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
                {currentUser && (
                  <button
                    onClick={handleDeleteUser}
                    title="刪除此成員"
                    className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              <form onSubmit={handleAddUser} className="flex gap-2">
                <input
                  className="p-3 border rounded-xl text-sm w-full sm:w-32"
                  placeholder="新增成員..."
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                />
                <button
                  type="submit"
                  className="p-3 bg-slate-800 text-white rounded-xl hover:bg-black transition-colors"
                >
                  <Plus />
                </button>
              </form>
            </div>

            {currentUser && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 飲料區 */}
                <div className="bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-sky-50 p-5 border-b font-black text-sky-800 flex items-center gap-2">
                    <Coffee /> 飲料選單
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-3 flex-1 content-start">
                    {drinkOptions.map((d) => {
                      if (
                        editingOption.type === "drinks" &&
                        editingOption.oldName === d
                      ) {
                        return (
                          <div
                            key={d}
                            className="p-3 border-2 border-emerald-400 bg-emerald-50 rounded-xl col-span-2 sm:col-span-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              className="w-full text-sm font-bold p-1.5 border rounded mb-2 outline-none"
                              value={editingOption.name}
                              onChange={(e) =>
                                setEditingOption({
                                  ...editingOption,
                                  name: e.target.value,
                                })
                              }
                              placeholder="店家名稱"
                            />
                            <input
                              className="w-full text-xs p-1.5 border rounded mb-2 outline-none"
                              value={editingOption.url}
                              onChange={(e) =>
                                setEditingOption({
                                  ...editingOption,
                                  url: e.target.value,
                                })
                              }
                              placeholder="菜單網址(選填)"
                            />
                            <div className="flex gap-2">
                              <button
                                className="flex-1 bg-emerald-600 text-white text-xs py-2 rounded-lg font-bold shadow-sm"
                                onClick={saveEditOption}
                              >
                                儲存
                              </button>
                              <button
                                className="flex-1 bg-slate-300 text-slate-700 text-xs py-2 rounded-lg font-bold"
                                onClick={() => setEditingOption({ type: null })}
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={d}
                          onClick={() => toggleVote("drinks", d)}
                          className={`group relative p-3.5 rounded-xl border-2 font-bold text-sm cursor-pointer transition-all ${
                            votes[currentUser]?.drinks?.includes(d)
                              ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm"
                              : "border-slate-100 hover:border-sky-200 text-slate-500"
                          }`}
                        >
                          <div className="flex items-center gap-2 pr-4">
                            <div
                              className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                votes[currentUser]?.drinks?.includes(d)
                                  ? "bg-sky-500 border-sky-500"
                                  : "border-slate-200"
                              }`}
                            >
                              {votes[currentUser]?.drinks?.includes(d) && (
                                <Check
                                  className="w-3 h-3 text-white"
                                  strokeWidth={5}
                                />
                              )}
                            </div>
                            <span className="break-words line-clamp-2">
                              {d}
                            </span>
                          </div>
                          {/* hover 時顯示的編輯與刪除按鈕 */}
                          <div className="absolute top-1.5 right-1.5 hidden group-hover:flex items-center gap-1 bg-white/90 p-1 rounded-lg shadow-sm">
                            {optionUrls[d] && (
                              <a
                                href={optionUrls[d]}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 hover:bg-sky-100 text-sky-500 rounded"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingOption({
                                  type: "drinks",
                                  oldName: d,
                                  name: d,
                                  url: optionUrls[d] || "",
                                });
                              }}
                              className="p-1 hover:bg-emerald-100 text-emerald-600 rounded"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteOption("drinks", d);
                              }}
                              className="p-1 hover:bg-rose-100 text-rose-500 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {optionUrls[d] && (
                            <div className="absolute top-2 right-2 group-hover:hidden text-sky-300">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <form
                    onSubmit={(e) => handleOptionSubmit(e, "drinks")}
                    className="p-5 bg-slate-50 border-t flex flex-col gap-2"
                  >
                    <input
                      className="p-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                      placeholder="新增店家名稱..."
                      value={newDrinkName}
                      onChange={(e) => setNewDrinkName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input
                        className="flex-1 p-2.5 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                        placeholder="菜單網址 (選填)"
                        value={newDrinkUrl}
                        onChange={(e) => setNewDrinkUrl(e.target.value)}
                      />
                      <button className="px-5 bg-sky-600 text-white rounded-xl shadow-sm">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </form>
                </div>

                {/* 餐點區 */}
                <div className="bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-orange-50 p-5 border-b font-black text-orange-800 flex items-center gap-2">
                    <Pizza /> 餐點選單
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-3 flex-1 content-start">
                    {foodOptions.map((f) => {
                      if (
                        editingOption.type === "foods" &&
                        editingOption.oldName === f
                      ) {
                        return (
                          <div
                            key={f}
                            className="p-3 border-2 border-emerald-400 bg-emerald-50 rounded-xl col-span-2 sm:col-span-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              className="w-full text-sm font-bold p-1.5 border rounded mb-2 outline-none"
                              value={editingOption.name}
                              onChange={(e) =>
                                setEditingOption({
                                  ...editingOption,
                                  name: e.target.value,
                                })
                              }
                              placeholder="餐點名稱"
                            />
                            <input
                              className="w-full text-xs p-1.5 border rounded mb-2 outline-none"
                              value={editingOption.url}
                              onChange={(e) =>
                                setEditingOption({
                                  ...editingOption,
                                  url: e.target.value,
                                })
                              }
                              placeholder="菜單網址(選填)"
                            />
                            <div className="flex gap-2">
                              <button
                                className="flex-1 bg-emerald-600 text-white text-xs py-2 rounded-lg font-bold shadow-sm"
                                onClick={saveEditOption}
                              >
                                儲存
                              </button>
                              <button
                                className="flex-1 bg-slate-300 text-slate-700 text-xs py-2 rounded-lg font-bold"
                                onClick={() => setEditingOption({ type: null })}
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={f}
                          onClick={() => toggleVote("foods", f)}
                          className={`group relative p-3.5 rounded-xl border-2 font-bold text-sm cursor-pointer transition-all ${
                            votes[currentUser]?.foods?.includes(f)
                              ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                              : "border-slate-100 hover:border-orange-200 text-slate-500"
                          }`}
                        >
                          <div className="flex items-center gap-2 pr-4">
                            <div
                              className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                votes[currentUser]?.foods?.includes(f)
                                  ? "bg-orange-500 border-orange-500"
                                  : "border-slate-200"
                              }`}
                            >
                              {votes[currentUser]?.foods?.includes(f) && (
                                <Check
                                  className="w-3 h-3 text-white"
                                  strokeWidth={5}
                                />
                              )}
                            </div>
                            <span className="break-words line-clamp-2">
                              {f}
                            </span>
                          </div>
                          {/* hover 時顯示的編輯與刪除按鈕 */}
                          <div className="absolute top-1.5 right-1.5 hidden group-hover:flex items-center gap-1 bg-white/90 p-1 rounded-lg shadow-sm">
                            {optionUrls[f] && (
                              <a
                                href={optionUrls[f]}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 hover:bg-orange-100 text-orange-500 rounded"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingOption({
                                  type: "foods",
                                  oldName: f,
                                  name: f,
                                  url: optionUrls[f] || "",
                                });
                              }}
                              className="p-1 hover:bg-emerald-100 text-emerald-600 rounded"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteOption("foods", f);
                              }}
                              className="p-1 hover:bg-rose-100 text-rose-500 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {optionUrls[f] && (
                            <div className="absolute top-2 right-2 group-hover:hidden text-orange-300">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <form
                    onSubmit={(e) => handleOptionSubmit(e, "foods")}
                    className="p-5 bg-slate-50 border-t flex flex-col gap-2"
                  >
                    <input
                      className="p-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                      placeholder="新增餐點名稱..."
                      value={newFoodName}
                      onChange={(e) => setNewFoodName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input
                        className="flex-1 p-2.5 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        placeholder="菜單網址 (選填)"
                        value={newFoodUrl}
                        onChange={(e) => setNewFoodUrl(e.target.value)}
                      />
                      <button className="px-5 bg-orange-600 text-white rounded-xl shadow-sm">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-3xl border shadow-lg overflow-hidden">
              <div className="bg-slate-800 p-4 text-white font-black text-sm flex gap-2 items-center">
                <Table className="w-5 h-5 text-sky-400" /> 飲料總表
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="p-4 text-left font-bold text-slate-600 sticky left-0 bg-slate-50 border-r w-32">
                        姓名
                      </th>
                      {drinkOptions.map((o) => (
                        <th
                          key={o}
                          className="p-4 text-center font-bold text-slate-500 border-r last:border-none"
                        >
                          {o}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u} className="border-b hover:bg-sky-50/50">
                        <td className="p-4 font-black sticky left-0 bg-white border-r shadow-[1px_0_0_#f1f5f9]">
                          {u}
                        </td>
                        {drinkOptions.map((o) => (
                          <td
                            key={o}
                            className="p-4 text-center border-r last:border-none"
                          >
                            {votes[u]?.drinks?.includes(o) ? (
                              <Check
                                className="mx-auto text-emerald-500 w-5 h-5"
                                strokeWidth={4}
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
                    <tr className="bg-sky-50 font-black border-t-2 border-sky-100">
                      <td className="p-4 text-sky-900 sticky left-0 bg-sky-50 border-r">
                        總計數量
                      </td>
                      {drinkOptions.map((o) => (
                        <td
                          key={o}
                          className="p-4 text-center text-sky-700 text-lg"
                        >
                          {drinkTotals[o] || 0}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-3xl border shadow-lg overflow-hidden">
              <div className="bg-slate-800 p-4 text-white font-black text-sm flex gap-2 items-center">
                <Table className="w-5 h-5 text-orange-400" /> 餐點總表
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="p-4 text-left font-bold text-slate-600 sticky left-0 bg-slate-50 border-r w-32">
                        姓名
                      </th>
                      {foodOptions.map((o) => (
                        <th
                          key={o}
                          className="p-4 text-center font-bold text-slate-500 border-r last:border-none"
                        >
                          {o}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u} className="border-b hover:bg-orange-50/50">
                        <td className="p-4 font-black sticky left-0 bg-white border-r shadow-[1px_0_0_#f1f5f9]">
                          {u}
                        </td>
                        {foodOptions.map((o) => (
                          <td
                            key={o}
                            className="p-4 text-center border-r last:border-none"
                          >
                            {votes[u]?.foods?.includes(o) ? (
                              <Check
                                className="mx-auto text-emerald-500 w-5 h-5"
                                strokeWidth={4}
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
                    <tr className="bg-orange-50 font-black border-t-2 border-orange-100">
                      <td className="p-4 text-orange-900 sticky left-0 bg-orange-50 border-r">
                        總計數量
                      </td>
                      {foodOptions.map((o) => (
                        <td
                          key={o}
                          className="p-4 text-center text-orange-700 text-lg"
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
