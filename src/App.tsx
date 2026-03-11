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
  updateDoc,
  arrayUnion,
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
  const [newDrinkName, setNewDrinkName] = useState<string>("");
  const [newDrinkUrl, setNewDrinkUrl] = useState<string>("");
  const [newFoodName, setNewFoodName] = useState<string>("");
  const [newFoodUrl, setNewFoodUrl] = useState<string>("");

  const users = Object.keys(votes);

  // 初始化權限與監聽
  useEffect(() => {
    const loginAndListen = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    loginAndListen();
    const unsubAuth = onAuthStateChanged(auth, (user) => setFbUser(user));
    return () => unsubAuth();
  }, []);

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
          setDoc(docRef, {
            votes: { 翁瑞壕: { drinks: [], foods: [] } },
            headerConfig: { department: "2D一部", eventName: "第一次下午茶" },
            drinkOptions: ["烏弄", "八曜"],
            foodOptions: ["天使雞排"],
            optionUrls: {},
          }).then(() => setIsDbReady(true));
        }
      },
      (err) => console.error("Snapshot Error:", err)
    );
    return () => unsubData();
  }, [fbUser]);

  // 修改後的強效更新函數
  const updateRemote = async (data: any) => {
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
      await setDoc(docRef, data, { merge: true });
    } catch (err) {
      alert("儲存失敗，請確認 Firebase 規則已設為 allow read, write: if true;");
    }
  };

  const handleAddUser = async (e: any) => {
    e.preventDefault();
    const name = newUserName.trim();
    if (name && !votes[name]) {
      const newVotes = { ...votes, [name]: { drinks: [], foods: [] } };
      await updateRemote({ votes: newVotes });
      setCurrentUser(name);
      setNewUserName("");
    }
  };

  const toggleVote = async (category: any, option: any) => {
    if (!currentUser) return;
    const currentList = votes[currentUser]?.[category] || [];
    const updatedList = currentList.includes(option)
      ? currentList.filter((i: any) => i !== option)
      : [...currentList, option];

    const newVotes = { ...votes };
    newVotes[currentUser] = {
      ...newVotes[currentUser],
      [category]: updatedList,
    };
    await updateRemote({ votes: newVotes });
  };

  const handleOptionSubmit = async (e: any, type: "drinks" | "foods") => {
    e.preventDefault();
    const name = type === "drinks" ? newDrinkName.trim() : newFoodName.trim();
    const url = type === "drinks" ? newDrinkUrl.trim() : newFoodUrl.trim();
    if (!name) return;

    const newOptions =
      type === "drinks" ? [...drinkOptions, name] : [...foodOptions, name];
    const newUrls = { ...optionUrls };
    if (url) newUrls[name] = url;

    await updateRemote({
      [type === "drinks" ? "drinkOptions" : "foodOptions"]: Array.from(
        new Set(newOptions)
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
    (u) => !votes[u].drinks?.length && !votes[u].foods?.length
  );

  if (!isDbReady)
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 bg-slate-50">
        <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
        <p className="font-bold text-slate-400">連線中...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans">
      {/* 標題與看板區 */}
      <div className="bg-white border-b shadow-sm p-4 md:p-6 mb-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 justify-center md:justify-start">
              🎨 {headerConfig.department}{" "}
              <button onClick={() => setIsEditingHeader(!isEditingHeader)}>
                <Settings className="w-4 h-4 text-slate-300" />
              </button>
            </h1>
            <p className="font-bold text-slate-500">
              🍰 {headerConfig.eventName}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="bg-sky-50 p-2 px-4 rounded-xl border border-sky-100 text-center">
              <p className="text-[10px] font-bold text-sky-600">🥤 飲料領先</p>
              <p className="text-xs font-black truncate max-w-[100px]">
                {topDrinks.items[0] || "-"}
              </p>
            </div>
            <div className="bg-orange-50 p-2 px-4 rounded-xl border border-orange-100 text-center">
              <p className="text-[10px] font-bold text-orange-600">
                🍗 餐點領先
              </p>
              <p className="text-xs font-black truncate max-w-[100px]">
                {topFoods.items[0] || "-"}
              </p>
            </div>
            <div className="bg-slate-100 p-2 px-4 rounded-xl border border-slate-200 text-center group relative cursor-help">
              <p className="text-[10px] font-bold text-slate-500">👥 未投</p>
              <p className="text-xs font-black">{unvotedUsers.length}人</p>
            </div>
          </div>
        </div>
        {isEditingHeader && (
          <div className="max-w-5xl mx-auto mt-4 p-4 bg-slate-50 rounded-xl border-2 border-dashed">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="p-2 text-sm border rounded"
                placeholder="部門"
                value={headerConfig.department}
                onChange={(e) =>
                  updateRemote({ "headerConfig.department": e.target.value })
                }
              />
              <input
                className="p-2 text-sm border rounded"
                placeholder="活動"
                value={headerConfig.eventName}
                onChange={(e) =>
                  updateRemote({ "headerConfig.eventName": e.target.value })
                }
              />
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
                ? "bg-white text-emerald-600 shadow-md"
                : "text-slate-500"
            }`}
          >
            投票區
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-6 py-2 rounded-lg text-sm font-black ${
              activeTab === "summary"
                ? "bg-white text-emerald-600 shadow-md"
                : "text-slate-500"
            }`}
          >
            總表
          </button>
        </div>

        {activeTab === "vote" ? (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row gap-2">
              <select
                value={currentUser}
                onChange={(e) => setCurrentUser(e.target.value)}
                className="flex-1 p-3 bg-slate-50 rounded-xl font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="p-3 border rounded-xl text-sm w-32"
                  placeholder="新名字"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                />
                <button
                  type="submit"
                  className="p-3 bg-slate-800 text-white rounded-xl"
                >
                  <Plus />
                </button>
              </form>
            </div>

            {currentUser && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="bg-sky-50 p-4 border-b font-black text-sky-800 flex items-center gap-2">
                    <Coffee className="w-5 h-5" /> 飲料
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2">
                    {drinkOptions.map((d) => (
                      <div
                        key={d}
                        onClick={() => toggleVote("drinks", d)}
                        className={`relative p-3 rounded-xl border-2 font-bold text-sm cursor-pointer transition-all ${
                          votes[currentUser]?.drinks?.includes(d)
                            ? "border-sky-500 bg-sky-50 text-sky-700 shadow-inner"
                            : "border-slate-50 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
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
                          </div>{" "}
                          {d}
                        </div>
                        {optionUrls[d] && (
                          <a
                            href={optionUrls[d]}
                            target="_blank"
                            className="absolute top-2 right-2 text-sky-300"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  <form
                    onSubmit={(e) => handleOptionSubmit(e, "drinks")}
                    className="p-4 bg-slate-50 border-t flex flex-col gap-2"
                  >
                    <input
                      className="p-2 text-xs border rounded-lg"
                      placeholder="新增店家"
                      value={newDrinkName}
                      onChange={(e) => setNewDrinkName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input
                        className="flex-1 p-2 text-[10px] border rounded-lg"
                        placeholder="菜單網址"
                        value={newDrinkUrl}
                        onChange={(e) => setNewDrinkUrl(e.target.value)}
                      />
                      <button className="px-4 bg-sky-600 text-white rounded-lg">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </div>

                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="bg-orange-50 p-4 border-b font-black text-orange-800 flex items-center gap-2">
                    <Pizza className="w-5 h-5" /> 餐點
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2">
                    {foodOptions.map((f) => (
                      <div
                        key={f}
                        onClick={() => toggleVote("foods", f)}
                        className={`relative p-3 rounded-xl border-2 font-bold text-sm cursor-pointer transition-all ${
                          votes[currentUser]?.foods?.includes(f)
                            ? "border-orange-500 bg-orange-50 text-orange-700 shadow-inner"
                            : "border-slate-50 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
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
                          </div>{" "}
                          {f}
                        </div>
                        {optionUrls[f] && (
                          <a
                            href={optionUrls[f]}
                            target="_blank"
                            className="absolute top-2 right-2 text-orange-300"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  <form
                    onSubmit={(e) => handleOptionSubmit(e, "foods")}
                    className="p-4 bg-slate-50 border-t flex flex-col gap-2"
                  >
                    <input
                      className="p-2 text-xs border rounded-lg"
                      placeholder="新增餐點"
                      value={newFoodName}
                      onChange={(e) => setNewFoodName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input
                        className="flex-1 p-2 text-[10px] border rounded-lg"
                        placeholder="菜單網址"
                        value={newFoodUrl}
                        onChange={(e) => setNewFoodUrl(e.target.value)}
                      />
                      <button className="px-4 bg-orange-600 text-white rounded-lg">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="bg-slate-800 p-4 text-white font-black text-sm">
              統計總表 (打勾代表已選)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <tr className="bg-slate-100 border-b">
                  <th className="p-3 text-left sticky left-0 bg-slate-100 border-r">
                    姓名
                  </th>
                  {drinkOptions.map((o) => (
                    <th
                      key={o}
                      className="p-3 text-center border-r last:border-none"
                    >
                      {o}
                    </th>
                  ))}
                </tr>
                {users.map((u) => (
                  <tr key={u} className="border-b">
                    <td className="p-3 font-bold sticky left-0 bg-white border-r">
                      {u}
                    </td>
                    {drinkOptions.map((o) => (
                      <td
                        key={o}
                        className="p-3 text-center border-r last:border-none"
                      >
                        {votes[u]?.drinks?.includes(o) ? (
                          <Check
                            className="mx-auto text-emerald-500 w-5 h-5"
                            strokeWidth={4}
                          />
                        ) : (
                          "-"
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-emerald-50 font-black">
                  <td className="p-3 border-r sticky left-0 bg-emerald-50">
                    總計
                  </td>
                  {drinkOptions.map((o) => (
                    <td
                      key={o}
                      className="p-3 text-center text-emerald-700 text-base"
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
    </div>
  );
}
