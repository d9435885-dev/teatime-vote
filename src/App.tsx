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
  RefreshCcw,
} from "lucide-react";

// --- Firebase 配置 ---
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

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
  const [errorLog, setErrorLog] = useState<string>(""); // 錯誤日誌
  const [activeTab, setActiveTab] = useState<string>("vote");
  const [currentUser, setCurrentUser] = useState<string>("");

  // 核心資料狀態
  const [votes, setVotes] = useState<any>({});
  const [headerConfig, setHeaderConfig] = useState<any>({});
  const [drinkOptions, setDrinkOptions] = useState<any[]>([]);
  const [foodOptions, setFoodOptions] = useState<any[]>([]);
  const [optionUrls, setOptionUrls] = useState<any>({});

  // UI 狀態
  const [isEditingHeader, setIsEditingHeader] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>("");
  const [newOption, setNewOption] = useState({ name: "", url: "" });

  const users = Object.keys(votes).filter((k) => !k.includes("."));

  // 1. 權限初始化
  useEffect(() => {
    signInAnonymously(auth).catch((err) =>
      setErrorLog("登入失敗: " + err.message)
    );
    const unsub = onAuthStateChanged(auth, (user) => setFbUser(user));
    return () => unsub();
  }, []);

  // 2. 監聽雲端資料
  useEffect(() => {
    if (!fbUser) return;
    const docRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "votingState",
      "currentState"
    );
    const unsubData = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setVotes(d.votes || {});
          setHeaderConfig(d.headerConfig || {});
          setDrinkOptions(d.drinkOptions || []);
          setFoodOptions(d.foodOptions || []);
          setOptionUrls(d.optionUrls || {});
          setIsDbReady(true);
        } else {
          // 初始化空資料庫
          resetDatabase();
        }
      },
      (err) => setErrorLog("監聽失敗: " + err.message)
    );
    return () => unsubData();
  }, [fbUser]);

  // ⭐️ 核心：全量寫入函數 (避開所有格式衝突)
  const syncToCloud = async (newData: any) => {
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
      // 構建完整物件，直接覆蓋 currentState
      const payload = {
        votes: newData.votes || votes,
        headerConfig: newData.headerConfig || headerConfig,
        drinkOptions: newData.drinkOptions || drinkOptions,
        foodOptions: newData.foodOptions || foodOptions,
        optionUrls: newData.optionUrls || optionUrls,
      };
      await setDoc(docRef, payload);
      setErrorLog(""); // 成功就清空錯誤
    } catch (err: any) {
      setErrorLog("儲存失敗: " + err.message);
    }
  };

  // ⭐️ 重置資料庫 (遇到點不動時的最後大招)
  const resetDatabase = async () => {
    if (!window.confirm("確定要重置所有資料嗎？這會清除目前的投票與設定。"))
      return;
    const initialData = {
      votes: { 翁瑞壕: { drinks: [], foods: [] } },
      headerConfig: {
        department: "2D一部",
        eventName: "第一次下午茶",
        eventDate: "2026-03-18",
        deadlineDate: "2026-03-16",
        notes: "",
      },
      drinkOptions: ["烏弄", "八曜", "Mates", "大茗"],
      foodOptions: ["天使雞排", "自煮火鍋", "甜甜圈"],
      optionUrls: {},
    };
    await syncToCloud(initialData);
    setIsDbReady(true);
  };

  const toggleVote = async (category: "drinks" | "foods", option: string) => {
    if (!currentUser) return;
    const newVotes = JSON.parse(JSON.stringify(votes)); // 深拷貝
    if (!newVotes[currentUser])
      newVotes[currentUser] = { drinks: [], foods: [] };

    const currentList = newVotes[currentUser][category] || [];
    newVotes[currentUser][category] = currentList.includes(option)
      ? currentList.filter((i: string) => i !== option)
      : [...currentList, option];

    await syncToCloud({ votes: newVotes });
  };

  const handleAddUser = async (e: any) => {
    e.preventDefault();
    const name = newUserName.trim();
    if (name && !votes[name]) {
      const newVotes = { ...votes, [name]: { drinks: [], foods: [] } };
      await syncToCloud({ votes: newVotes });
      setCurrentUser(name);
      setNewUserName("");
    }
  };

  const saveHeader = async () => {
    await syncToCloud({ headerConfig });
    setIsEditingHeader(false);
  };

  const handleAddOption = async (type: "drinks" | "foods") => {
    const name = newOption.name.trim();
    if (!name) return;
    const newOptions =
      type === "drinks" ? [...drinkOptions, name] : [...foodOptions, name];
    const newUrls = { ...optionUrls };
    if (newOption.url) newUrls[name] = newOption.url;

    await syncToCloud({
      [type === "drinks" ? "drinkOptions" : "foodOptions"]: newOptions,
      optionUrls: newUrls,
    });
    setNewOption({ name: "", url: "" });
  };

  // 統計邏輯
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

  const unvotedUsers = users.filter(
    (u) => !votes[u]?.drinks?.length && !votes[u]?.foods?.length
  );

  if (!isDbReady)
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-emerald-500 w-12 h-12" />
        <p className="font-bold text-slate-400">正在同步資料...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-800">
      {/* 標題區 */}
      <div className="bg-white border-b shadow-sm p-6 mb-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              🎨 {headerConfig.department}{" "}
              <button
                onClick={() => setIsEditingHeader(!isEditingHeader)}
                className="p-1 hover:bg-slate-100 rounded text-slate-300"
              >
                <Settings className="w-5 h-5" />
              </button>
            </h1>
            <p className="font-bold text-slate-500 text-lg mt-1">
              🍰 {headerConfig.eventName}
            </p>
            <div className="flex gap-2 mt-3">
              <span className="px-2 py-1 bg-sky-50 text-sky-600 text-[11px] font-bold rounded border border-sky-100">
                活動日：{headerConfig.eventDate}
              </span>
              <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[11px] font-bold rounded border border-rose-100">
                截單日：{headerConfig.deadlineDate}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-white p-3 rounded-xl border text-center shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                🥤 飲料領先
              </p>
              <p className="font-black text-sky-600">
                {Object.keys(drinkTotals).reduce(
                  (a, b) => (drinkTotals[a] > drinkTotals[b] ? a : b),
                  "尚未投票"
                )}
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border text-center shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                👥 未投人數
              </p>
              <p className="font-black text-slate-800">
                {unvotedUsers.length} 人
              </p>
            </div>
          </div>
        </div>

        {isEditingHeader && (
          <div className="max-w-5xl mx-auto mt-4 p-5 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-xs font-bold text-slate-400">部門</label>
                <input
                  className="w-full p-2 border rounded mt-1"
                  value={headerConfig.department}
                  onChange={(e) =>
                    setHeaderConfig({
                      ...headerConfig,
                      department: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400">活動</label>
                <input
                  className="w-full p-2 border rounded mt-1"
                  value={headerConfig.eventName}
                  onChange={(e) =>
                    setHeaderConfig({
                      ...headerConfig,
                      eventName: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400">
                  活動日
                </label>
                <input
                  type="date"
                  className="w-full p-2 border rounded mt-1"
                  value={headerConfig.eventDate}
                  onChange={(e) =>
                    setHeaderConfig({
                      ...headerConfig,
                      eventDate: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400">
                  截單日
                </label>
                <input
                  type="date"
                  className="w-full p-2 border rounded mt-1"
                  value={headerConfig.deadlineDate}
                  onChange={(e) =>
                    setHeaderConfig({
                      ...headerConfig,
                      deadlineDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveHeader}
                className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg shadow-lg"
              >
                儲存標題
              </button>
              <button
                onClick={resetDatabase}
                className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" /> 徹底重置資料庫
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4">
        <div className="flex bg-slate-200/50 p-1 rounded-xl mb-6 w-fit shadow-inner">
          <button
            onClick={() => setActiveTab("vote")}
            className={`px-8 py-2.5 rounded-lg text-sm font-black transition-all ${
              activeTab === "vote"
                ? "bg-white text-emerald-600 shadow-md"
                : "text-slate-500"
            }`}
          >
            投票區
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-8 py-2.5 rounded-lg text-sm font-black transition-all ${
              activeTab === "summary"
                ? "bg-white text-emerald-600 shadow-md"
                : "text-slate-500"
            }`}
          >
            統計表
          </button>
        </div>

        {activeTab === "vote" ? (
          <div className="space-y-6">
            {/* 姓名選擇 */}
            <div className="bg-white p-5 rounded-3xl border shadow-sm flex flex-col md:flex-row gap-4">
              <select
                value={currentUser}
                onChange={(e) => setCurrentUser(e.target.value)}
                className="flex-1 p-3 bg-slate-50 border-none rounded-2xl font-black text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/20"
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
                  className="p-3 border rounded-2xl text-sm w-32"
                  placeholder="新增姓名"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                />
                <button
                  type="submit"
                  className="p-3 bg-slate-800 text-white rounded-2xl hover:bg-black transition-all shadow-md"
                >
                  <Plus />
                </button>
              </form>
            </div>

            {currentUser && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 飲料區 */}
                <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-sky-50 px-8 py-6 border-b font-black text-sky-900 text-xl flex items-center gap-3">
                    <Coffee className="w-7 h-7" /> 飲料選單
                  </div>
                  <div className="p-6 grid grid-cols-2 gap-4">
                    {drinkOptions.map((d) => (
                      <div
                        key={d}
                        onClick={() => toggleVote("drinks", d)}
                        className={`relative p-4 rounded-2xl border-2 font-black text-sm cursor-pointer transition-all ${
                          votes[currentUser]?.drinks?.includes(d)
                            ? "border-sky-500 bg-sky-50 text-sky-700 shadow-md scale-[0.98]"
                            : "border-slate-50 text-slate-400 hover:border-sky-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              votes[currentUser]?.drinks?.includes(d)
                                ? "bg-sky-500 border-sky-500"
                                : "border-slate-200"
                            }`}
                          >
                            {votes[currentUser]?.drinks?.includes(d) && (
                              <Check
                                className="w-4 h-4 text-white"
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
                            className="absolute top-2 right-2 text-sky-300"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="p-6 bg-slate-50 border-t flex flex-col gap-2">
                    <input
                      className="p-3 border rounded-xl text-sm bg-white"
                      placeholder="新增店家名稱"
                      value={newOption.name}
                      onChange={(e) =>
                        setNewOption({ ...newOption, name: e.target.value })
                      }
                    />
                    <div className="flex gap-2">
                      <input
                        className="flex-1 p-3 border rounded-xl text-xs bg-white"
                        placeholder="菜單連結 (選填)"
                        value={newOption.url}
                        onChange={(e) =>
                          setNewOption({ ...newOption, url: e.target.value })
                        }
                      />
                      <button
                        onClick={() => handleAddOption("drinks")}
                        className="px-6 bg-sky-600 text-white rounded-xl shadow-lg"
                      >
                        <Plus />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 餐點區 */}
                <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-orange-50 px-8 py-6 border-b font-black text-orange-900 text-xl flex items-center gap-3">
                    <Pizza className="w-7 h-7" /> 餐點選單
                  </div>
                  <div className="p-6 grid grid-cols-2 gap-4">
                    {foodOptions.map((f) => (
                      <div
                        key={f}
                        onClick={() => toggleVote("foods", f)}
                        className={`relative p-4 rounded-2xl border-2 font-black text-sm cursor-pointer transition-all ${
                          votes[currentUser]?.foods?.includes(f)
                            ? "border-orange-500 bg-orange-50 text-orange-700 shadow-md scale-[0.98]"
                            : "border-slate-50 text-slate-400 hover:border-orange-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              votes[currentUser]?.foods?.includes(f)
                                ? "bg-orange-500 border-orange-500"
                                : "border-slate-200"
                            }`}
                          >
                            {votes[currentUser]?.foods?.includes(f) && (
                              <Check
                                className="w-4 h-4 text-white"
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
                            className="absolute top-2 right-2 text-orange-300"
                          >
                            <ExternalLink className="w-4 h-4" />
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
          <div className="bg-white rounded-[2rem] border shadow-lg overflow-hidden">
            <div className="bg-slate-800 p-6 text-white font-black text-lg flex items-center gap-2">
              <Table /> 投票結果總表
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tr className="bg-slate-100 border-b">
                  <th className="p-4 text-left font-black text-slate-700 sticky left-0 bg-slate-100 z-10 border-r">
                    姓名
                  </th>
                  {drinkOptions.map((o) => (
                    <th
                      key={o}
                      className="p-4 text-center font-bold text-slate-500 border-r"
                    >
                      {o}
                    </th>
                  ))}
                </tr>
                {users.map((u) => (
                  <tr
                    key={u}
                    className="border-b hover:bg-sky-50/30 transition-colors"
                  >
                    <td className="p-4 font-black sticky left-0 bg-white border-r shadow-sm z-10">
                      {u}
                    </td>
                    {drinkOptions.map((o) => (
                      <td key={o} className="p-4 text-center border-r">
                        {votes[u]?.drinks?.includes(o) ? (
                          <Check
                            className="mx-auto text-emerald-500 w-6 h-6"
                            strokeWidth={5}
                          />
                        ) : (
                          <span className="opacity-10">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-emerald-50 font-black">
                  <td className="p-4 border-r sticky left-0 bg-emerald-50">
                    合計
                  </td>
                  {drinkOptions.map((o) => (
                    <td
                      key={o}
                      className="p-4 text-center text-emerald-700 text-xl"
                    >
                      {drinkTotals[o]}
                    </td>
                  ))}
                </tr>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ⭐️ 底部的除錯日誌 (正式上線可移除) */}
      {errorLog && (
        <div className="fixed bottom-4 left-4 right-4 bg-rose-600 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-bounce">
          <AlertCircle className="shrink-0" />
          <div>
            <p className="font-bold">系統連線異常：</p>
            <p className="text-xs opacity-90">{errorLog}</p>
            <p className="text-[10px] mt-2 underline">
              請確認 Firebase Rules 規則代碼中 read 與 write 後方皆為 if true;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
